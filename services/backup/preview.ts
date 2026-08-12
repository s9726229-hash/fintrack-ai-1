import type { BackupPreview, BackupPreviewRow, ParsedBackup, PortableFinancialData } from './model';

type PreviewCollectionKey = 'assets' | 'transactions' | 'recurring' | 'budgets' | 'stockTransactions' | 'stockHistory';

const collectionRows: ReadonlyArray<{ key: PreviewCollectionKey; label: string }> = [
  { key: 'assets', label: '資產' },
  { key: 'transactions', label: '交易紀錄' },
  { key: 'recurring', label: '週期性收支' },
  { key: 'budgets', label: '預算' },
  { key: 'stockTransactions', label: '股票交易紀錄' },
  { key: 'stockHistory', label: '股票歷史資料' },
];

function countDividendEvents(snapshot: PortableFinancialData): number {
  return Object.values(snapshot.dividendEvents).reduce((total, events) => total + events.length, 0);
}

function createRow(key: string, label: string, before: number, after: number): BackupPreviewRow {
  return { key, label, before, after, delta: after - before, reset: before > 0 && after === 0 };
}

export function buildBackupPreview(current: PortableFinancialData, parsed: ParsedBackup): BackupPreview {
  const rows = collectionRows.map(({ key, label }) => createRow(key, label, current[key].length, parsed.snapshot[key].length));
  rows.push(createRow('dividendEvents', '股利事件', countDividendEvents(current), countDividendEvents(parsed.snapshot)));

  return {
    metadata: parsed.metadata,
    rows,
    migrationNotes: parsed.migrationNotes,
    deduplicationCounts: parsed.deduplicationCounts,
    ignoredSecretKeys: parsed.ignoredSecretKeys,
    ignoredUnknownKeys: parsed.ignoredUnknownKeys,
  };
}
