import { REBUILDABLE_CACHE_KEYS } from '../../constants';
import type { ImportRecoveryJournal, PortableFinancialData } from './model';
import { recoveryJournal, type RecoveryJournalAdapter } from './recoveryJournal';
import { sha256Snapshot } from './stableDigest';
import { readPortableSnapshot, writePortableSnapshot } from './snapshot';

export type ReplaceResult =
  | { ok: true }
  | { ok: false; code: 'recovery_unavailable' }
  | { ok: false; code: 'replacement_failed'; rolledBack: true }
  | { ok: false; code: 'rollback_failed'; rolledBack: false };

export type RestoreResult =
  | { ok: true }
  | { ok: false; code: 'rollback_failed' };

export interface ReplaceDependencies {
  storage?: Storage;
  journal?: RecoveryJournalAdapter;
  now?: () => string;
  createId?: () => string;
}

function resolveDependencies(deps: ReplaceDependencies) {
  return {
    storage: deps.storage ?? globalThis.localStorage,
    journal: deps.journal ?? recoveryJournal,
    now: deps.now ?? (() => new Date().toISOString()),
    createId: deps.createId ?? (() => globalThis.crypto.randomUUID()),
  };
}

export async function restorePreviousSnapshot(
  journal: ImportRecoveryJournal,
  deps: ReplaceDependencies = {},
): Promise<RestoreResult> {
  const { storage, journal: journalAdapter } = resolveDependencies(deps);

  try {
    const expectedDigest = await sha256Snapshot(journal.previousSnapshot);
    writePortableSnapshot(storage, journal.previousSnapshot);
    const restoredDigest = await sha256Snapshot(readPortableSnapshot(storage));

    if (restoredDigest !== expectedDigest) return { ok: false, code: 'rollback_failed' };

    await journalAdapter.remove();
    return { ok: true };
  } catch {
    return { ok: false, code: 'rollback_failed' };
  }
}

export async function replacePortableData(
  target: PortableFinancialData,
  deps: ReplaceDependencies = {},
): Promise<ReplaceResult> {
  const resolved = resolveDependencies(deps);
  const previousSnapshot = readPortableSnapshot(resolved.storage);
  const targetDigest = await sha256Snapshot(target);
  const journal: ImportRecoveryJournal = {
    id: resolved.createId(),
    startedAt: resolved.now(),
    schemaVersion: 1,
    status: 'prepared',
    previousSnapshot,
    targetDigest,
  };

  try {
    await resolved.journal.create(journal);
    await resolved.journal.setStatus('writing');
    journal.status = 'writing';
  } catch {
    return { ok: false, code: 'recovery_unavailable' };
  }

  try {
    writePortableSnapshot(resolved.storage, target);
    for (const cacheKey of REBUILDABLE_CACHE_KEYS) resolved.storage.removeItem(cacheKey);

    const writtenDigest = await sha256Snapshot(readPortableSnapshot(resolved.storage));
    if (writtenDigest !== targetDigest) throw new Error('Replacement digest mismatch');

    await resolved.journal.setStatus('verified');
    journal.status = 'verified';
    await resolved.journal.remove();
    return { ok: true };
  } catch {
    try {
      await resolved.journal.setStatus('writing');
      journal.status = 'writing';
    } catch {
      // Rollback is still attempted; the existing journal is never removed on rollback failure.
    }

    const rollback = await restorePreviousSnapshot(journal, resolved);
    if (rollback.ok) return { ok: false, code: 'replacement_failed', rolledBack: true };
    return { ok: false, code: 'rollback_failed', rolledBack: false };
  }
}
