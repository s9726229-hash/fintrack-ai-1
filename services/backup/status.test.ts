import { beforeEach, expect, it } from 'vitest';
import { readBackupStatus, recordBackup, needsBackupReminder, groupIgnoredFields } from './status';

beforeEach(() => localStorage.clear());
it('treats missing or corrupt metadata as needing a backup, and expires after seven days', () => {
  expect(needsBackupReminder(readBackupStatus(localStorage), new Date('2026-09-10T00:00:00Z'))).toBe(true);
  localStorage.setItem('ft_backup_status', 'broken');
  expect(readBackupStatus(localStorage)).toEqual({});
  recordBackup(localStorage, 'exportedAt', new Date('2026-09-03T00:00:00Z'));
  expect(needsBackupReminder(readBackupStatus(localStorage), new Date('2026-09-09T23:59:59Z'))).toBe(false);
  expect(needsBackupReminder(readBackupStatus(localStorage), new Date('2026-09-10T00:00:00Z'))).toBe(true);
});
it('keeps cloud and export timestamps separately and ignores future dates', () => {
  recordBackup(localStorage, 'exportedAt', new Date('2026-09-03T00:00:00Z'));
  recordBackup(localStorage, 'cloudAt', new Date('2026-09-08T00:00:00Z'));
  expect(readBackupStatus(localStorage)).toEqual({ exportedAt: '2026-09-03T00:00:00.000Z', cloudAt: '2026-09-08T00:00:00.000Z' });
  expect(needsBackupReminder({ cloudAt: '2099-01-01T00:00:00Z' }, new Date('2026-09-10T00:00:00Z'))).toBe(true);
});
it('separates device settings and retired technical parameters without hiding unknown keys', () => {
  expect(groupIgnoredFields(['ft_google_client_id', 'ft_tech_params.etfAdditionalBuyBias', 'data.techParameters.smallCapTrendAddRsiMax', 'ft_new_data'])).toEqual({
    device: ['ft_google_client_id'], retired: ['ft_tech_params.etfAdditionalBuyBias', 'data.techParameters.smallCapTrendAddRsiMax'], unknown: ['ft_new_data'],
  });
});
