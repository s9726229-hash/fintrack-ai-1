import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../constants';
import { AssetType, Currency, type Asset, type DividendEvent } from '../types';
import { useStockEnrichment } from './useStockEnrichment';

const stockMocks = vi.hoisted(() => ({
  enrichStockBasicInfo: vi.fn(),
  enrichStockDividendInfo: vi.fn(),
  fetchDividendEventsForSymbol: vi.fn(),
  fetchMarketRegime: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../services/stock', () => stockMocks);

function stockAsset(currentPrice = 100): Asset {
  return {
    id: 'stock-2330',
    name: '台積電',
    type: AssetType.STOCK,
    amount: currentPrice,
    currency: Currency.TWD,
    exchangeRate: 1,
    symbol: '2330',
    shares: 1,
    avgCost: 90,
    currentPrice,
    lastUpdated: 1,
  };
}

function createWriterGate() {
  let enabled = true;
  let generation = 0;

  return {
    gate: {
      acquireLease: () => enabled ? generation : null,
      canWrite: (lease: number) => enabled && lease === generation,
    },
    lockImport: () => {
      generation += 1;
      enabled = false;
    },
  };
}

describe('useStockEnrichment import races', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discards delayed asset enrichment when an import invalidates its writer lease', async () => {
    const original = stockAsset();
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([original]));
    let resolveEnrichment: ((value: Partial<Asset>) => void) | undefined;
    stockMocks.enrichStockBasicInfo.mockReturnValue(new Promise((resolve) => {
      resolveEnrichment = resolve;
    }));
    const writer = createWriterGate();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStockEnrichment({
      enabled: true,
      setToast: vi.fn(),
      writerGate: writer.gate,
    }));

    act(() => result.current.updatePrices(['stock-2330'], onSuccess));
    await waitFor(() => expect(stockMocks.enrichStockBasicInfo).toHaveBeenCalledOnce());

    writer.lockImport();
    await act(async () => resolveEnrichment?.({ currentPrice: 999 }));
    await waitFor(() => expect(result.current.enrichStatus.price.isUpdating).toBe(false));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSETS) ?? '[]')).toEqual([original]);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('discards delayed dividend-event enrichment before either persistent write', async () => {
    const originalEvents: Record<string, DividendEvent[]> = {
      '2330': [{ exDate: '2026-06-12', dividendPerShare: 3 }],
    };
    const originalScannedAt = { '2330': 1 };
    localStorage.setItem(STORAGE_KEYS.DIVIDEND_EVENTS, JSON.stringify(originalEvents));
    localStorage.setItem(STORAGE_KEYS.DIVIDEND_SCANNED_AT, JSON.stringify(originalScannedAt));
    let resolveEvents: ((value: DividendEvent[]) => void) | undefined;
    stockMocks.fetchDividendEventsForSymbol.mockReturnValue(new Promise((resolve) => {
      resolveEvents = resolve;
    }));
    const writer = createWriterGate();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStockEnrichment({
      enabled: true,
      setToast: vi.fn(),
      writerGate: writer.gate,
    }));

    let updatePromise: Promise<void> | undefined;
    act(() => {
      updatePromise = result.current.updateDividendEvents(['2330'], [], onSuccess);
    });
    await waitFor(() => expect(stockMocks.fetchDividendEventsForSymbol).toHaveBeenCalledOnce());

    writer.lockImport();
    resolveEvents?.([{ exDate: '2026-09-10', dividendPerShare: 4 }]);
    await act(async () => updatePromise);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVIDEND_EVENTS) ?? '{}')).toEqual(originalEvents);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVIDEND_SCANNED_AT) ?? '{}')).toEqual(originalScannedAt);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
