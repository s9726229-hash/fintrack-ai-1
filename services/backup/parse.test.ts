import { describe, expect, it } from 'vitest';
import { createEmptyPortableData } from './snapshot';
import { parseBackupJson } from './parse';

function currentBackup(data: Record<string, unknown> = {}) {
  return JSON.stringify({
    metadata: {
      format: 'fintrack-ai-backup',
      schemaVersion: 1,
      appVersion: '7.12.0',
      createdAt: '2026-08-13T00:00:00.000Z',
    },
    data: { ...createEmptyPortableData(), ...data },
  });
}

const stockTransaction = {
  id: 'stock-1', date: '2026-08-13', symbol: '2330', side: 'BUY', tradeType: 'CASH',
  shares: 1, price: 100, fees: 1, amount: 101,
};

describe('parseBackupJson', () => {
  it('accepts a current schema-1 envelope without touching storage', () => {
    const result = parseBackupJson(currentBackup({ transactions: [{
      id: 'tx-1', date: '2026-08-13', amount: 50, category: 'food', item: 'lunch', type: 'EXPENSE',
    }] }));

    expect(result).toMatchObject({ ok: true, parsed: { metadata: { schemaVersion: 1 } } });
    if (result.ok) expect(result.parsed.snapshot.transactions).toHaveLength(1);
  });

  it('migrates flat ft_ storage keys and gives missing portable fields safe defaults', () => {
    const result = parseBackupJson(JSON.stringify({
      ft_metadata: { appVersion: '6.9.0', createdAt: '2026-08-12T00:00:00.000Z' },
      ft_transactions: [{ id: 'tx-1', date: '2026-08-13', amount: 30, category: 'food', item: 'tea', type: 'EXPENSE' }],
    }));

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.parsed.snapshot.transactions).toHaveLength(1);
    expect(result.parsed.snapshot.assets).toEqual([]);
    expect(result.parsed.snapshot.stockTransactions).toEqual([]);
    expect(result.parsed.migrationNotes).toContain('Migrated legacy flat backup.');
  });

  it('moves legacy Asset transactions without mutating the input and deduplicates IDs', () => {
    const input = {
      ft_assets: [{
        id: 'asset-1', name: 'Taiwan stock', type: 'STOCK', amount: 100, currency: 'TWD', exchangeRate: 1, lastUpdated: 1,
        transactions: [stockTransaction, { ...stockTransaction }],
      }],
      ft_stock_transactions: [{ ...stockTransaction }],
    };

    const result = parseBackupJson(JSON.stringify(input));

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.parsed.snapshot.assets[0]).not.toHaveProperty('transactions');
    expect(result.parsed.snapshot.stockTransactions).toEqual([stockTransaction]);
    expect(result.parsed.deduplicationCounts.stockTransactions).toBe(2);
    expect(input.ft_assets[0]).toHaveProperty('transactions');
  });

  it('reports legacy secret keys by name but never includes their values in the snapshot or diagnostics', () => {
    const result = parseBackupJson(JSON.stringify({
      ft_api_key: 'do-not-echo-this-key',
      ft_finmind_token: 'do-not-echo-this-token',
    }));

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.parsed.ignoredSecretKeys).toEqual(['ft_api_key', 'ft_finmind_token']);
    expect(JSON.stringify(result.parsed.snapshot)).not.toContain('do-not-echo-this');
    expect(JSON.stringify(result)).not.toContain('do-not-echo-this');
  });

  it.each([
    ['wrong collection type', currentBackup({ transactions: {} }), 'data.transactions', 'invalid_type'],
    ['NaN-equivalent number', currentBackup({ feeDiscount: null }), 'data.feeDiscount', 'invalid_number'],
    ['malformed date', currentBackup({ transactions: [{ id: 'tx-1', date: '13/08/2026', amount: 1, category: 'food', item: 'tea', type: 'EXPENSE' }] }), 'data.transactions[0].date', 'invalid_date'],
    ['unsupported schema', JSON.stringify({ metadata: { format: 'fintrack-ai-backup', schemaVersion: 99, appVersion: '7.12.0', createdAt: '2026-08-13T00:00:00.000Z' }, data: createEmptyPortableData() }), 'metadata.schemaVersion', 'unsupported_schema'],
  ])('rejects %s', (_name, raw, path, code) => {
    const result = parseBackupJson(raw);

    expect(result).toEqual(expect.objectContaining({ ok: false }));
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ path, code }));
  });

  it('reports and ignores unknown non-core root fields', () => {
    const result = parseBackupJson(JSON.stringify({
      ft_assets: [],
      ft_unrelated_cache: { any: 'value' },
    }));

    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.parsed.ignoredUnknownKeys).toEqual(['ft_unrelated_cache']);
  });
});
