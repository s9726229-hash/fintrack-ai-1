export enum Currency {
  TWD = 'TWD',
  USD = 'USD',
  JPY = 'JPY',
  CNY = 'CNY',
  EUR = 'EUR',
  AUD = 'AUD',
}

export enum AssetType {
  CASH = 'CASH',
  STOCK = 'STOCK',
  FUND = 'FUND',
  REAL_ESTATE = 'REAL_ESTATE',
  CRYPTO = 'CRYPTO',
  DEBT = 'DEBT',
  OTHER = 'OTHER',
}

export interface StockTransaction {
  id: string;
  date: string; // YYYY-MM-DD from '成交日期'
  symbol: string; // from '股票代號'
  name?: string; // from '股票名稱'
  side: 'BUY' | 'SELL'; // from '買賣別'
  tradeType: string; // from '交易種類' e.g. '普通', '盤中零股'
  shares: number; // from '成交數量'
  price: number; // from '成交價'
  fees: number; // sum of 手續費 + 交易稅 + 二代健保補充費
  realizedProfit?: number; // from '損益', only for sells
  amount: number; // 應收付帳款
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  amount: number; // TWD Equivalent Value
  originalAmount?: number; // Value in original currency
  currency: Currency;
  exchangeRate: number; // To TWD
  lastUpdated: number; // Timestamp
  
  // Debt specific
  startDate?: string; // YYYY-MM-DD (New V5.2)
  interestRate?: number;
  termYears?: number;
  paidYears?: number; // Deprecated in favor of startDate calculation, but kept for compatibility
  interestOnlyPeriod?: number; // Grace period in years (New V5.2)

  // --- Stock Specific ---
  symbol?: string;
  shares?: number;
  avgCost?: number;
  currentPrice?: number;
  ma20?: number; // 20MA
  stockCategory?: string; // e.g., 'ETF', '半導體'
  yield?: number; // Dividend yield %
  isEtf?: boolean;
  dividendPerShare?: number; // 每股配息
  paymentDate?: string; // 發放日
  isDividendRecorded?: boolean; // 標記該期股利是否已入帳
  
  // --- V6.9.0 Dividend Dashboard ---
  dividendFrequency?: string; // e.g., 'Quarterly', 'Annual'
  exDate?: string; // 除息日

  // --- V7.1.0 Technical Monitor ---
  rsi?: number;
  volumeRatio?: number;
  techScore?: number;
  techSignal?: 'STRONG_BUY' | 'BUY' | 'PARTIAL_SELL' | 'FORCE_SELL' | 'STOP_LOSS' | 'NONE' | 'ADDITIONAL_BUY' | 'STRONG_ADDITIONAL_BUY' | 'SECOND_PARTIAL_SELL' | 'TREND_ADD' | 'FINAL_ADD' | 'STOP_LOSS_ALERT';
  biasSlopes?: number[]; // Index 0: today's slope, 1: yesterday's, 2: day before yesterday
  ma20Slope?: number;
  ma60?: number;
  marginChangeRatio?: number;
  sizeCategory?: 'LARGE_CAP' | 'SMALL_CAP' | 'ETF' | 'UNKNOWN';
}

export interface StockPosition {
    id: string;
    name?: string;
    symbol?: string;
    shares?: number;
    avgCost?: number;
    currentPrice?: number;
    marketValue?: number;
    unrealizedPL?: number;
    unrealizedPLPercent?: number;
}

export interface TechParameters {
    // ETF
    etfBuyBias: number;
    etfStrongBuyBias: number;
    etfAdditionalBuyBias: number;
    etfStrongAdditionalBuyBias: number;
    etfBuyRsi: number;
    etfStrongBuyRsi: number;
    etfPartialSellBias: number;
    etfSecondPartialSellBias: number;
    etfBuySlopeDays: number;           // 新增：買進所需斜率連增天數
    etfStrongBuySlopeDays: number;     // 新增：強力買進所需斜率連增天數

    // 大型股
    largeCapBuyBias: number;
    largeCapStrongBuyBias: number;
    largeCapBuyRsi: number;
    largeCapStrongBuyRsi: number;
    largeCapPartialSellBias: number;
    largeCapForceSellBias: number;
    largeCapStopLossBias: number;
    largeCapBuySlopeDays: number;             // 新增：買進所需斜率連增天數
    largeCapStrongBuySlopeDays: number;       // 新增：強力買進所需斜率連增天數
    largeCapTrendAddCoolDownDays: number;     // 新增：順勢加碼冷卻天數

    // 小型股
    smallCapBuyBias: number;
    smallCapStrongBuyBias: number;
    smallCapBuyRsi: number;
    smallCapStrongBuyRsi: number;
    smallCapPartialSellBias: number;
    smallCapForceSellBias: number;
    smallCapStopLossBias: number;
    smallCapBuySlopeDays: number;             // 新增：買進所需斜率連增天數
    smallCapStrongBuySlopeDays: number;       // 新增：強力買進所需斜率連增天數
    smallCapTrendAddCoolDownDays: number;     // 新增：順勢加碼冷卻天數
}

export enum MarketRegime {
    NORMAL = 'NORMAL',
    CONSERVATIVE = 'CONSERVATIVE',
    DEFENSIVE = 'DEFENSIVE',
}

export interface RiskAlerts {
    stopLossAlert: boolean; // Bias20 繼續惡化 -5% 或達到停損門檻
    conservativeLock: boolean; // 連續3筆虧損鎖定
}

export interface TechDataResult {
    ma20: number | null;
    ma60: number | null;
    rsi: number | null;
    volumeRatio: number | null;
    biasSlopes: number[];
    ma20Slope: number | null;
    marginChangeRatio: number | null;
    sizeCategory: 'LARGE_CAP' | 'SMALL_CAP' | 'ETF' | 'UNKNOWN';
    techScore: number;
    techSignal: 'STRONG_BUY' | 'BUY' | 'PARTIAL_SELL' | 'FORCE_SELL' | 'STOP_LOSS' | 'NONE' | 'ADDITIONAL_BUY' | 'STRONG_ADDITIONAL_BUY' | 'SECOND_PARTIAL_SELL' | 'TREND_ADD' | 'FINAL_ADD' | 'STOP_LOSS_ALERT';
    currentPrice?: number;
    marketRegime?: MarketRegime;
    riskAlerts?: RiskAlerts;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  item: string;
  note?: string;
  type: 'EXPENSE' | 'INCOME' | 'DIVIDEND';
  invoiceId?: string; // 電子發票號碼
  source?: 'MANUAL' | 'AI_VOICE' | 'INVOICE_CSV'; // 資料來源 (Removed unused CSV/AI_STOCK)
}

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'EXPENSE' | 'INCOME';
  frequency: 'MONTHLY' | 'YEARLY';
  dayOfMonth: number; // 1-31
  monthOfYear?: number; // 1-12, for YEARLY
}

export interface BudgetConfig {
  category: string;
  limit: number;
}

export interface PurchaseAssessment {
  score: number; // 0-100 (100 is safe)
  status: 'SAFE' | 'WARNING' | 'DANGER';
  analysis: string;
  impactOnCashFlow: string;
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetDistribution: Record<AssetType, number>;
}

export interface StockSnapshot {
  date: string; // YYYY-MM-DD
  totalMarketValue: number;
  totalUnrealizedPL: number;
  positions: {
    symbol: string;
    marketValue: number;
  }[];
}

export interface StockPerformanceResult {
  totalCost: number;
  marketValue: number;
  estimatedReturn: number;
  netProfit: number;
  roi: number;
  buyFee: number;
  sellFee: number;
  tax: number;
  totalDividends: number; // V6.8.0: 累積股利收益
}

export interface AIReportData {
  healthScore: number;
  cashFlowForecast: {
    yearLabel: string;
    monthlyFixedCost: number;
    monthlyIncome: number;
    debtToIncomeRatio: number;
    isGracePeriodEnded: boolean;
  }[];
  debtAnalysis: {
    name: string;
    status: string;
    suggestion: string;
  }[];
  summary: string;
  investmentSuggestions?: {
    symbol: string;
    suggestion: 'HOLD' | 'SELL' | 'BUY_MORE';
    reason: string;
  }[];
}

export interface GoogleSyncConfig {
    clientId: string;
    lastSynced?: number;
}

export interface WatchlistGroup {
    id: string;
    name: string;
    symbols: string[];
}

export interface LocalStorageData {
  ft_assets: Asset[];
  ft_transactions: Transaction[];
  ft_recurring: RecurringItem[];
  ft_recurring_executed: Record<string, string[]>;
  ft_portfolio_history: PortfolioSnapshot[];
  ft_budgets: BudgetConfig[]; // New V5.2
  ft_api_key: string;
  ft_google_client_id: string; // New Cloud Sync
  ft_stock_history: StockSnapshot[]; // New V5.9.3
  ft_stock_transactions: StockTransaction[]; // New V6.3.0
  ft_stock_fee_discount: number; // New V5.9.3
  ft_watchlists: WatchlistGroup[]; // New V5
}

export type ViewState = 'DASHBOARD' | 'ASSETS' | 'TRANSACTIONS' | 'RECURRING' | 'BUDGET' | 'GUIDE' | 'HISTORY' | 'SETTINGS' | 'INVESTMENTS' | 'TECH_DOCS' | 'WATCHLIST';

export type ApiKeyStatus = 'unchecked' | 'valid' | 'invalid' | 'verifying';

export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}