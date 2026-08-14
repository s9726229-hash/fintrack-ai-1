import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../constants';
import { AssetType, Currency } from '../types';
import type { PortableFinancialData } from '../services/backup/model';
import type { ReplaceResult } from '../services/backup/replace';
import { createEmptyPortableData } from '../services/backup/snapshot';
import { Settings } from './Settings';

const mocks = vi.hoisted(() => ({
  initGapi: vi.fn(() => Promise.resolve()),
  initGis: vi.fn(() => Promise.resolve()),
  handleAuthClick: vi.fn(() => Promise.resolve('access-token')),
  uploadToDrive: vi.fn<[string], Promise<void>>(() => Promise.resolve()),
  downloadFromDrive: vi.fn<[], Promise<string>>(),
  getBackupMetadata: vi.fn(() => Promise.resolve(null)),
  checkConnection: vi.fn(() => true),
  replacePortableData: vi.fn<[PortableFinancialData], Promise<ReplaceResult>>(() => Promise.resolve({ ok: true })),
  downloadBackupFile: vi.fn<[string, string], void>(),
}));

vi.mock('../services/googleDrive', () => ({
  initGapi: mocks.initGapi,
  initGis: mocks.initGis,
  handleAuthClick: mocks.handleAuthClick,
  uploadToDrive: mocks.uploadToDrive,
  downloadFromDrive: mocks.downloadFromDrive,
  getBackupMetadata: mocks.getBackupMetadata,
  checkConnection: mocks.checkConnection,
}));

vi.mock('../services/backup/replace', () => ({
  replacePortableData: mocks.replacePortableData,
}));

vi.mock('../services/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/storage')>();
  return {
    ...actual,
    downloadBackupFile: mocks.downloadBackupFile,
  };
});

vi.mock('../services/stock', () => ({
  fetchFinMindUsage: vi.fn(() => Promise.resolve(null)),
}));

const currentAsset = {
  id: 'current-asset',
  name: 'Current cash',
  type: AssetType.CASH,
  amount: 100,
  currency: Currency.TWD,
  exchangeRate: 1,
  lastUpdated: 1,
};

const targetAssets = [
  {
    id: 'target-asset-1',
    name: 'Target cash',
    type: AssetType.CASH,
    amount: 200,
    currency: Currency.TWD,
    exchangeRate: 1,
    lastUpdated: 2,
  },
  {
    id: 'target-asset-2',
    name: 'Target stock',
    type: AssetType.STOCK,
    amount: 300,
    currency: Currency.TWD,
    exchangeRate: 1,
    lastUpdated: 3,
  },
];

function currentBackup(overrides: Partial<PortableFinancialData> = {}): string {
  return JSON.stringify({
    metadata: {
      format: 'fintrack-ai-backup',
      schemaVersion: 1,
      appVersion: '7.12.0',
      createdAt: '2026-08-14T00:00:00.000Z',
    },
    data: { ...createEmptyPortableData(), ...overrides },
  });
}

function setCurrentSnapshot(): void {
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([currentAsset]));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([
    { id: 'current-tx', date: '2026-08-14', amount: 10, category: 'food', item: 'tea', type: 'EXPENSE' },
  ]));
}

async function selectLocalBackup(container: HTMLElement, raw: string): Promise<void> {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('File input not found');
  fireEvent.change(input, {
    target: { files: [new File([raw], 'backup.json', { type: 'application/json' })] },
  });
  await screen.findByRole('heading', { name: '匯入預覽' });
}

async function renderConnectedSettings(onDataChange = vi.fn()) {
  localStorage.setItem('ft_google_client_id', 'client-id');
  const rendered = render(<Settings onDataChange={onDataChange} />);
  await screen.findByRole('button', { name: '雲端還原' });
  return { ...rendered, onDataChange };
}

function expectAssetPreview(before: string, after: string, delta: string): void {
  const row = screen.getByRole('row', { name: /資產/ });
  expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    '資產', before, after, delta,
  ]);
}

describe('Settings safe backup and restore flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkConnection.mockReturnValue(true);
    mocks.replacePortableData.mockResolvedValue({ ok: true });
    mocks.downloadFromDrive.mockResolvedValue(currentBackup({ assets: targetAssets }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the release version and accurate backup privacy copy', () => {
    render(<Settings onDataChange={vi.fn()} />);

    expect(screen.getByText('FinTrack AI v7.12.0')).toBeInTheDocument();
    expect(screen.getByText(/備份不包含 Gemini API Key 與 FinMind Token/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('資料已加密');
  });

  it('previews current, imported, and delta counts from a local file before any write', async () => {
    setCurrentSnapshot();
    const { container } = render(<Settings onDataChange={vi.fn()} />);

    await selectLocalBackup(container, currentBackup({ assets: targetAssets, transactions: [] }));

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      '資料', '目前', '匯入後', '差異',
    ]);
    expectAssetPreview('1', '2', '+1');
    expect(screen.getByText(/Schema 1/)).toBeInTheDocument();
    expect(mocks.replacePortableData).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSETS) ?? '[]')).toEqual([currentAsset]);
  });

  it('opens the same preview for a Drive download instead of importing immediately', async () => {
    setCurrentSnapshot();
    const { onDataChange } = await renderConnectedSettings();
    mocks.downloadFromDrive.mockResolvedValue(currentBackup({ assets: targetAssets, transactions: [] }));

    fireEvent.click(screen.getByRole('button', { name: '雲端還原' }));

    await screen.findByRole('heading', { name: '匯入預覽' });
    expectAssetPreview('1', '2', '+1');
    expect(mocks.replacePortableData).not.toHaveBeenCalled();
    expect(onDataChange).not.toHaveBeenCalled();
  });

  it('downloads a secret-free current snapshot before replacing with the parsed target', async () => {
    setCurrentSnapshot();
    localStorage.setItem('ft_api_key', 'gemini-secret-value');
    localStorage.setItem('ft_finmind_token', 'finmind-secret-value');
    const order: string[] = [];
    mocks.downloadBackupFile.mockImplementation(() => { order.push('download'); });
    mocks.replacePortableData.mockImplementation(async () => {
      order.push('replace');
      return { ok: true };
    });
    const onDataChange = vi.fn();
    const { container } = render(<Settings onDataChange={onDataChange} />);
    await selectLocalBackup(container, currentBackup({ assets: targetAssets }));
    vi.useFakeTimers();

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '完整取代目前財務資料' }));
      });

      expect(order).toEqual(['download', 'replace']);
      const [downloadedJson, filename] = mocks.downloadBackupFile.mock.calls[0];
      expect(filename).toBe(`fintrack_ai_pre_import_${new Date().toISOString().split('T')[0]}.json`);
      expect(downloadedJson).not.toContain('gemini-secret-value');
      expect(downloadedJson).not.toContain('finmind-secret-value');
      expect(downloadedJson).not.toContain('ft_api_key');
      expect(downloadedJson).not.toContain('ft_finmind_token');
      expect(mocks.replacePortableData).toHaveBeenCalledWith(expect.objectContaining({ assets: targetAssets }));
      expect(onDataChange).toHaveBeenCalledOnce();
      expect(screen.queryByRole('heading', { name: '匯入預覽' })).not.toBeInTheDocument();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('cancels a prepared import without writing any data', async () => {
    const { container } = render(<Settings onDataChange={vi.fn()} />);
    await selectLocalBackup(container, currentBackup({ assets: targetAssets }));

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(screen.queryByRole('heading', { name: '匯入預覽' })).not.toBeInTheDocument();
    expect(mocks.downloadBackupFile).not.toHaveBeenCalled();
    expect(mocks.replacePortableData).not.toHaveBeenCalled();
  });

  it('shows core-data diagnostics without opening confirmation', async () => {
    const { container } = render(<Settings onDataChange={vi.fn()} />);
    const invalid = currentBackup({ assets: [{ ...targetAssets[0], id: '' }] });
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found');

    fireEvent.change(input, {
      target: { files: [new File([invalid], 'invalid.json', { type: 'application/json' })] },
    });

    expect(await screen.findByText(/data\.assets\[0\]\.id/)).toBeInTheDocument();
    expect(screen.getByText(/Expected a non-empty string/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '匯入預覽' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '完整取代目前財務資料' })).not.toBeInTheDocument();
    expect(mocks.replacePortableData).not.toHaveBeenCalled();
  });

  it('routes an empty FileReader result through backup diagnostics', async () => {
    const { container } = render(<Settings onDataChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found');

    fireEvent.change(input, {
      target: { files: [new File([''], 'empty.json', { type: 'application/json' })] },
    });

    expect(await screen.findByText(/Backup is not valid JSON/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '匯入預覽' })).not.toBeInTheDocument();
    expect(mocks.replacePortableData).not.toHaveBeenCalled();
  });

  it('reports a FileReader transport error without preparing an import', async () => {
    class ErroringFileReader {
      onload: FileReader['onload'] = null;
      onerror: FileReader['onerror'] = null;

      readAsText(): void {
        const errorEvent = new ProgressEvent('error') as unknown as ProgressEvent<FileReader>;
        this.onerror?.call(this as unknown as FileReader, errorEvent);
      }
    }
    vi.stubGlobal('FileReader', ErroringFileReader);
    const { container } = render(<Settings onDataChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found');

    fireEvent.change(input, {
      target: { files: [new File(['backup'], 'unreadable.json', { type: 'application/json' })] },
    });

    expect(await screen.findByText(/無法讀取備份檔案/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '匯入預覽' })).not.toBeInTheDocument();
    expect(mocks.replacePortableData).not.toHaveBeenCalled();
  });

  it('shows all preview rows and migration notices without echoing ignored credential values', async () => {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([{ category: 'food', limit: 1000 }]));
    const legacyStockTransaction = {
      id: 'stock-1', date: '2026-08-14', symbol: '2330', side: 'BUY', tradeType: 'CASH',
      shares: 1, price: 100, fees: 1, amount: 101,
    };
    const legacy = JSON.stringify({
      ft_assets: [{ ...targetAssets[1], transactions: [legacyStockTransaction] }],
      ft_stock_transactions: [legacyStockTransaction],
      ft_api_key: 'never-render-gemini-secret',
      ft_finmind_token: 'never-render-finmind-secret',
      ft_future_cache: { value: 'ignored' },
    });
    const { container } = render(<Settings onDataChange={vi.fn()} />);

    await selectLocalBackup(container, legacy);

    for (const label of ['資產', '交易紀錄', '週期性收支', '預算', '股票交易紀錄', '股票歷史資料', '股利事件']) {
      expect(screen.getByRole('cell', { name: label }).closest('tr')).toBeInTheDocument();
    }
    expect(screen.getByText(/Migrated legacy flat backup/)).toBeInTheDocument();
    expect(screen.getByText(/stockTransactions.*1/)).toBeInTheDocument();
    expect(screen.getByText(/ft_api_key/)).toBeInTheDocument();
    expect(screen.getByText(/ft_finmind_token/)).toBeInTheDocument();
    expect(screen.getByText(/ft_future_cache/)).toBeInTheDocument();
    expect(screen.getByText(/預算.*歸零/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('never-render-gemini-secret');
    expect(document.body).not.toHaveTextContent('never-render-finmind-secret');
  });

  it('keeps the preview open and reports a recoverable replacement failure', async () => {
    mocks.replacePortableData.mockResolvedValue({ ok: false, code: 'replacement_failed', rolledBack: true });
    const onDataChange = vi.fn();
    const reloadPage = vi.fn();
    const { container } = render(<Settings onDataChange={onDataChange} reloadPage={reloadPage} />);
    await selectLocalBackup(container, currentBackup({ assets: targetAssets }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '完整取代目前財務資料' }));
    });

    expect(screen.getByRole('heading', { name: '匯入預覽' })).toBeInTheDocument();
    expect(screen.getByText(/已還原原有資料/)).toBeInTheDocument();
    expect(onDataChange).not.toHaveBeenCalled();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('reloads immediately after rollback failure so startup recovery can take over', async () => {
    mocks.replacePortableData.mockResolvedValue({ ok: false, code: 'rollback_failed', rolledBack: false });
    const onDataChange = vi.fn();
    const reloadPage = vi.fn();
    const { container } = render(<Settings onDataChange={onDataChange} reloadPage={reloadPage} />);
    await selectLocalBackup(container, currentBackup({ assets: targetAssets }));
    vi.useFakeTimers();

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '完整取代目前財務資料' }));
      });

      expect(mocks.downloadBackupFile).toHaveBeenCalledOnce();
      expect(onDataChange).not.toHaveBeenCalled();
      expect(reloadPage).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('downloads a serialized safe envelope for a local backup', () => {
    setCurrentSnapshot();
    localStorage.setItem('ft_api_key', 'gemini-secret-value');
    localStorage.setItem('ft_finmind_token', 'finmind-secret-value');
    render(<Settings onDataChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '匯出 JSON 備份' }));

    expect(mocks.downloadBackupFile).toHaveBeenCalledOnce();
    const [downloadedJson, filename] = mocks.downloadBackupFile.mock.calls[0];
    expect(filename).toBe(`fintrack_ai_backup_${new Date().toISOString().split('T')[0]}.json`);
    expect(JSON.parse(downloadedJson)).toMatchObject({
      metadata: { format: 'fintrack-ai-backup', schemaVersion: 1 },
      data: { assets: [currentAsset] },
    });
    expect(downloadedJson).not.toContain('gemini-secret-value');
    expect(downloadedJson).not.toContain('finmind-secret-value');
  });

  it('uploads serialized safe JSON to Drive and uses accurate success copy', async () => {
    setCurrentSnapshot();
    localStorage.setItem('ft_api_key', 'gemini-secret-value');
    localStorage.setItem('ft_finmind_token', 'finmind-secret-value');
    await renderConnectedSettings();

    fireEvent.click(screen.getByRole('button', { name: '雲端備份' }));

    await waitFor(() => expect(mocks.uploadToDrive).toHaveBeenCalledOnce());
    const [uploadedJson] = mocks.uploadToDrive.mock.calls[0];
    expect(JSON.parse(uploadedJson)).toMatchObject({
      metadata: { format: 'fintrack-ai-backup', schemaVersion: 1 },
      data: { assets: [currentAsset] },
    });
    expect(uploadedJson).not.toContain('gemini-secret-value');
    expect(uploadedJson).not.toContain('finmind-secret-value');
    const success = await screen.findByText(/備份成功/);
    expect(success).not.toHaveTextContent('加密');
  });
});
