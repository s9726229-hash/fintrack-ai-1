import { describe, expect, it } from 'vitest';
import type { RecurringItem } from '../types';
import { localMonthKey, planRecurring } from './recurringSchedule';

const item: RecurringItem = { id: 'rent', name: '租金', amount: 100, category: '居住', type: 'EXPENSE', frequency: 'MONTHLY', dayOfMonth: 31 };
describe('recurring periods', () => {
  it('clamps month-end in both leap and ordinary February', () => {
    expect(planRecurring([item], {}, [], new Date(2026, 1, 28)).additions[0].date).toBe('2026-02-28');
    expect(planRecurring([item], {}, [], new Date(2024, 1, 29)).additions[0].date).toBe('2024-02-29');
    expect(planRecurring([item], {}, [], new Date(2026, 1, 27)).additions).toEqual([]);
  });
  it('recognizes legacy annual logs across later months, but not next year', () => {
    const annual = { ...item, frequency: 'YEARLY' as const, monthOfYear: 7 };
    expect(planRecurring([annual], { rent: ['2026-07'] }, [], new Date(2026, 8, 9)).additions).toEqual([]);
    expect(planRecurring([annual], { rent: ['2026-07'] }, [], new Date(2027, 8, 9)).additions).toHaveLength(1);
  });
  it('uses local month and retries interrupted logging without duplicating transactions', () => {
    const today = new Date(2026, 8, 1);
    expect(localMonthKey(today)).toBe('2026-09');
    const dueItem = { ...item, dayOfMonth: 1 };
    const first = planRecurring([dueItem], {}, [], today);
    const retry = planRecurring([dueItem], {}, first.additions, today);
    expect(retry.additions).toEqual([]);
    expect(retry.nextLog.rent).toEqual(['2026-09']);
    expect(planRecurring([dueItem], first.nextLog, first.additions, today).additions).toEqual([]);
  });
});
