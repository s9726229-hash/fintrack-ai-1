import { STORAGE_KEYS, UNSPECIFIED_STOCK_TRADE_TYPE } from '../../constants';
import { DEFAULT_TECH_PARAMS } from '../storage';
import type { TechParameters } from '../../types';
import type { PortableFinancialData } from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const TECH_PARAMETER_KEYS = Object.keys(DEFAULT_TECH_PARAMS) as (keyof TechParameters)[];

export function normalizeTechParameters(input: Record<string, unknown>): {
  value: TechParameters;
  ignoredKeys: string[];
} {
  const value = { ...DEFAULT_TECH_PARAMS } as Record<keyof TechParameters, unknown>;
  for (const key of TECH_PARAMETER_KEYS) {
    if (Object.hasOwn(input, key)) value[key] = input[key];
  }

  return {
    value: value as TechParameters,
    ignoredKeys: Object.keys(input)
      .filter((key) => !Object.hasOwn(DEFAULT_TECH_PARAMS, key))
      .sort(),
  };
}

export function normalizeHistoricalStockData(snapshot: PortableFinancialData): {
  value: PortableFinancialData;
  migrationNotes: string[];
} {
  let normalizedHistoryCount = 0;
  let normalizedTradeTypeCount = 0;

  const stockHistory = Array.isArray(snapshot.stockHistory)
    ? snapshot.stockHistory.map((item) => {
        if (!isRecord(item)) return item;
        const normalized = { ...item };
        let changed = false;
        if (!Object.hasOwn(item, 'totalUnrealizedPL') || item.totalUnrealizedPL === null) {
          normalized.totalUnrealizedPL = 0;
          changed = true;
        }
        if (!Object.hasOwn(item, 'positions') || item.positions === null) {
          normalized.positions = [];
          changed = true;
        }
        if (changed) normalizedHistoryCount += 1;
        return normalized;
      })
    : snapshot.stockHistory;

  const stockTransactions = Array.isArray(snapshot.stockTransactions)
    ? snapshot.stockTransactions.map((transaction) => {
        if (!isRecord(transaction)) return transaction;
        if (
          !Object.hasOwn(transaction, 'tradeType')
          || (typeof transaction.tradeType === 'string' && transaction.tradeType.trim() === '')
        ) {
          normalizedTradeTypeCount += 1;
          return { ...transaction, tradeType: UNSPECIFIED_STOCK_TRADE_TYPE };
        }
        return transaction;
      })
    : snapshot.stockTransactions;

  return {
    value: {
      ...snapshot,
      stockHistory: stockHistory as PortableFinancialData['stockHistory'],
      stockTransactions: stockTransactions as PortableFinancialData['stockTransactions'],
    },
    migrationNotes: [
      ...(normalizedHistoryCount > 0
        ? [`已補齊 ${normalizedHistoryCount} 筆舊版股票歷史資料。`]
        : []),
      ...(normalizedTradeTypeCount > 0
        ? [`已將 ${normalizedTradeTypeCount} 筆空白交易種類標記為「${UNSPECIFIED_STOCK_TRADE_TYPE}」。`]
        : []),
    ],
  };
}

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
  const storedTechParameters = readJson<unknown>(storage, STORAGE_KEYS.TECH_PARAMS, {});
  const snapshot: PortableFinancialData = {
    assets: readJson(storage, STORAGE_KEYS.ASSETS, defaults.assets), transactions: readJson(storage, STORAGE_KEYS.TRANSACTIONS, defaults.transactions),
    recurring: readJson(storage, STORAGE_KEYS.RECURRING, defaults.recurring), recurringExecuted: readJson(storage, STORAGE_KEYS.RECURRING_EXECUTED, defaults.recurringExecuted),
    portfolioHistory: readJson(storage, STORAGE_KEYS.HISTORY, defaults.portfolioHistory), budgets: readJson(storage, STORAGE_KEYS.BUDGETS, defaults.budgets),
    stockHistory: readJson(storage, STORAGE_KEYS.STOCK_HISTORY, defaults.stockHistory), stockTransactions: readJson(storage, STORAGE_KEYS.STOCK_TRANSACTIONS, defaults.stockTransactions),
    feeDiscount: Number.isFinite(discount) ? discount : 0.28,
    techParameters: isRecord(storedTechParameters)
      ? normalizeTechParameters(storedTechParameters).value
      : defaults.techParameters,
    dividendEvents: readJson(storage, STORAGE_KEYS.DIVIDEND_EVENTS, defaults.dividendEvents), dividendScannedAt: readJson(storage, STORAGE_KEYS.DIVIDEND_SCANNED_AT, defaults.dividendScannedAt),
  };
  return normalizeHistoricalStockData(snapshot).value;
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
