import { expect, it } from 'vitest';
import { createEmptyPortableData } from './snapshot';
import { createBackupEnvelope, serializeBackup } from './export';
import { parseBackupJson } from './parse';

it('round-trips recurring lifecycle and actual dividend receipts without device metadata', () => {
  const snapshot = createEmptyPortableData();
  snapshot.recurring = [ { id: 'r', name: '保費', amount: 100, category: '醫療', type: 'EXPENSE', frequency: 'YEARLY', monthOfYear: 1, dayOfMonth: 1, status: 'ENDED' } ];
  snapshot.recurringExecuted = { r: ['2026'] };
  snapshot.transactions = [{ id: 'dividend:2330:2026-08-01', date: '2026-09-02', amount: 980, type: 'DIVIDEND', category: '股息', item: '台積電 股息' }];
  const raw = serializeBackup(createBackupEnvelope(snapshot, '2026-09-10T00:00:00Z'));
  const parsed = parseBackupJson(raw);
  expect(parsed).toMatchObject({ ok: true, parsed: { snapshot: { recurring: snapshot.recurring, recurringExecuted: snapshot.recurringExecuted, transactions: snapshot.transactions } } });
  expect(raw).not.toContain('ft_backup_status');
});
it('rejects invalid recurring lifecycle instead of silently activating it', () => {
  const snapshot = createEmptyPortableData();
  const envelope = createBackupEnvelope(snapshot, '2026-09-10T00:00:00Z');
  const raw = JSON.stringify({ ...envelope, data: { ...snapshot, recurring: [{ id: 'r', name: 'rent', amount: 100, category: 'home', type: 'EXPENSE', frequency: 'MONTHLY', dayOfMonth: 1, status: 'TYPO' }] } });
  expect(parseBackupJson(raw)).toMatchObject({ ok: false, errors: [expect.objectContaining({ path: 'data.recurring[0].status' })] });
});
