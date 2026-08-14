import React, { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Download, RotateCcw } from 'lucide-react';
import type { ImportRecoveryState } from '../hooks/useImportRecovery';

interface ImportRecoveryGateProps {
  recovery: ImportRecoveryState;
  refreshData: () => void | Promise<void>;
  children: ReactNode;
}

export function ImportRecoveryGate({ recovery, refreshData, children }: ImportRecoveryGateProps) {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (recovery.status !== 'ready' || dataLoaded) return;

    let active = true;
    void Promise.resolve(refreshData()).then(() => {
      if (active) setDataLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [dataLoaded, recovery.status, refreshData]);

  const handleRecover = async () => {
    if (recovering) return;
    setRecovering(true);
    try {
      await recovery.recover();
    } finally {
      setRecovering(false);
    }
  };

  if (recovery.status === 'ready' && dataLoaded) {
    return <>{children}</>;
  }

  if (recovery.status === 'checking' || recovery.status === 'ready') {
    return (
      <main className="min-h-screen bg-[#F5F0E3] flex items-center justify-center p-6">
        <p role="status" className="text-sm font-medium text-slate-600">
          正在檢查上次資料匯入狀態…
        </p>
      </main>
    );
  }

  const recoveryFailed = recovery.status === 'recovery-failed';

  return (
    <main className="min-h-screen bg-[#F5F0E3] flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle aria-hidden="true" size={24} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">上次資料匯入未完成</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          為避免背景工作繼續寫入不完整資料，請先回復匯入前的財務快照。
        </p>

        {recoveryFailed && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            復原未成功。資料仍保持阻擋狀態；你可以下載復原快照後再重試。
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {recoveryFailed ? (
            <>
              <button
                type="button"
                onClick={recovery.downloadRecoverySnapshot}
                disabled={!recovery.journal}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download aria-hidden="true" size={17} />
                下載復原快照
              </button>
              <button
                type="button"
                onClick={handleRecover}
                disabled={recovering}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
              >
                <RotateCcw aria-hidden="true" size={17} />
                {recovering ? '復原中…' : '重試'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRecover}
              disabled={recovering}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
            >
              <RotateCcw aria-hidden="true" size={17} />
              {recovering ? '復原中…' : '回復匯入前資料'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
