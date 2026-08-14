import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetType, Currency } from '../types';
import * as storage from '../services/storage';
import type { ImportRecoveryJournal } from '../services/backup/model';
import { createEmptyPortableData } from '../services/backup/snapshot';
import { recoveryJournal } from '../services/backup/recoveryJournal';
import { restorePreviousSnapshot } from '../services/backup/replace';
import { ImportRecoveryGate } from './ImportRecoveryGate';
import { useImportRecovery, type ImportRecoveryState } from '../hooks/useImportRecovery';
import { useAutoTasks } from '../hooks/useAutoTasks';
import { useDailySnapshot } from '../hooks/useDailySnapshot';
import App from '../App';

vi.mock('../services/backup/recoveryJournal', () => ({
  recoveryJournal: {
    getActive: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/backup/replace', () => ({
  restorePreviousSnapshot: vi.fn(),
}));

const getActive = vi.mocked(recoveryJournal.getActive);
const removeJournal = vi.mocked(recoveryJournal.remove);
const restoreSnapshot = vi.mocked(restorePreviousSnapshot);

function journalWithStatus(status: ImportRecoveryJournal['status']): ImportRecoveryJournal {
  return {
    id: 'interrupted-import',
    startedAt: '2026-08-13T00:00:00.000Z',
    schemaVersion: 1,
    status,
    previousSnapshot: createEmptyPortableData(),
    targetDigest: 'target-digest',
  };
}

function HookGate({ refreshData = vi.fn() }: { refreshData?: () => void | Promise<void> }) {
  const recovery = useImportRecovery();
  return (
    <ImportRecoveryGate recovery={recovery} refreshData={refreshData}>
      <div>財務應用程式</div>
    </ImportRecoveryGate>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  removeJournal.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ImportRecoveryGate', () => {
  it('keeps app children unmounted while recovery is checking', () => {
    const recovery: ImportRecoveryState = {
      status: 'checking',
      journal: null,
      recover: vi.fn(),
      downloadRecoverySnapshot: vi.fn(),
    };

    render(
      <ImportRecoveryGate recovery={recovery} refreshData={vi.fn()}>
        <div>財務應用程式</div>
      </ImportRecoveryGate>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('正在檢查');
    expect(screen.queryByText('財務應用程式')).not.toBeInTheDocument();
  });

  it('blocks startup and offers rollback for a writing journal', async () => {
    getActive.mockResolvedValue(journalWithStatus('writing'));

    render(<HookGate />);

    expect(await screen.findByRole('heading', { name: '上次資料匯入未完成' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '回復匯入前資料' })).toBeInTheDocument();
    expect(screen.queryByText('財務應用程式')).not.toBeInTheDocument();
  });

  it('refreshes financial state and enables children only after recovery succeeds', async () => {
    const refreshData = vi.fn();
    getActive.mockResolvedValue(journalWithStatus('writing'));
    restoreSnapshot.mockResolvedValue({ ok: true });

    render(<HookGate refreshData={refreshData} />);
    fireEvent.click(await screen.findByRole('button', { name: '回復匯入前資料' }));

    await waitFor(() => expect(refreshData).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('財務應用程式')).toBeInTheDocument();
  });

  it('remains blocking after recovery failure and exposes download and retry actions', async () => {
    getActive.mockResolvedValue(journalWithStatus('writing'));
    restoreSnapshot.mockResolvedValueOnce({ ok: false, code: 'rollback_failed' });

    render(<HookGate />);
    fireEvent.click(await screen.findByRole('button', { name: '回復匯入前資料' }));

    expect(await screen.findByRole('button', { name: '下載復原快照' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
    expect(screen.queryByText('財務應用程式')).not.toBeInTheDocument();

    restoreSnapshot.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: '重試' }));
    expect(await screen.findByText('財務應用程式')).toBeInTheDocument();
  });

  it.each(['prepared', 'verified'] as const)(
    'removes a %s journal before allowing startup',
    async (status) => {
      let finishRemoval: (() => void) | undefined;
      const removal = new Promise<void>((resolve) => {
        finishRemoval = resolve;
      });
      getActive.mockResolvedValue(journalWithStatus(status));
      removeJournal.mockReturnValue(removal);

      render(<HookGate />);

      await waitFor(() => expect(removeJournal).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('財務應用程式')).not.toBeInTheDocument();

      await act(async () => finishRemoval?.());
      expect(await screen.findByText('財務應用程式')).toBeInTheDocument();
    },
  );
});

describe('startup financial writer guards', () => {
  it('does not load financial data while an interrupted import is unresolved', async () => {
    getActive.mockResolvedValue(journalWithStatus('writing'));
    const getAssets = vi.spyOn(storage, 'getAssets');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '上次資料匯入未完成' })).toBeInTheDocument();
    expect(getAssets).not.toHaveBeenCalled();
  });

  it('does not auto-execute recurring transactions while recovery is unresolved', () => {
    const setTransactions = vi.fn();
    const setRecurringExecuted = vi.fn();
    const saveTransactions = vi.spyOn(storage, 'saveTransactions');
    const saveRecurringExecuted = vi.spyOn(storage, 'saveRecurringExecuted');

    renderHook(() => useAutoTasks({
      enabled: false,
      transactions: [],
      recurring: [{
        id: 'rent',
        name: '房租',
        amount: 20_000,
        category: '居住',
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        dayOfMonth: 1,
      }],
      recurringExecuted: {},
      setTransactions,
      setRecurringExecuted,
      setToast: vi.fn(),
    }));

    expect(setTransactions).not.toHaveBeenCalled();
    expect(setRecurringExecuted).not.toHaveBeenCalled();
    expect(saveTransactions).not.toHaveBeenCalled();
    expect(saveRecurringExecuted).not.toHaveBeenCalled();
  });

  it('does not write daily snapshots while recovery is unresolved', () => {
    const setStockHistory = vi.fn();
    const saveHistory = vi.spyOn(storage, 'saveHistory');
    const saveStockHistory = vi.spyOn(storage, 'saveStockHistory');

    renderHook(() => useDailySnapshot({
      enabled: false,
      assets: [{
        id: 'cash',
        name: '現金',
        type: AssetType.CASH,
        amount: 10_000,
        currency: Currency.TWD,
        exchangeRate: 1,
        lastUpdated: 0,
      }],
      transactions: [],
      setStockHistory,
    }));

    expect(saveHistory).not.toHaveBeenCalled();
    expect(saveStockHistory).not.toHaveBeenCalled();
    expect(setStockHistory).not.toHaveBeenCalled();
  });
});
