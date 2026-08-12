import { describe, expect, it } from 'vitest';
import type { ParsedBackup, PortableFinancialData } from './model';
import { createEmptyPortableData } from './snapshot';
import { buildBackupPreview } from './preview';

function collection<T>(count: number): T[] {
  return Array.from({ length: count }, (_, index) => ({ id: `item-${index}` } as T));
}

function snapshotWithCounts(counts: Partial<Record<'assets' | 'transactions' | 'recurring' | 'budgets' | 'stockTransactions' | 'stockHistory', number>>): PortableFinancialData {
  return {
    ...createEmptyPortableData(),
    assets: collection<PortableFinancialData['assets'][number]>(counts.assets ?? 0),
    transactions: collection<PortableFinancialData['transactions'][number]>(counts.transactions ?? 0),
    recurring: collection<PortableFinancialData['recurring'][number]>(counts.recurring ?? 0),
    budgets: collection<PortableFinancialData['budgets'][number]>(counts.budgets ?? 0),
    stockTransactions: collection<PortableFinancialData['stockTransactions'][number]>(counts.stockTransactions ?? 0),
    stockHistory: collection<PortableFinancialData['stockHistory'][number]>(counts.stockHistory ?? 0),
  };
}

describe('buildBackupPreview', () => {
  it('shows the deterministic current-versus-target replacement counts', () => {
    const current = snapshotWithCounts({ assets: 2, transactions: 5, budgets: 1 });
    const target = snapshotWithCounts({ assets: 1, transactions: 7 });
    target.dividendEvents = {
      '2330': [{ exDate: '2026-08-13', dividendPerShare: 4 }],
      '0050': [{ exDate: '2026-08-13', dividendPerShare: 2 }, { exDate: '2026-08-14', dividendPerShare: 2 }],
    };
    const parsed: ParsedBackup = {
      snapshot: target,
      metadata: { format: 'fintrack-ai-backup', schemaVersion: 1, appVersion: '7.12.0', createdAt: '2026-08-13T00:00:00.000Z' },
      migrationNotes: ['Migrated legacy flat backup.'],
      deduplicationCounts: { stockTransactions: 2 },
      ignoredSecretKeys: ['ft_api_key'],
      ignoredUnknownKeys: ['ft_theme'],
    };

    const preview = buildBackupPreview(current, parsed);
    const row = (key: string) => preview.rows.find((candidate) => candidate.key === key);

    expect(row('assets')).toMatchObject({ before: 2, after: 1, delta: -1, reset: false });
    expect(row('transactions')).toMatchObject({ before: 5, after: 7, delta: 2, reset: false });
    expect(row('budgets')).toMatchObject({ before: 1, after: 0, delta: -1, reset: true });
    expect(row('dividendEvents')).toMatchObject({ before: 0, after: 3, delta: 3, reset: false });
    expect(preview.rows.map((candidate) => candidate.key)).toEqual([
      'assets', 'transactions', 'recurring', 'budgets', 'stockTransactions', 'stockHistory', 'dividendEvents',
    ]);
    expect(preview.metadata).toEqual(parsed.metadata);
    expect(preview.migrationNotes).toEqual(['Migrated legacy flat backup.']);
    expect(preview.deduplicationCounts).toEqual({ stockTransactions: 2 });
    expect(preview.ignoredSecretKeys).toEqual(['ft_api_key']);
    expect(preview.ignoredUnknownKeys).toEqual(['ft_theme']);
  });
});
