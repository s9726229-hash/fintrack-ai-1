import { STORAGE_KEYS } from '../constants';
import { Asset, Transaction, RecurringItem, PortfolioSnapshot, BudgetConfig, StockSnapshot, StockTransaction, DividendEvent } from '../types';

export const getAssets = (): Asset[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
  return data ? JSON.parse(data) : [];
};

export const saveAssets = (assets: Asset[]) => {
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const getRecurring = (): RecurringItem[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING);
  return data ? JSON.parse(data) : [];
};

export const saveRecurring = (items: RecurringItem[]) => {
  localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(items));
};

export const getRecurringExecuted = (): Record<string, string[]> => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING_EXECUTED);
  return data ? JSON.parse(data) : {};
};

export const saveRecurringExecuted = (data: Record<string, string[]>) => {
  localStorage.setItem(STORAGE_KEYS.RECURRING_EXECUTED, JSON.stringify(data));
};

export const getHistory = (): PortfolioSnapshot[] => {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
};

export const saveHistory = (history: PortfolioSnapshot[]) => {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const getBudgets = (): BudgetConfig[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
  return data ? JSON.parse(data) : [];
};

export const saveBudgets = (budgets: BudgetConfig[]) => {
  localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
};

// --- V5.9.3 Stock Module ---
export const getStockHistory = (): StockSnapshot[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STOCK_HISTORY);
    return data ? JSON.parse(data) : [];
};

export const saveStockHistory = (history: StockSnapshot[]) => {
    localStorage.setItem(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(history));
};

// --- V6.3.0 Stock Transaction Decoupling ---
export const getStockTransactions = (): StockTransaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STOCK_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
};

export const saveStockTransactions = (transactions: StockTransaction[]) => {
    localStorage.setItem(STORAGE_KEYS.STOCK_TRANSACTIONS, JSON.stringify(transactions));
};

export const getDividendEvents = (): Record<string, DividendEvent[]> => {
    const data = localStorage.getItem(STORAGE_KEYS.DIVIDEND_EVENTS);
    const parsed: Record<string, DividendEvent[]> = data ? JSON.parse(data) : {};
    // 讀取時依除息日去重（早期版本或 FinMind 重複資料列可能留下同一除息日兩筆紀錄），優先保留已標記入帳的那筆
    Object.keys(parsed).forEach(symbol => {
        const map = new Map<string, DividendEvent>();
        parsed[symbol].forEach(ev => {
            const existing = map.get(ev.exDate);
            if (existing?.recorded) return;
            map.set(ev.exDate, ev);
        });
        parsed[symbol] = Array.from(map.values());
    });
    return parsed;
};

export const saveDividendEvents = (events: Record<string, DividendEvent[]>) => {
    localStorage.setItem(STORAGE_KEYS.DIVIDEND_EVENTS, JSON.stringify(events));
};

export const getDividendScannedAt = (): Record<string, number> => {
    const data = localStorage.getItem(STORAGE_KEYS.DIVIDEND_SCANNED_AT);
    return data ? JSON.parse(data) : {};
};

export const saveDividendScannedAt = (scannedAt: Record<string, number>) => {
    localStorage.setItem(STORAGE_KEYS.DIVIDEND_SCANNED_AT, JSON.stringify(scannedAt));
};

export const getFeeDiscount = (): number => {
    const data = localStorage.getItem(STORAGE_KEYS.FEE_DISCOUNT);
    return data ? parseFloat(data) : 0.28; // Default to a common 2.8折
};

export const saveFeeDiscount = (discount: number) => {
    localStorage.setItem(STORAGE_KEYS.FEE_DISCOUNT, discount.toString());
};

// --- V7.1.0 Tech Parameters ---
export const DEFAULT_TECH_PARAMS: import('../types').TechParameters = {
    etfBuyBias: -7,
    etfStrongBuyBias: -10,
    etfBuyRsi: 45,
    etfStrongBuyRsi: 40,
    etfPartialSellBias: 15,
    etfSecondPartialSellBias: 20,
    etfBuySlopeDays: 1,
    etfStrongBuySlopeDays: 2,
    etfPartialSellSlopeDays: 2,

    largeCapBuyBias: -7,
    largeCapStrongBuyBias: -10,
    largeCapBuyRsi: 45,
    largeCapStrongBuyRsi: 40,
    largeCapPartialSellBias: 20,
    largeCapForceSellBias: 25,
    largeCapStopLossBias: -20,
    largeCapStopLossPnL: -8,
    largeCapRiskAlertBias: -15,
    largeCapBuySlopeDays: 1,
    largeCapStrongBuySlopeDays: 2,
    largeCapPartialSellSlopeDays: 2,

    // 小型股預設
    smallCapBuyBias: -10,
    smallCapStrongBuyBias: -15,
    smallCapBuyRsi: 40,
    smallCapStrongBuyRsi: 35,
    smallCapPartialSellBias: 25,
    smallCapForceSellBias: 30,
    smallCapStopLossBias: -25,
    smallCapStopLossPnL: -10,
    smallCapRiskAlertBias: -18,
    smallCapBuySlopeDays: 2,
    smallCapStrongBuySlopeDays: 3,
    smallCapPartialSellSlopeDays: 2,

    // 籌碼面
    chipInstDays: 3,
    chipMarginDays: 5
};

export const getTechParameters = (): import('../types').TechParameters => {
    const data = localStorage.getItem(STORAGE_KEYS.TECH_PARAMS);
    if (data) {
        return { ...DEFAULT_TECH_PARAMS, ...JSON.parse(data) };
    }
    return DEFAULT_TECH_PARAMS;
};

export const saveTechParameters = (params: import('../types').TechParameters) => {
    localStorage.setItem(STORAGE_KEYS.TECH_PARAMS, JSON.stringify(params));
};

export const getApiKey = (): string => {
    return localStorage.getItem('ft_api_key') || '';
};

export const saveApiKey = (key: string) => {
    localStorage.setItem('ft_api_key', key);
};

export const getFinMindToken = (): string => {
    return localStorage.getItem('ft_finmind_token') || '';
};

export const saveFinMindToken = (token: string) => {
    localStorage.setItem('ft_finmind_token', token);
};

export const getGoogleClientId = (): string => {
    return localStorage.getItem('ft_google_client_id') || '';
};

export const saveGoogleClientId = (id: string) => {
    localStorage.setItem('ft_google_client_id', id);
};

export const downloadBackupFile = (fileContent: string, filename: string): void => {
  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const clearAllData = () => {
  localStorage.clear();
};
