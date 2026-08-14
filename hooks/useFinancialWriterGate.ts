import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface FinancialWriterGate {
  enabled: boolean;
  acquireLease: () => number | null;
  canWrite: (lease: number) => boolean;
  beginImport: () => Promise<void>;
  finishImport: () => void;
}

export function useFinancialWriterGate(recoveryReady: boolean): FinancialWriterGate {
  const [importLocked, setImportLocked] = useState(false);
  const stateRef = useRef({ recoveryReady, importLocked: false, generation: 0 });
  const previousRecoveryReadyRef = useRef(recoveryReady);
  const lockCommittedRef = useRef(false);
  const lockWaitersRef = useRef<Array<() => void>>([]);

  if (previousRecoveryReadyRef.current && !recoveryReady) {
    stateRef.current.generation += 1;
  }
  previousRecoveryReadyRef.current = recoveryReady;
  stateRef.current.recoveryReady = recoveryReady;

  useLayoutEffect(() => {
    lockCommittedRef.current = importLocked;
    if (!importLocked) return;

    const waiters = lockWaitersRef.current.splice(0);
    waiters.forEach((resolve) => resolve());
  }, [importLocked]);

  const beginImport = useCallback(() => {
    if (stateRef.current.importLocked) {
      if (lockCommittedRef.current) return Promise.resolve();
      return new Promise<void>((resolve) => lockWaitersRef.current.push(resolve));
    }

    stateRef.current.generation += 1;
    stateRef.current.importLocked = true;
    lockCommittedRef.current = false;

    const committed = new Promise<void>((resolve) => lockWaitersRef.current.push(resolve));
    setImportLocked(true);
    return committed;
  }, []);

  const finishImport = useCallback(() => {
    if (!stateRef.current.importLocked) return;
    stateRef.current.importLocked = false;
    lockCommittedRef.current = false;
    setImportLocked(false);
  }, []);

  const acquireLease = useCallback(() => {
    const state = stateRef.current;
    return state.recoveryReady && !state.importLocked ? state.generation : null;
  }, []);

  const canWrite = useCallback((lease: number) => {
    const state = stateRef.current;
    return state.recoveryReady && !state.importLocked && state.generation === lease;
  }, []);

  const enabled = recoveryReady && !importLocked;
  return useMemo(() => ({
    enabled,
    acquireLease,
    canWrite,
    beginImport,
    finishImport,
  }), [acquireLease, beginImport, canWrite, enabled, finishImport]);
}
