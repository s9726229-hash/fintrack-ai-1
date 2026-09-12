import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from './constants';
import { AssetType, Currency } from './types';
import * as storage from './services/storage';
import App from './App';

const appMocks = vi.hoisted(() => ({
  useAutoTasks: vi.fn(),
  useDailySnapshot: vi.fn(),
  useStockEnrichment: vi.fn(),
}));

vi.mock('./hooks/useAutoTasks', () => ({ useAutoTasks: appMocks.useAutoTasks }));
vi.mock('./hooks/useDailySnapshot', () => ({ useDailySnapshot: appMocks.useDailySnapshot }));
vi.mock('./hooks/useStockEnrichment', () => ({ useStockEnrichment: appMocks.useStockEnrichment }));
vi.mock('./hooks/useTheme', () => ({ useTheme: () => ({ theme: 'warm', toggleTheme: vi.fn() }) }));
vi.mock('./hooks/useImportRecovery', () => ({
  useImportRecovery: () => ({
    status: 'ready',
    journal: null,
    recover: vi.fn(),
    downloadRecoverySnapshot: vi.fn(),
  }),
}));
vi.mock('./services/finance', () => ({ calculateLoanBalance: () => 500 }));
vi.mock('./components/Layout', () => ({
  Layout: ({ children, onChangeView }: { children: React.ReactNode; onChangeView: (view: string) => void }) => (
    <div>
      <button onClick={() => onChangeView('SETTINGS')}>前往設定</button>
      <button onClick={() => onChangeView('TRANSACTIONS')}>前往記帳</button>
      <button onClick={() => onChangeView('INVESTMENTS')}>前往投資</button>
      {children}
    </div>
  ),
}));
vi.mock('./views/Dashboard', () => ({ Dashboard: () => <div>儀表板</div> }));
vi.mock('./views/Assets', () => ({ Assets: () => null }));
vi.mock('./views/Transactions', () => ({ Transactions: ({ onDelete }: { onDelete: (id: string) => void }) => <button onClick={() => onDelete('test-transaction')}>刪除測試交易</button> }));
vi.mock('./views/Recurring', () => ({ Recurring: () => null }));
vi.mock('./views/Guide', () => ({ GuideView: () => null }));
vi.mock('./views/Budget', () => ({ Budget: () => null }));
vi.mock('./views/Investments', () => ({ Investments: ({ onAddDividendTransactions }: { onAddDividendTransactions: (items: import('./types').Transaction[]) => void }) => <button onClick={() => onAddDividendTransactions([{ id: 'dividend:2330:2026-08-01', date: '2026-09-02', amount: 980, category: '股息', item: '台積電 股息', type: 'DIVIDEND' }])}>確認測試股息</button> }));
vi.mock('./views/Settings', () => ({
  Settings: ({ onDataChange, onImportStart, onImportFinish }: {
    onDataChange: () => void | Promise<void>;
    onImportStart?: () => Promise<void>;
    onImportFinish?: () => void;
  }) => (
    <div>
      <button onClick={async () => {
        await onImportStart?.();
        await onDataChange();
      }}>開始完整取代</button>
      <button onClick={() => onImportFinish?.()}>完成一般失敗交接</button>
    </div>
  ),
}));

function lastEnabled(mock: ReturnType<typeof vi.fn>): boolean | undefined {
  return mock.mock.calls.at(-1)?.[0]?.enabled;
}

describe('App import writer lock', () => {
  it('does not claim to add a duplicate dividend receipt', async () => {
    render(<App />);
    await screen.findByText('儀表板');
    fireEvent.click(screen.getByRole('button', { name: '前往投資' }));
    fireEvent.click(screen.getByRole('button', { name: '確認測試股息' }));
    fireEvent.click(screen.getByRole('button', { name: '確認測試股息' }));
    expect(storage.getTransactions().filter(t => t.id === 'dividend:2330:2026-08-01')).toHaveLength(1);
    expect(screen.getByText('已入帳，未重複新增。')).toBeInTheDocument();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    appMocks.useDailySnapshot.mockReturnValue({
      takePortfolioSnapshot: vi.fn(),
      takeStockSnapshot: vi.fn(),
    });
    appMocks.useStockEnrichment.mockReturnValue({
      enrichStatus: {
        price: { isUpdating: false, progress: { current: 0, total: 0 } },
        dividend: { isUpdating: false, progress: { current: 0, total: 0 } },
      },
      updatePrices: vi.fn(),
      updateDividends: vi.fn(() => Promise.resolve()),
      updateDividendEvents: vi.fn(() => Promise.resolve()),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('commits the import lock before refresh and gates every background writer until finish', async () => {
    const saveAssets = vi.spyOn(storage, 'saveAssets');
    render(<App />);
    await screen.findByText('儀表板');
    fireEvent.click(screen.getByRole('button', { name: '前往設定' }));

    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([{
      id: 'debt',
      name: '房貸',
      type: AssetType.DEBT,
      amount: 1_000,
      originalAmount: 1_000,
      interestRate: 1.5,
      termYears: 20,
      paidYears: 1,
      startDate: '2025-01-01',
      currency: Currency.TWD,
      exchangeRate: 1,
      lastUpdated: 1,
    }]));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '開始完整取代' }));
    });

    await waitFor(() => {
      expect(lastEnabled(appMocks.useAutoTasks)).toBe(false);
      expect(lastEnabled(appMocks.useDailySnapshot)).toBe(false);
      expect(lastEnabled(appMocks.useStockEnrichment)).toBe(false);
    });
    expect(saveAssets).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '完成一般失敗交接' }));

    await waitFor(() => {
      expect(lastEnabled(appMocks.useAutoTasks)).toBe(true);
      expect(lastEnabled(appMocks.useDailySnapshot)).toBe(true);
      expect(lastEnabled(appMocks.useStockEnrichment)).toBe(true);
      expect(saveAssets).toHaveBeenCalledOnce();
    });
  });
  it('restores a deleted transaction without removing records added since deletion', async () => {
    const transaction = { id: 'test-transaction', date: '2026-09-09', amount: 100, category: '餐飲', item: '午餐', type: 'EXPENSE' as const };
    storage.saveTransactions([transaction]);
    render(<App />);
    await screen.findByText('儀表板');
    fireEvent.click(screen.getByText('前往記帳'));
    fireEvent.click(screen.getByText('刪除測試交易'));
    expect(storage.getTransactions()).toEqual([]);
    const later = { ...transaction, id: 'later' };
    storage.saveTransactions([later]);
    fireEvent.click(screen.getByText('復原刪除'));
    expect(storage.getTransactions()).toEqual([later, transaction]);
    expect(screen.queryByText('復原刪除')).not.toBeInTheDocument();
  });
});
