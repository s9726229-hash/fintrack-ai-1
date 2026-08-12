import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEVICE_STORAGE_KEYS,
  PORTABLE_STORAGE_KEYS,
  REBUILDABLE_CACHE_KEYS,
  SECRET_STORAGE_KEYS,
} from '../../constants';
import { AssetType, Currency } from '../../types';
import type { ImportRecoveryJournal, PortableFinancialData } from './model';
import { recoveryJournal, type RecoveryJournalAdapter } from './recoveryJournal';
import { replacePortableData } from './replace';
import { sha256Snapshot } from './stableDigest';
import { createEmptyPortableData, readPortableSnapshot, writePortableSnapshot } from './snapshot';

const RECOVERY_DATABASE = 'fintrack-ai-recovery';

function deleteRecoveryDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(RECOVERY_DATABASE);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Recovery database deletion was blocked'));
  });
}

function makeSnapshot(feeDiscount: number, marker: string): PortableFinancialData {
  const snapshot = createEmptyPortableData();
  const markerNumber = marker === 'previous' ? 1 : marker === 'target' ? 2 : 3;
  return {
    ...snapshot,
    assets: [{
      id: `asset-${marker}`,
      name: marker,
      type: AssetType.CASH,
      amount: markerNumber,
      currency: Currency.TWD,
      exchangeRate: 1,
      lastUpdated: markerNumber,
    }],
    transactions: [{ id: `transaction-${marker}`, date: '2026-08-13', amount: markerNumber, category: marker, item: marker, type: 'EXPENSE' }],
    recurring: [{ id: `recurring-${marker}`, name: marker, amount: markerNumber, category: marker, type: 'EXPENSE', frequency: 'MONTHLY', dayOfMonth: markerNumber }],
    feeDiscount,
    recurringExecuted: { [marker]: ['2026-08'] },
    portfolioHistory: [{
      date: '2026-08-13',
      totalAssets: markerNumber,
      totalLiabilities: markerNumber,
      netWorth: markerNumber,
      assetDistribution: {
        [AssetType.CASH]: markerNumber,
        [AssetType.STOCK]: 0,
        [AssetType.FUND]: 0,
        [AssetType.REAL_ESTATE]: 0,
        [AssetType.CRYPTO]: 0,
        [AssetType.DEBT]: 0,
        [AssetType.OTHER]: 0,
      },
    }],
    budgets: [{ category: marker, limit: markerNumber }],
    stockHistory: [{ date: '2026-08-13', totalMarketValue: markerNumber, totalUnrealizedPL: markerNumber, positions: [{ symbol: marker, marketValue: markerNumber }] }],
    stockTransactions: [{ id: `stock-${marker}`, date: '2026-08-13', symbol: marker, side: 'BUY', tradeType: '普通', shares: markerNumber, price: markerNumber, fees: 0, amount: markerNumber }],
    dividendEvents: { [marker]: [{ exDate: '2026-08-13', dividendPerShare: markerNumber }] },
    dividendScannedAt: { [marker]: 1_765_497_600_000 },
    techParameters: { ...snapshot.techParameters, etfBuyBias: markerNumber },
  };
}

class FaultInjectingStorage implements Storage {
  private readonly values = new Map<string, string>();
  private setCalls = 0;
  private faultInjectionEnabled = false;

  constructor(private readonly shouldThrow: (setCall: number) => boolean = () => false) {}

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.faultInjectionEnabled && this.shouldThrow(this.setCalls)) {
      throw new Error(`setItem failed at call ${this.setCalls}`);
    }
    this.values.set(key, String(value));
  }

  resetSetCalls(): void {
    this.setCalls = 0;
    this.faultInjectionEnabled = true;
  }
}

beforeEach(async () => {
  await deleteRecoveryDatabase();
});

describe('sha256Snapshot', () => {
  it('returns the same digest when object keys have different insertion order', async () => {
    const first = makeSnapshot(0.28, '2330');
    const second: PortableFinancialData = {
      dividendScannedAt: { '2330': 1_765_497_600_000 },
      dividendEvents: first.dividendEvents,
      techParameters: Object.fromEntries(Object.entries(first.techParameters).reverse()) as PortableFinancialData['techParameters'],
      feeDiscount: first.feeDiscount,
      stockTransactions: first.stockTransactions,
      stockHistory: first.stockHistory,
      budgets: first.budgets,
      portfolioHistory: first.portfolioHistory,
      recurringExecuted: { '2330': ['2026-08'] },
      recurring: first.recurring,
      transactions: first.transactions,
      assets: first.assets,
    };

    await expect(sha256Snapshot(first)).resolves.toBe(await sha256Snapshot(second));
  });
});

describe('replacePortableData', () => {
  it('writes every portable key, verifies it, removes the journal and only registered caches', async () => {
    const storage = new FaultInjectingStorage();
    const target = makeSnapshot(0.19, 'target');
    const preserved = [...SECRET_STORAGE_KEYS, ...DEVICE_STORAGE_KEYS] as const;

    for (const key of preserved) storage.setItem(key, `preserve:${key}`);
    for (const key of REBUILDABLE_CACHE_KEYS) storage.setItem(key, `cache:${key}`);
    storage.setItem('ft_unregistered_cache', 'keep');
    storage.resetSetCalls();

    const result = await replacePortableData(target, {
      storage,
      now: () => '2026-08-13T00:00:00.000Z',
      createId: () => 'journal-success',
    });

    expect(result).toEqual({ ok: true });
    expect(readPortableSnapshot(storage)).toEqual(target);
    for (const key of PORTABLE_STORAGE_KEYS) expect(storage.getItem(key)).not.toBeNull();
    for (const key of preserved) expect(storage.getItem(key)).toBe(`preserve:${key}`);
    for (const key of REBUILDABLE_CACHE_KEYS) expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem('ft_unregistered_cache')).toBe('keep');
    await expect(recoveryJournal.getActive()).resolves.toBeNull();
  });

  it('restores the complete previous snapshot and removes the journal when the third write throws', async () => {
    const storage = new FaultInjectingStorage((setCall) => setCall === 3);
    const previous = makeSnapshot(0.31, 'previous');
    writePortableSnapshot(storage, previous);
    storage.resetSetCalls();

    const result = await replacePortableData(makeSnapshot(0.17, 'target'), {
      storage,
      now: () => '2026-08-13T00:00:00.000Z',
      createId: () => 'journal-rollback',
    });

    expect(result).toEqual({ ok: false, code: 'replacement_failed', rolledBack: true });
    expect(readPortableSnapshot(storage)).toEqual(previous);
    await expect(recoveryJournal.getActive()).resolves.toBeNull();
  });

  it('retains the writing journal when rollback fails', async () => {
    const storage = new FaultInjectingStorage((setCall) => setCall >= 3);
    const previous = makeSnapshot(0.31, 'previous');
    writePortableSnapshot(storage, previous);
    storage.resetSetCalls();

    const result = await replacePortableData(makeSnapshot(0.17, 'target'), {
      storage,
      now: () => '2026-08-13T00:00:00.000Z',
      createId: () => 'journal-retained',
    });

    expect(result).toEqual({ ok: false, code: 'rollback_failed', rolledBack: false });
    await expect(recoveryJournal.getActive()).resolves.toMatchObject({
      id: 'journal-retained',
      status: 'writing',
      previousSnapshot: previous,
    });
  });

  it('returns recovery_unavailable before the first storage write when journal creation fails', async () => {
    const storage = new FaultInjectingStorage(() => {
      throw new Error('localStorage must not be written');
    });
    const unavailableJournal: RecoveryJournalAdapter = {
      getActive: async () => null,
      create: async () => { throw new Error('IndexedDB unavailable'); },
      setStatus: async () => undefined,
      remove: async () => undefined,
    };
    storage.resetSetCalls();

    const result = await replacePortableData(makeSnapshot(0.17, 'target'), {
      storage,
      journal: unavailableJournal,
      now: () => '2026-08-13T00:00:00.000Z',
      createId: () => 'journal-unavailable',
    });

    expect(result).toEqual({ ok: false, code: 'recovery_unavailable' });
    expect(storage.length).toBe(0);
  });
});

describe('recoveryJournal', () => {
  it('stores one active record and updates its status without changing recovery data', async () => {
    const previousSnapshot = makeSnapshot(0.31, 'previous');
    const journal: ImportRecoveryJournal = {
      id: 'journal-direct',
      startedAt: '2026-08-13T00:00:00.000Z',
      schemaVersion: 1,
      status: 'prepared',
      previousSnapshot,
      targetDigest: 'abc123',
    };

    await recoveryJournal.create(journal);
    await recoveryJournal.setStatus('writing');

    await expect(recoveryJournal.getActive()).resolves.toEqual({ ...journal, status: 'writing' });
  });
});
