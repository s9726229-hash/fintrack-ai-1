import { afterEach, expect, it, vi } from 'vitest';
import { calculateLoanBalance } from './finance';
import { AssetType } from '../types';
afterEach(() => { vi.useRealTimers(); });
it('preserves zero-interest linear amortization and grace periods', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 15));
  const loan = { type: AssetType.DEBT, startDate: '2025-01-01', originalAmount: 120000, termYears: 10, interestRate: 0 };
  expect(calculateLoanBalance(loan)).toBe(108000);
  expect(calculateLoanBalance({ ...loan, interestOnlyPeriod: 2 })).toBe(120000);
  expect(calculateLoanBalance({ ...loan, interestRate: undefined })).toBeGreaterThan(108000);
});
