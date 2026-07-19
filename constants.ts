
export const STORAGE_KEYS = {
  ASSETS: 'ft_assets',
  TRANSACTIONS: 'ft_transactions',
  RECURRING: 'ft_recurring',
  RECURRING_EXECUTED: 'ft_recurring_executed',
  HISTORY: 'ft_portfolio_history',
  BUDGETS: 'ft_budgets', // New V5.2
  STOCK_HISTORY: 'ft_stock_history', // New V5.9.3
  STOCK_TRANSACTIONS: 'ft_stock_transactions', // New V6.3.0
  FEE_DISCOUNT: 'ft_stock_fee_discount', // New V5.9.3
  TECH_PARAMS: 'ft_tech_params', // New V7.1.0
  DIVIDEND_EVENTS: 'ft_dividend_events', // New V7.10.0: 股息事件（獨立於 Asset，全賣出後仍保留）
  DIVIDEND_SCANNED_AT: 'ft_dividend_scanned_at', // New V7.10.0: 各股票代號上次掃描股息的時間，用來降低重複掃描
};

export const EXCHANGE_RATES_DEFAULT = {
  TWD: 1,
  USD: 32.5,
  JPY: 0.21,
};

export const EXPENSE_CATEGORIES = [
  '餐飲', '交通', '娛樂', '購物', '居住', '帳單', '醫療', '教育', '家庭', '還款', '其他'
];

export const INCOME_CATEGORIES = [
  '薪資', '獎金', '股息', '兼職', '投資', '其他'
];

export const ASSET_TYPE_COLORS: Record<string, string> = {
  CASH: '#10b981', // Emerald
  STOCK: '#8b5cf6', // Violet
  FUND: '#ec4899', // Pink
  REAL_ESTATE: '#06b6d4', // Cyan
  CRYPTO: '#f59e0b', // Amber
  DEBT: '#ef4444', // Red
  OTHER: '#64748b', // Slate
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  CASH: '現金',
  STOCK: '股票',
  FUND: '基金',
  REAL_ESTATE: '房地產',
  CRYPTO: '加密貨幣',
  DEBT: '負債',
  OTHER: '其他',
};

// 溫暖親民風格（DESIGN_v2）專用分類色：淺底色 + 對應深色文字，僅供 warm 主題頁面（資產管理/股票投資）使用，
// 不影響既有 ASSET_TYPE_COLORS（Dashboard 圖表等深色頁面仍使用原色）。
export const ASSET_TYPE_WARM_COLORS: Record<string, { text: string; bg: string; bar: string }> = {
  CASH: { text: '#6B9080', bg: '#EAF1EC', bar: '#6B9080' },
  STOCK: { text: '#C86B6B', bg: '#FBEAEA', bar: '#C86B6B' },
  FUND: { text: '#C86B6B', bg: '#FBEAEA', bar: '#C86B6B' },
  REAL_ESTATE: { text: '#B08968', bg: '#F3ECDF', bar: '#B08968' },
  CRYPTO: { text: '#C08A3E', bg: '#F7EEDD', bar: '#C08A3E' },
  DEBT: { text: '#B45B45', bg: '#F6E4DE', bar: '#B45B45' },
  OTHER: { text: '#8A7A63', bg: '#F3ECDF', bar: '#8A7A63' },
};