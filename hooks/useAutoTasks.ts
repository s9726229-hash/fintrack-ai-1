import { useEffect } from 'react';
import { Transaction, RecurringItem } from '../types';
import * as storage from '../services/storage';
import { planRecurring } from '../services/recurringSchedule';

interface UseAutoTasksProps {
  enabled: boolean;
  transactions: Transaction[];
  recurring: RecurringItem[];
  recurringExecuted: Record<string, string[]>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setRecurringExecuted: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setToast: (toast: { message: string; count: number } | null) => void;
}

export function useAutoTasks({ enabled, transactions, recurring, recurringExecuted, setTransactions, setRecurringExecuted, setToast }: UseAutoTasksProps) {
  useEffect(() => {
    if (!enabled || recurring.length === 0) return;
    const currentTransactions = storage.getTransactions();
    const currentLog = storage.getRecurringExecuted();
    const { additions, nextLog } = planRecurring(recurring, currentLog, currentTransactions);
    if (JSON.stringify(nextLog) === JSON.stringify(currentLog)) return;
    try {
      // Stable IDs allow recovery when transaction persistence succeeds but logging fails.
      const updated = [...currentTransactions, ...additions];
      if (additions.length) storage.saveTransactions(updated);
      storage.saveRecurringExecuted(nextLog);
      setTransactions(updated);
      setRecurringExecuted(nextLog);
      if (additions.length) setToast({ message: `系統自動補入 ${additions.length} 筆固定帳務`, count: additions.length });
    } catch {
      setToast({ message: '固定帳務儲存未完成，請備份資料並檢查瀏覽器儲存空間。', count: 0 });
    }
  }, [enabled, recurring, recurringExecuted, transactions, setTransactions, setRecurringExecuted, setToast]);
}
