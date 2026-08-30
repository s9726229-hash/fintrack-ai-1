import { beforeEach, describe, expect, it } from 'vitest';
import { PORTABLE_STORAGE_KEYS } from '../../constants';
import { AssetType, Currency } from '../../types';
import { createBackupEnvelope, serializeBackup } from './export';
import { PortableFinancialData } from './model';
import { parseBackupJson } from './parse';
import { readPortableSnapshot, writePortableSnapshot } from './snapshot';

const snapshot: PortableFinancialData = {
  assets: [{ id: 'asset-1', name: 'Cash', type: AssetType.CASH, amount: 100, currency: Currency.TWD, exchangeRate: 1, lastUpdated: 1 }],
  transactions: [{ id: 'transaction-1', date: '2026-08-13', amount: 10, category: 'food', item: 'lunch', type: 'EXPENSE' }],
  recurring: [{ id: 'recurring-1', name: 'Rent', amount: 1000, category: 'home', type: 'EXPENSE', frequency: 'MONTHLY', dayOfMonth: 1 }],
  recurringExecuted: { 'recurring-1': ['2026-08'] },
  portfolioHistory: [{ date: '2026-08-13', totalAssets: 100, totalLiabilities: 0, netWorth: 100, assetDistribution: { CASH: 100, STOCK: 0, FUND: 0, REAL_ESTATE: 0, CRYPTO: 0, DEBT: 0, OTHER: 0 } }],
  budgets: [{ category: 'food', limit: 5000 }],
  stockHistory: [{ date: '2026-08-13', totalMarketValue: 200, totalUnrealizedPL: 10, positions: [{ symbol: '2330', marketValue: 200 }] }],
  stockTransactions: [{ id: 'stock-transaction-1', date: '2026-08-13', symbol: '2330', side: 'BUY', tradeType: 'CASH', shares: 1, price: 200, fees: 1, amount: 201 }],
  feeDiscount: 0.6,
  techParameters: {
    etfBuyBias: -7, etfStrongBuyBias: -10, etfBuyRsi: 45, etfStrongBuyRsi: 40, etfPartialSellBias: 15, etfSecondPartialSellBias: 20, etfBuySlopeDays: 1, etfStrongBuySlopeDays: 2, etfPartialSellSlopeDays: 2,
    largeCapBuyBias: -7, largeCapStrongBuyBias: -10, largeCapBuyRsi: 45, largeCapStrongBuyRsi: 40, largeCapPartialSellBias: 20, largeCapForceSellBias: 25, largeCapStopLossBias: -20, largeCapStopLossPnL: -8, largeCapRiskAlertBias: -15, largeCapBuySlopeDays: 1, largeCapStrongBuySlopeDays: 2, largeCapPartialSellSlopeDays: 2,
    smallCapBuyBias: -10, smallCapStrongBuyBias: -15, smallCapBuyRsi: 40, smallCapStrongBuyRsi: 35, smallCapPartialSellBias: 25, smallCapForceSellBias: 30, smallCapStopLossBias: -25, smallCapStopLossPnL: -10, smallCapRiskAlertBias: -18, smallCapBuySlopeDays: 2, smallCapStrongBuySlopeDays: 3, smallCapPartialSellSlopeDays: 2,
    chipInstDays: 3, chipMarginDays: 5,
  },
  dividendEvents: { '2330': [{ exDate: '2026-08-13', dividendPerShare: 4 }] },
  dividendScannedAt: { '2330': 1723507200000 },
};

const serializedValues: Record<(typeof PORTABLE_STORAGE_KEYS)[number], string> = {
  ft_assets: JSON.stringify(snapshot.assets),
  ft_transactions: JSON.stringify(snapshot.transactions),
  ft_recurring: JSON.stringify(snapshot.recurring),
  ft_recurring_executed: JSON.stringify(snapshot.recurringExecuted),
  ft_portfolio_history: JSON.stringify(snapshot.portfolioHistory),
  ft_budgets: JSON.stringify(snapshot.budgets),
  ft_stock_history: JSON.stringify(snapshot.stockHistory),
  ft_stock_transactions: JSON.stringify(snapshot.stockTransactions),
  ft_stock_fee_discount: String(snapshot.feeDiscount),
  ft_tech_params: JSON.stringify(snapshot.techParameters),
  ft_dividend_events: JSON.stringify(snapshot.dividendEvents),
  ft_dividend_scanned_at: JSON.stringify(snapshot.dividendScannedAt),
};

describe('safe portable backups', () => {
  beforeEach(() => localStorage.clear());

  it('serializes only financial data and metadata, never credentials', () => {
    writePortableSnapshot(localStorage, snapshot);
    localStorage.setItem('ft_api_key', 'gemini-secret');
    localStorage.setItem('ft_finmind_token', 'finmind-secret');
    localStorage.setItem('ft_google_client_id', 'device-client');
    localStorage.setItem('ft_theme', 'warm');

    const envelope = createBackupEnvelope(readPortableSnapshot(localStorage), '2026-08-13T00:00:00.000Z');
    const serialized = serializeBackup(envelope);

    expect(envelope.metadata).toMatchObject({
      format: 'fintrack-ai-backup',
      schemaVersion: 1,
      appVersion: '7.12.2',
      createdAt: '2026-08-13T00:00:00.000Z',
    });
    expect(JSON.parse(serialized)).toEqual(envelope);
    expect(serialized).not.toContain('gemini-secret');
    expect(serialized).not.toContain('finmind-secret');
    expect(serialized).not.toContain('ft_api_key');
    expect(serialized).not.toContain('ft_finmind_token');
    expect(serialized).not.toContain('device-client');
    expect(serialized).not.toContain('ft_google_client_id');
  });

  it('replaces every portable key while preserving credentials and device settings', () => {
    for (const key of PORTABLE_STORAGE_KEYS) localStorage.setItem(key, 'stale-value');
    localStorage.setItem('ft_api_key', 'gemini-secret');
    localStorage.setItem('ft_finmind_token', 'finmind-secret');
    localStorage.setItem('ft_google_client_id', 'device-client');
    localStorage.setItem('ft_theme', 'warm');

    writePortableSnapshot(localStorage, snapshot);

    for (const key of PORTABLE_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBe(serializedValues[key]);
    }
    expect(localStorage.getItem('ft_api_key')).toBe('gemini-secret');
    expect(localStorage.getItem('ft_finmind_token')).toBe('finmind-secret');
    expect(localStorage.getItem('ft_google_client_id')).toBe('device-client');
    expect(localStorage.getItem('ft_theme')).toBe('warm');
  });

  it('exports pre-existing historical stock records as a backup that can be imported again', () => {
    localStorage.setItem('ft_stock_history', JSON.stringify([
      { date: '2026-08-01', totalMarketValue: 1000 },
    ]));
    localStorage.setItem('ft_stock_transactions', JSON.stringify([
      { ...snapshot.stockTransactions[0], tradeType: '' },
    ]));

    const serialized = serializeBackup(createBackupEnvelope(
      readPortableSnapshot(localStorage),
      '2026-08-15T00:00:00.000Z',
    ));
    const result = parseBackupJson(serialized);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.parsed.snapshot.stockHistory[0]).toMatchObject({
      totalUnrealizedPL: 0,
      positions: [],
    });
    expect(result.parsed.snapshot.stockTransactions[0].tradeType).toBe('未提供');
  });
});
