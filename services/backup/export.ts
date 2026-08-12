import { APP_VERSION } from '../appVersion';
import type { BackupEnvelope, PortableFinancialData } from './model';

export function createBackupEnvelope(snapshot: PortableFinancialData, createdAt: string): BackupEnvelope {
  return { metadata: { format: 'fintrack-ai-backup', schemaVersion: 1, appVersion: APP_VERSION, createdAt }, data: snapshot };
}

export function serializeBackup(envelope: BackupEnvelope): string { return JSON.stringify(envelope, null, 2); }
