import { STORAGE_KEYS } from '../../constants';
import { DEFAULT_TECH_PARAMS } from '../storage';
import type { PortableFinancialData } from './model';

function readJson<T>(storage: Storage, key: string, fallback: T): T {
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function createEmptyPortableData(): PortableFinancialData {
  return { assets: [], transactions: [], recurring: [], recurringExecuted: {}, portfolioHistory: [], budgets: [], stockHistory: [], stockTransactions: [], feeDiscount: 0.28, techParameters: { ...DEFAULT_TECH_PARAMS }, dividendEvents: {}, dividendScannedAt: {} };
}

export function readPortableSnapshot(storage: Storage): PortableFinancialData {
  const defaults = createEmptyPortableData();
  const discount = Number.parseFloat(storage.getItem(STORAGE_KEYS.FEE_DISCOUNT) ?? '');
  const storedTechParameters = readJson(storage, STORAGE_KEYS.TECH_PARAMS, {});
  return {
    assets: readJson(storage, STORAGE_KEYS.ASSETS, defaults.assets), transactions: readJson(storage, STORAGE_KEYS.TRANSACTIONS, defaults.transactions),
    recurring: readJson(storage, STORAGE_KEYS.RECURRING, defaults.recurring), recurringExecuted: readJson(storage, STORAGE_KEYS.RECURRING_EXECUTED, defaults.recurringExecuted),
    portfolioHistory: readJson(storage, STORAGE_KEYS.HISTORY, defaults.portfolioHistory), budgets: readJson(storage, STORAGE_KEYS.BUDGETS, defaults.budgets),
    stockHistory: readJson(storage, STORAGE_KEYS.STOCK_HISTORY, defaults.stockHistory), stockTransactions: readJson(storage, STORAGE_KEYS.STOCK_TRANSACTIONS, defaults.stockTransactions),
    feeDiscount: Number.isFinite(discount) ? discount : 0.28, techParameters: { ...defaults.techParameters, ...storedTechParameters },
    dividendEvents: readJson(storage, STORAGE_KEYS.DIVIDEND_EVENTS, defaults.dividendEvents), dividendScannedAt: readJson(storage, STORAGE_KEYS.DIVIDEND_SCANNED_AT, defaults.dividendScannedAt),
  };
}

export function writePortableSnapshot(storage: Storage, snapshot: PortableFinancialData): void {
  storage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(snapshot.assets));
  storage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(snapshot.transactions));
  storage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(snapshot.recurring));
  storage.setItem(STORAGE_KEYS.RECURRING_EXECUTED, JSON.stringify(snapshot.recurringExecuted));
  storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(snapshot.portfolioHistory));
  storage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(snapshot.budgets));
  storage.setItem(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(snapshot.stockHistory));
  storage.setItem(STORAGE_KEYS.STOCK_TRANSACTIONS, JSON.stringify(snapshot.stockTransactions));
  storage.setItem(STORAGE_KEYS.FEE_DISCOUNT, String(snapshot.feeDiscount));
  storage.setItem(STORAGE_KEYS.TECH_PARAMS, JSON.stringify(snapshot.techParameters));
  storage.setItem(STORAGE_KEYS.DIVIDEND_EVENTS, JSON.stringify(snapshot.dividendEvents));
  storage.setItem(STORAGE_KEYS.DIVIDEND_SCANNED_AT, JSON.stringify(snapshot.dividendScannedAt));
}
