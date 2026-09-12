import React, { useRef, useState } from 'react';
import { Button, Input, Modal } from '../ui';
import type { Transaction } from '../../types';

export interface DividendReceipt {
  key: string; symbol: string; name: string; exDate: string; paymentDate?: string; amount: number;
}

export function DividendReceiptModal({ events, onClose, onConfirm }: {
  events: DividendReceipt[]; onClose: () => void; onConfirm: (transactions: Transaction[]) => void;
}) {
  const [rows, setRows] = useState(() => events.map(event => ({ ...event, receivedAmount: String(event.amount), receivedDate: event.paymentDate || '' })));
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const update = (key: string, patch: { receivedAmount?: string; receivedDate?: string }) => setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row));
  const confirm = () => {
    if (submitted.current) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (const row of rows) {
      const amount = Number(row.receivedAmount);
      const date = new Date(`${row.receivedDate}T00:00:00Z`);
      if (!row.receivedAmount.trim() || !Number.isFinite(amount) || amount <= 0) { setError('實收金額必須為正數。'); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.receivedDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== row.receivedDate || row.receivedDate > today || row.receivedDate < row.exDate) {
        setError('請填寫有效的實收日期，不能早於除息日或晚於今天。'); return;
      }
    }
    try {
      submitted.current = true;
      onConfirm(rows.map(row => ({ id: `dividend:${row.symbol}:${row.exDate}`, date: row.receivedDate, amount: Number(row.receivedAmount), category: '股息', item: `${row.name} 股息`, type: 'DIVIDEND', source: 'MANUAL', note: `實收確認；${row.symbol} 除息日 ${row.exDate}` })));
      onClose();
    } catch {
      submitted.current = false;
      setError('儲存失敗，請保留此畫面並重試。');
    }
  };
  return <Modal isOpen onClose={onClose} title="確認股息實收" theme="warm">
    <p className="text-sm text-[#8A7A63] mb-4">預估金額可能未扣除費用。請依實際收到的金額與日期確認；尚未收到的股息請取消並取消勾選。</p>
    <div className="space-y-4">{rows.map(row => <div key={row.key} className="p-3 border border-[#EDE4D6] rounded-xl">
      <p className="font-bold text-[#3D3428]">{row.name}（{row.symbol}）</p>
      <p className="text-xs text-[#8A7A63] mb-2">除息 {row.exDate} · 預估 ${row.amount.toLocaleString()}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs text-[#8A7A63]">實收金額<Input theme="warm" aria-label={`${row.name} 實收金額`} type="number" min="0.01" step="0.01" value={row.receivedAmount} onChange={e => update(row.key, { receivedAmount: e.target.value })} /></label>
        <label className="text-xs text-[#8A7A63]">實收日期<Input theme="warm" aria-label={`${row.name} 實收日期`} type="date" value={row.receivedDate} onChange={e => update(row.key, { receivedDate: e.target.value })} /></label>
      </div>
    </div>)}</div>
    {error && <p role="alert" className="text-red-700 text-sm mt-3">{error}</p>}
    <Button theme="warm" className="w-full mt-4" onClick={confirm}>確認已收到並入帳</Button>
  </Modal>;
}
