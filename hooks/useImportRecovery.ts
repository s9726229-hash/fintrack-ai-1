import { useCallback, useEffect, useState } from 'react';
import { createBackupEnvelope, serializeBackup } from '../services/backup/export';
import type { ImportRecoveryJournal } from '../services/backup/model';
import { recoveryJournal } from '../services/backup/recoveryJournal';
import { restorePreviousSnapshot } from '../services/backup/replace';

export type ImportRecoveryStatus =
  | 'checking'
  | 'ready'
  | 'needs-recovery'
  | 'recovery-failed';

export interface ImportRecoveryState {
  status: ImportRecoveryStatus;
  journal: ImportRecoveryJournal | null;
  recover: () => Promise<void>;
  downloadRecoverySnapshot: () => void;
}

export function useImportRecovery(): ImportRecoveryState {
  const [status, setStatus] = useState<ImportRecoveryStatus>('checking');
  const [journal, setJournal] = useState<ImportRecoveryJournal | null>(null);

  const inspectJournal = useCallback(async () => {
    setStatus('checking');

    try {
      const activeJournal = await recoveryJournal.getActive();
      setJournal(activeJournal);

      if (!activeJournal) {
        setStatus('ready');
        return;
      }

      if (activeJournal.status === 'writing') {
        setStatus('needs-recovery');
        return;
      }

      await recoveryJournal.remove();
      setJournal(null);
      setStatus('ready');
    } catch {
      setStatus('recovery-failed');
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (active) await inspectJournal();
    })();

    return () => {
      active = false;
    };
  }, [inspectJournal]);

  const recover = useCallback(async () => {
    if (!journal || journal.status !== 'writing') {
      await inspectJournal();
      return;
    }

    const result = await restorePreviousSnapshot(journal);
    if (result.ok) {
      setJournal(null);
      setStatus('ready');
      return;
    }

    setStatus('recovery-failed');
  }, [inspectJournal, journal]);

  const downloadRecoverySnapshot = useCallback(() => {
    if (!journal) return;

    const json = serializeBackup(createBackupEnvelope(journal.previousSnapshot, new Date().toISOString()));
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fintrack_ai_recovery_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [journal]);

  return { status, journal, recover, downloadRecoverySnapshot };
}
