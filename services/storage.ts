import { STORAGE_KEYS } from '../constants';
import { Asset, Transaction, RecurringItem, PortfolioSnapshot, BudgetConfig, StockSnapshot, StockTransaction } from '../types';

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

export const getFeeDiscount = (): number => {
    const data = localStorage.getItem(STORAGE_KEYS.FEE_DISCOUNT);
    return data ? parseFloat(data) : 0.28; // Default to a common 2.8折
};

export const saveFeeDiscount = (discount: number) => {
    localStorage.setItem(STORAGE_KEYS.FEE_DISCOUNT, discount.toString());
};

export const getWatchlists = (): import('../types').WatchlistGroup[] => {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLISTS);
    if (data) {
        return JSON.parse(data);
    }
    // Default watchlist if empty
    return [
        { id: 'default', name: '自選股', symbols: [] }
    ];
};

export const saveWatchlists = (watchlists: import('../types').WatchlistGroup[]) => {
    localStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));
};

// --- V7.1.0 Tech Parameters ---
export const DEFAULT_TECH_PARAMS: import('../types').TechParameters = {
    etfBuyBias: -7,
    etfStrongBuyBias: -10,
    etfAdditionalBuyBias: -15,
    etfStrongAdditionalBuyBias: -20,
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
    largeCapTrendAddCoolDownDays: 5,
    largeCapTrendAddBiasMin: -10,
    largeCapTrendAddBiasMax: 0,
    largeCapTrendAddRsiMin: 40,
    largeCapTrendAddRsiMax: 65,

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
    smallCapTrendAddCoolDownDays: 5,
    smallCapTrendAddBiasMin: -15,
    smallCapTrendAddBiasMax: 0,
    smallCapTrendAddRsiMin: 40,
    smallCapTrendAddRsiMax: 60,

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
// ------------------------

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

export const getFullDataJson = () => {
    const data = {
        ft_metadata: {
            backupDate: new Date().toISOString(),
            appVersion: '7.6.6',
        },
        [STORAGE_KEYS.ASSETS]: getAssets(),
        [STORAGE_KEYS.TRANSACTIONS]: getTransactions(),
        [STORAGE_KEYS.RECURRING]: getRecurring(),
        [STORAGE_KEYS.RECURRING_EXECUTED]: getRecurringExecuted(),
        [STORAGE_KEYS.HISTORY]: getHistory(),
        [STORAGE_KEYS.BUDGETS]: getBudgets(),
        [STORAGE_KEYS.STOCK_HISTORY]: getStockHistory(),
        [STORAGE_KEYS.STOCK_TRANSACTIONS]: getStockTransactions(),
        [STORAGE_KEYS.WATCHLISTS]: getWatchlists(),
        [STORAGE_KEYS.TECH_PARAMS]: getTechParameters(),
        'ft_api_key': getApiKey(), 
        'ft_finmind_token': getFinMindToken(),
        'ft_google_client_id': getGoogleClientId(),
        [STORAGE_KEYS.FEE_DISCOUNT]: getFeeDiscount(),
    };
    return JSON.stringify(data, null, 2);
};

export const exportData = () => {
  const json = getFullDataJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fintrack_ai_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importData = (jsonData: string) => {
  try {
    const data = JSON.parse(jsonData);
    let allStockTxs: StockTransaction[] = [];

    // 1. Handle new format first if it exists
    if (data[STORAGE_KEYS.STOCK_TRANSACTIONS]) {
        allStockTxs.push(...data[STORAGE_KEYS.STOCK_TRANSACTIONS]);
    }

    // 2. Handle old format (backward compatibility) and migrate
    if (data[STORAGE_KEYS.ASSETS]) {
        const migratedAssets = data[STORAGE_KEYS.ASSETS].map((asset: any) => {
            if (asset.transactions && Array.isArray(asset.transactions)) {
                allStockTxs.push(...asset.transactions);
                delete asset.transactions; // Clean the asset object
            }
            return asset;
        });
        saveAssets(migratedAssets);
    }
    
    // 3. Save the consolidated and de-duplicated transactions
    if (allStockTxs.length > 0) {
        const uniqueTxs = Array.from(new Map(allStockTxs.map(tx => [tx.id, tx])).values());
        saveStockTransactions(uniqueTxs);
    }

    // 4. Import other data as usual
    if (data[STORAGE_KEYS.TRANSACTIONS]) saveTransactions(data[STORAGE_KEYS.TRANSACTIONS]);
    if (data[STORAGE_KEYS.RECURRING]) saveRecurring(data[STORAGE_KEYS.RECURRING]);
    if (data[STORAGE_KEYS.RECURRING_EXECUTED]) saveRecurringExecuted(data[STORAGE_KEYS.RECURRING_EXECUTED]);
    if (data[STORAGE_KEYS.HISTORY]) saveHistory(data[STORAGE_KEYS.HISTORY]);
    if (data[STORAGE_KEYS.BUDGETS]) saveBudgets(data[STORAGE_KEYS.BUDGETS]);
    if (data[STORAGE_KEYS.STOCK_HISTORY]) saveStockHistory(data[STORAGE_KEYS.STOCK_HISTORY]);
    if (data[STORAGE_KEYS.WATCHLISTS]) saveWatchlists(data[STORAGE_KEYS.WATCHLISTS]);
    if (data[STORAGE_KEYS.TECH_PARAMS]) saveTechParameters(data[STORAGE_KEYS.TECH_PARAMS]);
    if (data['ft_api_key']) saveApiKey(data['ft_api_key']);
    if (data['ft_finmind_token']) saveFinMindToken(data['ft_finmind_token']);
    if (data['ft_google_client_id']) saveGoogleClientId(data['ft_google_client_id']);
    if (data[STORAGE_KEYS.FEE_DISCOUNT]) saveFeeDiscount(data[STORAGE_KEYS.FEE_DISCOUNT]);

    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};

export const clearAllData = () => {
  localStorage.clear();
};

export const getAutoTechUpdateEnabled = (): boolean => {
  return localStorage.getItem('auto_tech_update_enabled') === 'true';
};

export const setAutoTechUpdateEnabled = (enabled: boolean) => {
  localStorage.setItem('auto_tech_update_enabled', enabled.toString());
};