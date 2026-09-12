import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DividendReceiptModal } from './DividendReceiptModal';

afterEach(cleanup);
const events = [{ key: '2330-2026-08-01', symbol: '2330', name: '台積電', exDate: '2026-08-01', paymentDate: '2026-09-01', amount: 1000 }];
it('requires confirmation and records the edited receipt, not the estimate', () => {
  const save = vi.fn();
  render(<DividendReceiptModal events={events} onClose={() => {}} onConfirm={save} />);
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('台積電 實收金額'), { target: { value: '980' } });
  fireEvent.change(screen.getByLabelText('台積電 實收日期'), { target: { value: '2026-09-02' } });
  fireEvent.click(screen.getByRole('button', { name: '確認已收到並入帳' }));
  expect(save).toHaveBeenCalledWith([expect.objectContaining({ id: 'dividend:2330:2026-08-01', amount: 980, date: '2026-09-02', type: 'DIVIDEND' })]);
});
it('rejects invalid amounts and keeps the form when saving fails', () => {
  const save = vi.fn(() => { throw new Error('storage full'); });
  render(<DividendReceiptModal events={events} onClose={() => {}} onConfirm={save} />);
  fireEvent.change(screen.getByLabelText('台積電 實收金額'), { target: { value: '-1' } });
  fireEvent.click(screen.getByRole('button', { name: '確認已收到並入帳' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('金額');
  fireEvent.change(screen.getByLabelText('台積電 實收金額'), { target: { value: '980' } });
  fireEvent.click(screen.getByRole('button', { name: '確認已收到並入帳' }));
  expect(screen.getByRole('alert')).toHaveTextContent('儲存失敗');
});
