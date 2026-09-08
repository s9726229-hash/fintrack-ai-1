import React from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAutoTasks } from './useAutoTasks';
import * as storage from '../services/storage';
import type { RecurringItem } from '../types';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
it('does not duplicate a due item in StrictMode or after an interrupted log write', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 9));
  const recurring: RecurringItem[] = [{ id: 'rent', name: '租金', category: '居住', amount: 100, type: 'EXPENSE', frequency: 'MONTHLY', dayOfMonth: 1 }];
  const props = { enabled: true, transactions: [], recurring, recurringExecuted: {}, setTransactions: vi.fn(), setRecurringExecuted: vi.fn(), setToast: vi.fn() };
  vi.spyOn(storage, 'saveRecurringExecuted').mockImplementationOnce(() => { throw new Error('quota'); });
  const first = renderHook(() => useAutoTasks(props), { wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode> });
  expect(storage.getTransactions()).toHaveLength(1);
  expect(storage.getRecurringExecuted().rent).toEqual(['2026-09']);
  first.unmount();
  renderHook(() => useAutoTasks(props));
  expect(storage.getTransactions()).toHaveLength(1);
});
