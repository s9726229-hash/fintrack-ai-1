import type { Asset, BudgetConfig, DividendEvent, PortfolioSnapshot, RecurringItem, StockSnapshot, StockTransaction, TechParameters, Transaction } from '../../types';

export interface BackupMetadata { format: 'fintrack-ai-backup'; schemaVersion: number; appVersion: string; createdAt: string; }
export interface PortableFinancialData {
  assets: Asset[]; transactions: Transaction[]; recurring: RecurringItem[]; recurringExecuted: Record<string, string[]>;
  portfolioHistory: PortfolioSnapshot[]; budgets: BudgetConfig[]; stockHistory: StockSnapshot[]; stockTransactions: StockTransaction[];
  feeDiscount: number; techParameters: TechParameters; dividendEvents: Record<string, DividendEvent[]>; dividendScannedAt: Record<string, number>;
}
export interface BackupEnvelope { metadata: BackupMetadata; data: PortableFinancialData; }
export interface BackupDiagnostic { path: string; code: string; message: string; }
export interface ParsedBackup {
  snapshot: PortableFinancialData; metadata: BackupMetadata; migrationNotes: string[]; ignoredSecretKeys: string[];
  ignoredUnknownKeys: string[]; deduplicationCounts: Record<string, number>;
}
export interface BackupPreviewRow { key: string; label: string; before: number; after: number; delta: number; reset: boolean; }
export interface BackupPreview {
  metadata: BackupMetadata; rows: BackupPreviewRow[]; migrationNotes: string[]; deduplicationCounts: Record<string, number>;
  ignoredSecretKeys: string[]; ignoredUnknownKeys: string[];
}
export interface ImportRecoveryJournal {
  id: string; startedAt: string; schemaVersion: number; status: 'prepared' | 'writing' | 'verified';
  previousSnapshot: PortableFinancialData; targetDigest: string;
}
