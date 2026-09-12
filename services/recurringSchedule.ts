import type { RecurringItem, Transaction } from '../types';

export const isRecurringActive = (item: RecurringItem) => item.status === undefined || item.status === 'ACTIVE';

export const localMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export function recurringPeriod(item: RecurringItem, today = new Date()) {
  const year = today.getFullYear();
  const month = item.frequency === 'YEARLY' ? (item.monthOfYear ?? 1) : today.getMonth() + 1;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(item.dayOfMonth) || item.dayOfMonth < 1 || item.dayOfMonth > 31) return null;
  const day = Math.min(item.dayOfMonth, new Date(year, month, 0).getDate());
  return {
    key: item.frequency === 'YEARLY' ? String(year) : localMonthKey(today),
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    due: new Date(year, month - 1, day) <= today,
  };
}

export function wasRecurringExecuted(item: RecurringItem, logs: string[], today = new Date()) {
  const period = recurringPeriod(item, today);
  if (!period) return false;
  return logs.some(key => key === period.key || key === String(today.getFullYear()) || (item.frequency === 'YEARLY' && key.startsWith(`${period.key}-`)));
}

export function planRecurring(items: RecurringItem[], logs: Record<string, string[]>, transactions: Transaction[], today = new Date()) {
  const nextLog = { ...logs };
  const additions: Transaction[] = [];
  for (const item of items) {
    if (!isRecurringActive(item)) continue;
    const period = recurringPeriod(item, today);
    if (!period?.due || !Number.isFinite(item.amount) || item.amount <= 0 || wasRecurringExecuted(item, logs[item.id] ?? [], today)) continue;
    const id = `recurring:${item.id}:${period.key}`;
    // Stable IDs allow a retry after the transaction write succeeds but the log write fails.
    if (!transactions.some(transaction => transaction.id === id)) {
      additions.push({ id, date: period.date, amount: item.amount, category: item.category, item: `[固定] ${item.name}`, type: item.type, note: '系統自動入帳 (Auto-Executed)', source: 'MANUAL' });
    }
    nextLog[item.id] = [...(logs[item.id] ?? []), period.key];
  }
  return { additions, nextLog };
}
