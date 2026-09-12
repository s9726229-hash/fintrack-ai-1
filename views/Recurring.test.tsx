import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Recurring } from './Recurring';
import type { RecurringItem } from '../types';

afterEach(cleanup);
it('edits a recurring item in place and can pause, resume and end it', () => {
  function Harness() {
    const [items, setItems] = useState<RecurringItem[]>([{ id: 'rent', name: '租金', amount: 100, category: '居住', type: 'EXPENSE', frequency: 'MONTHLY', dayOfMonth: 1 }]);
    return <Recurring items={items} executedLog={{ rent: ['2026-09'] }} onAdd={item => setItems([...items, item])} onUpdate={item => setItems(items.map(old => old.id === item.id ? item : old))} onDelete={() => {}} onExecute={() => {}} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: '編輯 租金' }));
  fireEvent.change(screen.getByPlaceholderText('例如：Netflix、房貸、年繳保費...'), { target: { value: '新租金' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));
  expect(screen.getAllByText('新租金')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '暫停 新租金' }));
  expect(screen.getByText('已暫停')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '恢復 新租金' }));
  fireEvent.click(screen.getByRole('button', { name: '結束 新租金' }));
  expect(screen.getByText('已結束')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '恢復 新租金' })).not.toBeInTheDocument();
});
