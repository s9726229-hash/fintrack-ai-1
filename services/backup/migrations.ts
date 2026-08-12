import { PORTABLE_STORAGE_KEYS, SECRET_STORAGE_KEYS } from '../../constants';
import type { BackupMetadata, PortableFinancialData } from './model';
import { createEmptyPortableData } from './snapshot';

type PortableProperty = keyof PortableFinancialData;

const LEGACY_KEY_MAP: Record<(typeof PORTABLE_STORAGE_KEYS)[number], PortableProperty> = {
  ft_assets: 'assets', ft_transactions: 'transactions', ft_recurring: 'recurring', ft_recurring_executed: 'recurringExecuted',
  ft_portfolio_history: 'portfolioHistory', ft_budgets: 'budgets', ft_stock_history: 'stockHistory', ft_stock_transactions: 'stockTransactions',
  ft_stock_fee_discount: 'feeDiscount', ft_tech_params: 'techParameters', ft_dividend_events: 'dividendEvents', ft_dividend_scanned_at: 'dividendScannedAt',
};

export interface MigrationResult {
  snapshot: PortableFinancialData;
  metadata: BackupMetadata;
  migrationNotes: string[];
  ignoredSecretKeys: string[];
  ignoredUnknownKeys: string[];
  deduplicationCounts: Record<string, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T;
  return value;
}

function deduplicateStockTransactions(items: unknown[]): { items: unknown[]; removed: number } {
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (const item of items) {
    if (isRecord(item) && typeof item.id === 'string') {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    result.push(item);
  }
  return { items: result, removed: items.length - result.length };
}

export function migrateLegacyBackup(input: Record<string, unknown>): MigrationResult {
  const snapshot = createEmptyPortableData();
  const migratedKeys: string[] = [];
  for (const key of PORTABLE_STORAGE_KEYS) {
    if (Object.hasOwn(input, key)) {
      snapshot[LEGACY_KEY_MAP[key]] = cloneValue(input[key]) as never;
      migratedKeys.push(key);
    }
  }

  const extractedStockTransactions: unknown[] = [];
  if (Array.isArray(snapshot.assets)) {
    snapshot.assets = snapshot.assets.map((asset) => {
      if (!isRecord(asset)) return asset;
      const migratedAsset = cloneValue(asset);
      if (Array.isArray(migratedAsset.transactions)) {
        extractedStockTransactions.push(...migratedAsset.transactions);
        delete migratedAsset.transactions;
      }
      return migratedAsset as typeof asset;
    });
  }
  const stockTransactions = Array.isArray(snapshot.stockTransactions) ? snapshot.stockTransactions : [];
  const deduplicated = deduplicateStockTransactions([...stockTransactions, ...extractedStockTransactions]);
  if (Array.isArray(snapshot.stockTransactions)) snapshot.stockTransactions = deduplicated.items as typeof snapshot.stockTransactions;

  const legacyMetadata = isRecord(input.ft_metadata) ? input.ft_metadata : {};
  const metadata: BackupMetadata = {
    format: 'fintrack-ai-backup', schemaVersion: 1,
    appVersion: typeof legacyMetadata.appVersion === 'string' ? legacyMetadata.appVersion : 'legacy',
    createdAt: typeof legacyMetadata.createdAt === 'string'
      ? legacyMetadata.createdAt
      : typeof legacyMetadata.backupDate === 'string'
        ? legacyMetadata.backupDate
        : '1970-01-01T00:00:00.000Z',
  };
  const knownKeys = new Set<string>([...PORTABLE_STORAGE_KEYS, 'ft_metadata', ...SECRET_STORAGE_KEYS]);
  return {
    snapshot,
    metadata,
    migrationNotes: ['Migrated legacy flat backup.', ...(extractedStockTransactions.length > 0 ? ['Moved Asset.transactions to stockTransactions.'] : []), ...(migratedKeys.length === 0 ? ['Applied safe defaults for missing portable fields.'] : [])],
    ignoredSecretKeys: SECRET_STORAGE_KEYS.filter((key) => Object.hasOwn(input, key)),
    ignoredUnknownKeys: Object.keys(input).filter((key) => !knownKeys.has(key)),
    deduplicationCounts: { stockTransactions: deduplicated.removed },
  };
}
