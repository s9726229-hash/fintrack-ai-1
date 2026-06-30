import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Currency, StockPerformanceResult, StockTransaction, Transaction, TechDataResult, MarketRegime, RiskAlerts, SignalHint } from "../types";
import { getApiKey, getFeeDiscount, getTechParameters, getFinMindToken } from "./storage";

const cleanJsonString = (text: string) => {
    if (!text) return "{}";
    // 移除 Markdown 標記 ```json 和 ```
    let clean = text.replace(/```json/g, "").replace(/```/g, "");
    return clean.trim();
};

const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("API Key is missing.");
    return new GoogleGenAI({ apiKey: key });
};

// ============================================================
// FinMind Session-Level Cache (一個 Session 只打一次 FinMind)
// ============================================================
const FINMIND_BASE = 'https://api.finmindtrade.com/api/v4/data';
const CF_WORKER = 'https://gentle-voice-bcca.s9726229.workers.dev';

// K線歷史快取 (symbol → close陣列，TTL 6小時)
const klineCache: Record<string, { closes: number[], timestamp: number }> = {};
const KLINE_TTL = 6 * 60 * 60 * 1000;

// 融資快取 (symbol → {today, prev}，TTL 6小時)
const marginCache: Record<string, { today: number, prev: number, timestamp: number }> = {};
const MARGIN_TTL = 6 * 60 * 60 * 1000;

// TAIEX 大盤快取 (TTL 1小時)
let taixCache: { closes: number[], timestamp: number } | null = null;
const TAIX_TTL = 60 * 60 * 1000;

// 上市/上櫃分類快取，一個 Session 只打一次 FinMind
let otcSymbolSet: Set<string> = new Set();
let etfSymbolSet: Set<string> = new Set();
let stockInfoLoaded = false;

/** 通用 FinMind fetch，自動帶 token（若有）*/
const finmindFetch = async (params: Record<string, string>): Promise<any[] | null> => {
    const token = getFinMindToken();
    const url = new URL(FINMIND_BASE);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    if (token) url.searchParams.set('token', token);
    try {
        const res = await fetch(url.toString());
        if (!res.ok) return null;
        const json = await res.json();
        return Array.isArray(json.data) && json.data.length > 0 ? json.data : null;
    } catch {
        return null;
    }
};

/** 上市/上櫃分類表載入中的 Promise（避免多檔股票同時觸發多次重複 FinMind 請求） */
let stockInfoLoadingPromise: Promise<void> | null = null;

/** 載入上市/上櫃分類表（symbol → otc 判斷），一個 Session 只成功打一次 FinMind；失敗則下次呼叫會重試 */
export const loadStockInfoMap = async (): Promise<void> => {
    if (stockInfoLoaded) return;
    if (stockInfoLoadingPromise) return stockInfoLoadingPromise; // 已有請求進行中，直接等它

    stockInfoLoadingPromise = (async () => {
        try {
            const data = await finmindFetch({ dataset: 'TaiwanStockInfo' });
            if (!data) return; // 不標記 loaded，下次呼叫會重試
            const otcSet = new Set<string>();
            const etfSet = new Set<string>();
            data.forEach((d: any) => {
                const t = (d.type || '').toLowerCase();
                const cat = (d.industry_category || '').toLowerCase();
                if (t.includes('otc') || t.includes('tpex')) otcSet.add(d.stock_id);
                if (cat.includes('etf')) etfSet.add(d.stock_id);
            });
            otcSymbolSet = otcSet;
            etfSymbolSet = etfSet;
            stockInfoLoaded = true; // 確認真的拿到資料才標記完成
        } catch { /* 失敗則不標記，下次呼叫會重試 */ }
        finally {
            stockInfoLoadingPromise = null; // 不論成敗都釋放鎖，允許之後重試
        }
    })();

    return stockInfoLoadingPromise;
};

/** 抓個股近90日K線（Session快取，一天只打一次 FinMind）*/
export const fetchFinMindHistory = async (symbol: string): Promise<number[] | null> => {
    const now = Date.now();
    if (klineCache[symbol] && (now - klineCache[symbol].timestamp < KLINE_TTL)) {
        return klineCache[symbol].closes;
    }
    const startDate = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await finmindFetch({ dataset: 'TaiwanStockPrice', data_id: symbol, start_date: startDate });
    if (!data) return null;
    const closes = data.map((d: any) => Number(d.close)).filter((v: number) => v > 0);
    if (closes.length === 0) return null;
    klineCache[symbol] = { closes, timestamp: now };
    return closes;
};

/** 抓 TAIEX 大盤近60日（Session快取，1小時TTL）*/
const fetchTAIEXHistory = async (): Promise<number[] | null> => {
    const now = Date.now();
    if (taixCache && (now - taixCache.timestamp < TAIX_TTL)) return taixCache.closes;
    const startDate = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await finmindFetch({ dataset: 'TaiwanStockPrice', data_id: 'TAIEX', start_date: startDate });
    if (!data) return null;
    const closes = data.map((d: any) => Number(d.close)).filter((v: number) => v > 0);
    if (closes.length === 0) return null;
    taixCache = { closes, timestamp: now };
    return closes;
};

/** 抓個股融資餘額 via FinMind（Session快取，6小時TTL）*/
const fetchFinMindMargin = async (symbol: string): Promise<{ today: number, prev: number } | null> => {
    const now = Date.now();
    if (marginCache[symbol] && (now - marginCache[symbol].timestamp < MARGIN_TTL)) {
        return { today: marginCache[symbol].today, prev: marginCache[symbol].prev };
    }
    const startDate = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await finmindFetch({
        dataset: 'TaiwanStockMarginPurchaseShortSale',
        data_id: symbol,
        start_date: startDate
    });
    if (!data || data.length < 2) return null;
    const sorted = data.sort((a: any, b: any) => a.date.localeCompare(b.date));
    const todayVal = Number(sorted[sorted.length - 1].MarginPurchaseTodayBalance) || 0;
    const prevVal = Number(sorted[sorted.length - 2].MarginPurchaseTodayBalance) || 0;
    marginCache[symbol] = { today: todayVal, prev: prevVal, timestamp: now };
    return { today: todayVal, prev: prevVal };
};

/**
 * Calculates detailed performance metrics for a single stock asset.
 * Follows precise Taiwanese stock market fee and tax rules.
 */
export const calculateStockPerformance = (stock: Asset, transactions: Transaction[] = []): StockPerformanceResult => {
    // 確保數值至少為 0，避免出現 NaN 或 -100% 的慘劇
    const shares = Number(stock.shares) || 0;
    const avgCost = Number(stock.avgCost) || 0;
    const currentPrice = Number(stock.currentPrice) || 0;

    let totalDividends = 0;
    if (stock.symbol && transactions.length > 0) {
        totalDividends = transactions
            .filter(t => t.type === 'DIVIDEND' && (t.item.includes(stock.symbol!) || t.note?.includes(stock.symbol!)))
            .reduce((sum, t) => sum + t.amount, 0);
    }

    // 增加一個防護：如果沒有買入成本或股數，損益不應計算
    if (shares === 0 || avgCost === 0) {
        return { totalCost: 0, marketValue: 0, estimatedReturn: 0, netProfit: 0, roi: 0, buyFee: 0, sellFee: 0, tax: 0, totalDividends };
    }
    
    const feeDiscount = getFeeDiscount();
    const feeRate = 0.001425;
    const minFee = 20;

    // Prefer the explicit boolean flag from AI, fallback to symbol check
    const isActuallyEtf = typeof stock.isEtf === 'boolean' ? stock.isEtf : (stock.symbol?.startsWith('00') || false);
    const taxRate = isActuallyEtf ? 0.001 : 0.003;

    // --- Calculation Logic ---
    const calculateFee = (price: number) => {
        const fee = Math.floor(price * shares * feeRate * feeDiscount);
        return fee < minFee ? minFee : fee;
    };

    const buyValue = avgCost * shares;
    const buyFee = calculateFee(avgCost);
    const totalCost = buyValue + buyFee;

    const marketValue = currentPrice * shares;
    const sellFee = calculateFee(currentPrice);
    const tax = Math.floor(marketValue * taxRate);

    const estimatedReturn = marketValue - sellFee - tax;
    const netProfit = estimatedReturn - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    
    return {
        totalCost,
        marketValue,
        estimatedReturn,
        netProfit,
        roi,
        buyFee,
        sellFee,
        tax,
        totalDividends,
    };
};

/**
 * [Fast Mode V7.0.1] Enriches a stock symbol with basic info like price.
 */
export const enrichStockBasicInfo = async (stock: Asset): Promise<Partial<Asset> | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: `Search "Taiwan stock ${stock.symbol} price Yahoo Finance TW". Find the current price and name. Return the NAME in Traditional Chinese (繁體中文). Do NOT use English. Return a single line of plain text in this exact format: PRICE:value, NAME:value. Example: PRICE:980, NAME:台積電`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text || '';
        const priceMatch = text.match(/PRICE:([\d.,]+)/);
        const nameMatch = text.match(/NAME:([^,]+)/);
        
        const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : '0';
        const price = parseFloat(priceStr);
        const name = nameMatch ? nameMatch[1].trim() : (stock.name || stock.symbol);

        if (price > 0) {
            return {
                name: name,
                currentPrice: price,
            };
        }
        console.warn(`Could not parse price for symbol ${stock.symbol} from response: "${text}"`);
        return null;
    } catch (error) {
        console.error(`Gemini basic info error for symbol ${stock.symbol}:`, error);
        return null;
    }
};

/**
 * [Deep Mode V7.0.0] Enriches a stock symbol with TTM dividend information.
 */
export const enrichStockDividendInfo = async (stock: Asset): Promise<Partial<Asset> | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: `Search "Stock ${stock.symbol} dividend history HiStock" or "Yahoo Finance TW". Find the Sum of Cash Dividends (現金股利) paid in the trailing 12 months. Ignore Stock Dividends (股票股利). Return a single line of plain text in this exact format: FREQUENCY:value, TTM_DPS:value, EX_DATE:value.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text || '';
        
        const freqMatch = text.match(/FREQUENCY:([^,]+)/);
        const dpsMatch = text.match(/TTM_DPS:([\d.]+)/);
        const exDateMatch = text.match(/EX_DATE:(\d{4}-\d{2}-\d{2})/);

        const dividendFrequency = freqMatch ? freqMatch[1].trim() : undefined;
        const dividendPerShare = dpsMatch ? parseFloat(dpsMatch[1]) : undefined;
        const exDate = exDateMatch ? exDateMatch[1].trim() : undefined;

        if (dividendPerShare !== undefined) {
            // Sanity Check: If calculated yield is > 20%, it's likely an error.
            if (stock.currentPrice && stock.currentPrice > 0) {
                const yieldCheck = dividendPerShare / stock.currentPrice;
                if (yieldCheck > 0.20) {
                    console.warn(`Sanity check failed for ${stock.symbol}: Calculated yield ${yieldCheck*100}% is abnormally high. Discarding dividend data.`);
                    return { dividendPerShare: 0, dividendFrequency: 'N/A' }; // Reset data
                }
            }

            return {
                dividendPerShare,
                dividendFrequency,
                exDate,
            };
        }
        
        console.warn(`Could not parse TTM dividend info for symbol ${stock.symbol} from response: "${text}"`);
        return null;

    } catch (error) {
        console.error(`Gemini dividend info error for symbol ${stock.symbol}:`, error);
        return null;
    }
};


/**
 * Parses free-text stock input into structured data using Gemini.
 * Example input: "2330 1張 600", "00878 5000股 22.5"
 */
export const parseStockInput = async (input: string): Promise<Partial<Asset>[] | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest', // Use Flash for speed
            contents: `
                Parse the following stock inventory text into a JSON array.
                Each line represents a stock position.
                Extract: symbol (string), shares (number, convert '張' to 1000 shares), avgCost (number).
                
                Input Text:
                "${input}"
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING },
                            shares: { type: Type.NUMBER },
                            avgCost: { type: Type.NUMBER }
                        },
                        required: ["symbol", "shares", "avgCost"]
                    }
                }
            }
        });

        let text = cleanJsonString(response.text ?? "");
        if (text === "{}") text = "[]"; // Handle empty default
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini parseStockInput error:", error);
        return null;
    }
};

/**
 * Parses a CSV string of Taiwanese stock brokerage transaction history.
 */
export const parseStockTransactionCSV = (csvText: string): { transactions: StockTransaction[], error: string | null } => {
  const transactions: StockTransaction[] = [];
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length < 2) return { transactions: [], error: "CSV 檔案是空的或缺少標題列 (Header)。" };
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const findColumnIndex = (keywords: string[]): number => {
    for (const keyword of keywords) { const index = headers.findIndex(header => header.includes(keyword)); if (index !== -1) return index; }
    return -1;
  };
  const columnMap = { date: findColumnIndex(['成交日期']), symbol: findColumnIndex(['股票代號']), name: findColumnIndex(['股票名稱', '商品名稱']), side: findColumnIndex(['買賣別', '買賣']), shares: findColumnIndex(['成交數量', '股數', '成交股數']), price: findColumnIndex(['成交價', '成交單價', '成交價格']), amount: findColumnIndex(['應收付帳款', '收付金額', '發生金額']), realizedProfit: findColumnIndex(['損益']), fee: findColumnIndex(['手續費']), tax: findColumnIndex(['交易稅']), };
  const requiredFields: { key: keyof typeof columnMap; name: string }[] = [ { key: 'date', name: '成交日期' }, { key: 'symbol', name: '股票代號' }, { key: 'side', name: '買賣別' }, { key: 'shares', name: '成交數量' }, { key: 'price', name: '成交價' }, { key: 'amount', name: '應收付帳款' }, ];
  const missingColumns = requiredFields.filter(field => columnMap[field.key] === -1);
  if (missingColumns.length > 0) { const missingNames = missingColumns.map(field => field.name); return { transactions: [], error: `CSV 檔案缺少必要的欄位，請檢查是否包含：${missingNames.join('、')}` }; }
  const cleanNumber = (str: string | undefined): number => { if (!str) return 0; const cleaned = str.replace(/"/g, '').replace(/,/g, ''); const num = parseFloat(cleaned); return isNaN(num) ? 0 : num; };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('小計') || line.includes('總計')) continue;
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    try {
      const symbol = parts[columnMap.symbol]?.trim().replace(/"/g, '');
      const dateStr = parts[columnMap.date]?.trim().replace(/"/g, '');
      if (!symbol || !dateStr || !dateStr.match(/^\d{4}\/?\d{2}\/?\d{2}/)) continue;
      const sideText = parts[columnMap.side].trim().replace(/"/g, '');
      const side: 'BUY' | 'SELL' = sideText.includes('買') ? 'BUY' : 'SELL';
      const fees = columnMap.fee !== -1 ? cleanNumber(parts[columnMap.fee]) : 0;
      const tax = columnMap.tax !== -1 ? cleanNumber(parts[columnMap.tax]) : 0;
      const totalFees = fees + tax;
      let realizedProfitValue: number | undefined = side === 'SELL' ? (columnMap.realizedProfit !== -1 ? cleanNumber(parts[columnMap.realizedProfit]) : 0) : 0;
      const stockName = columnMap.name !== -1 ? parts[columnMap.name]?.trim().replace(/"/g, '') : undefined;
      transactions.push({ id: crypto.randomUUID(), date: dateStr.replace(/\//g, '-'), symbol: symbol, name: stockName, side: side, tradeType: '', shares: cleanNumber(parts[columnMap.shares]), price: cleanNumber(parts[columnMap.price]), fees: totalFees, realizedProfit: realizedProfitValue, amount: cleanNumber(parts[columnMap.amount]), });
    } catch (error) { console.warn(`Skipping invalid row during CSV parse: ${line}`, error); }
  }
  return { transactions, error: null };
};

export const parseStockInventoryCSV = (csvText: string): { assets: Partial<Asset>[], error: string | null } => {
    const assets: Partial<Asset>[] = [];
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) return { assets: [], error: "CSV 檔案是空的或缺少標題列 (Header)。" };
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const findColumnIndex = (keywords: string[]): number => { for (const keyword of keywords) { const index = headers.findIndex(header => header.includes(keyword)); if (index !== -1) return index; } return -1; };
    const columnMap = { symbol: findColumnIndex(['股票代號']), name: findColumnIndex(['股票名稱']), shares: findColumnIndex(['合計庫存數量']), avgCost: findColumnIndex(['成本均價']), currentPrice: findColumnIndex(['現價']), };
    const requiredFields = ['symbol', 'name', 'shares', 'avgCost', 'currentPrice'];
    const missingColumns = requiredFields.filter(field => columnMap[field as keyof typeof columnMap] === -1);
    if (missingColumns.length > 0) return { assets: [], error: `CSV 缺少必要欄位: ${missingColumns.join(', ')}` };
    const cleanNumber = (str: string | undefined): number => { if (!str) return 0; const cleaned = str.replace(/"/g, '').replace(/,/g, ''); const num = parseFloat(cleaned); return isNaN(num) ? 0 : num; };
    const formatSymbol = (str: string | undefined): string => { if (!str) return ''; let cleaned = str.replace(/"/g, '').trim(); const dotIndex = cleaned.indexOf('.'); if (dotIndex !== -1) cleaned = cleaned.substring(0, dotIndex); return cleaned; };
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]; const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        try {
            const symbol = formatSymbol(parts[columnMap.symbol]); if (!symbol) continue;
            assets.push({ symbol: symbol, name: parts[columnMap.name]?.trim().replace(/"/g, ''), shares: cleanNumber(parts[columnMap.shares]), avgCost: cleanNumber(parts[columnMap.avgCost]), currentPrice: cleanNumber(parts[columnMap.currentPrice]), });
        } catch (error) { console.warn(`Skipping invalid inventory row: ${line}`, error); }
    }
    return { assets, error: null };
};

/**
 * 取得目前大盤狀態（FinMind TAIEX），快取 1 小時
 */
let cachedMarketRegime: { regime: MarketRegime, bias20: number, dailyChange: number, timestamp: number } | null = null;

export const fetchMarketRegime = async (forceRefresh: boolean = false): Promise<{ regime: MarketRegime, bias20: number }> => {
    if (!forceRefresh && cachedMarketRegime && (Date.now() - cachedMarketRegime.timestamp < TAIX_TTL)) {
        return { regime: cachedMarketRegime.regime, bias20: cachedMarketRegime.bias20 };
    }
    try {
        const closes = await fetchTAIEXHistory();
        if (closes && closes.length >= 21) {
            const last20 = closes.slice(-20);
            const ma20 = last20.reduce((a, b) => a + b, 0) / 20;
            const lastClose = closes[closes.length - 1];
            const prevClose = closes[closes.length - 2];
            const bias20 = ((lastClose - ma20) / ma20) * 100;
            const dailyChange = ((lastClose - prevClose) / prevClose) * 100;
            let regime = MarketRegime.NORMAL;
            if (bias20 <= -10 || dailyChange <= -5) regime = MarketRegime.DEFENSIVE;
            else if (bias20 <= -5 || dailyChange <= -3) regime = MarketRegime.CONSERVATIVE;
            cachedMarketRegime = { regime, bias20, dailyChange, timestamp: Date.now() };
            return { regime, bias20 };
        }
    } catch (error) {
        console.error('Error fetching market regime:', error);
    }
    return cachedMarketRegime
        ? { regime: cachedMarketRegime.regime, bias20: cachedMarketRegime.bias20 }
        : { regime: MarketRegime.NORMAL, bias20: 0 };
};

// 判斷是否連續 3 筆交易虧損
export const checkConsecutiveLossLock = (transactions?: StockTransaction[]): boolean => {
    if (!transactions || transactions.length === 0) return false;
    
    // 找出所有賣出且有已實現損益的紀錄，依日期反向排序 (最新的在前)
    const sells = transactions
        .filter(t => t.side === 'SELL' && t.realizedProfit !== undefined)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    if (sells.length < 3) return false;
    
    // 檢查最近 3 筆是否皆為負數
    return sells[0].realizedProfit! < 0 && sells[1].realizedProfit! < 0 && sells[2].realizedProfit! < 0;
};
export const fetchFinMindUsage = async (): Promise<{ user_count: number, api_request_limit: number } | null> => {
    const token = getFinMindToken();
    if (!token) return null;
    try {
        const res = await fetch("https://api.web.finmindtrade.com/v2/user_info", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json.user_count !== undefined && json.api_request_limit !== undefined) {
            return {
                user_count: json.user_count,
                api_request_limit: json.api_request_limit
            };
        }
        return null;
    } catch {
        return null;
    }
};

let institutionalCache: Record<string, any> = {};
export const fetchInstitutionalData = async (symbol: string) => {
    const token = getFinMindToken();
    if (!token) return null;
    if (institutionalCache[symbol]) return institutionalCache[symbol];

    const startDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
        const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${symbol}&start_date=${startDate}&token=${token}`);
        if (!res.ok) {
            console.warn(`[外資投信] ${symbol} API失敗 status=${res.status}`);
            return null;
        }
        const json = await res.json();
        if (json.status !== undefined && json.status !== 200) {
            console.warn(`[外資投信] ${symbol} API回傳錯誤:`, json.msg || json.status);
            return null;
        }
        if (json.data && Array.isArray(json.data)) {
            if (json.data.length === 0) {
                console.warn(`[外資投信] ${symbol} 回傳空資料，可能超過配額或該股無資料`);
            }
            const byDate: Record<string, any> = {};
            json.data.forEach((item: any) => {
                if (!byDate[item.date]) byDate[item.date] = { Foreign_Investor: 0, Investment_Trust: 0 };
                const n = item.name || '';
                if (n.includes("外資") || n === 'Foreign_Investor') byDate[item.date].Foreign_Investor += Math.round((item.buy - item.sell) / 1000);
                if (n.includes("投信") || n === 'Investment_Trust') byDate[item.date].Investment_Trust += Math.round((item.buy - item.sell) / 1000);
            });
            const dates = Object.keys(byDate).sort();
            const last5 = dates.slice(-5);

            // 從最新日往回數連續買超/賣超天數
            const countConsecutive = (field: 'Foreign_Investor' | 'Investment_Trust', direction: 'buy' | 'sell') => {
                let count = 0;
                for (let i = dates.length - 1; i >= 0; i--) {
                    const val = byDate[dates[i]][field];
                    if (direction === 'buy' ? val > 0 : val < 0) count++;
                    else break;
                }
                return count;
            };

            const foreignConsecBuy = countConsecutive('Foreign_Investor', 'buy');
            const foreignConsecSell = countConsecutive('Foreign_Investor', 'sell');
            const trustConsecBuy = countConsecutive('Investment_Trust', 'buy');
            const trustConsecSell = countConsecutive('Investment_Trust', 'sell');

            const result = {
                foreignBuy: foreignConsecBuy >= 3,
                foreignSell: foreignConsecSell >= 3,
                trustBuy: trustConsecBuy >= 3,
                trustSell: trustConsecSell >= 3,
                foreignConsecBuy,
                foreignConsecSell,
                trustConsecBuy,
                trustConsecSell,
                last5,
                byDate
            };
            institutionalCache[symbol] = result;
            return result;
        }
        return null;
    } catch {
        return null;
    }
};

// ===== 即時現價：Cloudflare Worker → TWSE 備援 =====
/**
 * 從 TWSE msgArray 物件解析出最佳可用價格。
 * 優先序：z（最近成交價）→ 買賣中間價 (b/a 各取第一檔) → o（開盤價，最後手段）。
 * z 在集合競價瞬間或冷門股無成交間隔時常為 "-"，此時用買賣報價中點更貼近現價。
 */
const extractPrice = (info: any): number | null => {
    if (!info) return null;
    const z = info.z;
    if (z && z !== '-') return parseFloat(z);

    // b/a 格式："1625.0000_1620.0000_..._" 取第一檔
    const bestBid = info.b?.split('_')[0];
    const bestAsk = info.a?.split('_')[0];
    const bid = bestBid && bestBid !== '-' ? parseFloat(bestBid) : null;
    const ask = bestAsk && bestAsk !== '-' ? parseFloat(bestAsk) : null;
    if (bid && ask) return (bid + ask) / 2;
    if (bid) return bid;
    if (ask) return ask;

    const open = info.o;
    if (open && open !== '-') return parseFloat(open);
    return null;
};

const fetchTWSEPrice = async (symbol: string): Promise<number | null> => {
    await loadStockInfoMap(); // 確保上市/上櫃分類表已載入完成才決定前綴順序
    const isOtc = otcSymbolSet.has(symbol);
    const prefixOrder = isOtc ? ['otc', 'tse'] : ['tse', 'otc'];
    for (const prefix of prefixOrder) {
        const path = `/stock/api/getStockInfo.jsp?ex_ch=${prefix}_${symbol}.tw&json=1&delay=0`;
        try {
            const res = await Promise.any([
                fetch(`${CF_WORKER}${path}`).then(r => r.ok ? r.json() : Promise.reject()),
                fetch(`https://mis.twse.com.tw${path}`).then(r => r.ok ? r.json() : Promise.reject())
            ]);
            const info = res?.msgArray?.[0];
            // 確認真的查到該股票（避免錯誤前綴回傳空陣列卻被誤判成功）
            if (!info || info.c !== symbol) continue;
            const price = extractPrice(info);
            if (price) return price;
        } catch { /* try next prefix */ }
    }
    return null;
};

export const fetchTechnicalData = async (symbol: string, assets?: Asset[], transactions?: StockTransaction[]): Promise<TechDataResult | null> => {
    try {
        if (!symbol) return null;
        const isTAIEX = symbol === '^TWII';

        // ── 1. K線（FinMind Session快取）──
        const closes = isTAIEX ? await fetchTAIEXHistory() : await fetchFinMindHistory(symbol);
        if (!closes || closes.length < 21) {
            if (!isTAIEX) {
                const twsePrice = await fetchTWSEPrice(symbol);
                if (twsePrice) return { currentPrice: twsePrice, ma20: null, ma60: null, bias20: null, bias20List: [], rsi: null, dailyChangeRatio: null, marginRatio: null, signal: null } as any;
            }
            return null;
        }

        // ── 2. 建立 validData ──
        const validData: { close: number, volume: number }[] = closes.map(c => ({ close: c, volume: 0 }));

        if (validData.length < 23) return null;

        // ── 3. MA20 / Bias20（最近10天，支援連增/連降最多9棒）──
        const SLOPE_WINDOW = 10;
        const bias20List: number[] = [];
        const ma20List: number[] = [];
        for (let i = 0; i < SLOPE_WINDOW; i++) {
            const targetIdx = validData.length - 1 - i;
            if (targetIdx - 19 < 0) break;
            const slice = validData.slice(targetIdx - 19, targetIdx + 1);
            const ma20 = slice.reduce((a, b) => a + b.close, 0) / 20;
            ma20List.unshift(ma20);
            bias20List.unshift(((slice[19].close - ma20) / ma20) * 100);
        }
        if (bias20List.length < 4) return null;

        // ── 4. MA60 ──
        let currentMa60: number | null = null;
        if (validData.length >= 60) {
            currentMa60 = validData.slice(-60).reduce((a, b) => a + b.close, 0) / 60;
        }

        // ── 5. 即時現價（Cloudflare Worker → TWSE，僅個股）──
        const twsePrice = !isTAIEX ? await fetchTWSEPrice(symbol) : null;
        const currentPrice = (twsePrice !== null && twsePrice > 0) ? twsePrice : validData[validData.length - 1].close;

        // 今日 vs 昨收：用 TWSE 即時現價 - FinMind 昨日收盤
        let dailyChangeRatio: number | null = null;
        let dailyChange: number | null = null;
        if (validData.length >= 1) {
            const prevClose = validData[validData.length - 1].close;
            dailyChange = currentPrice - prevClose;
            dailyChangeRatio = (dailyChange / prevClose) * 100;
        }
        const lastIdx = ma20List.length - 1;
        const currentMa20 = ma20List[lastIdx];
        const currentBias20 = ((currentPrice - currentMa20) / currentMa20) * 100;

        // Override last element with live-price bias for accuracy
        bias20List[lastIdx] = currentBias20;

        // Build slope array: index 0 = today (newest), index N = oldest
        // Length = bias20List.length - 1 (up to 9 with SLOPE_WINDOW=10)
        const biasSlopes: number[] = [];
        for (let i = lastIdx; i >= 1; i--) {
            biasSlopes.push(bias20List[i] - bias20List[i - 1]);
        }
        const ma20Slope = ma20List[lastIdx] - ma20List[lastIdx - 1];

        // 4. Calculate 14-day RSI
        let avgGain = 0;
        let avgLoss = 0;
        for (let i = 1; i <= 14; i++) {
            const diff = validData[i].close - validData[i - 1].close;
            if (diff > 0) avgGain += diff;
            else avgLoss += Math.abs(diff);
        }
        avgGain /= 14;
        avgLoss /= 14;

        for (let i = 15; i < validData.length; i++) {
            const diff = validData[i].close - validData[i - 1].close;
            let gain = 0, loss = 0;
            if (diff > 0) gain = diff;
            else loss = Math.abs(diff);

            avgGain = (avgGain * 13 + gain) / 14;
            avgLoss = (avgLoss * 13 + loss) / 14;
        }

        const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
        const rsi = 100 - (100 / (1 + rs));

        // 5. Calculate VolumeRatio
        const last20Vols = validData.slice(-20).map(d => d.volume);
        const avgVol = last20Vols.reduce((a, b) => a + b, 0) / 20;
        const volumeRatio = avgVol === 0 ? 0 : validData[validData.length - 1].volume / avgVol;

        // ── 9. 籌碼面（FinMind Session快取）──
        let marginChangeRatio: number | null = null;
        let marginChange: number | null = null;
        let institutionalForeign: number | null = null;
        let institutionalTrust: number | null = null;
        let institutionalDealer: number | null = null;

        // 外資/投信（FinMind，Session 快取）— 先抓，供下方 Track 2 和 return 使用
        const instData = isTAIEX ? null : await fetchInstitutionalData(symbol);

        if (!isTAIEX) {
            // 融資（FinMind TaiwanStockMarginPurchaseShortSale）
            const marginResult = await fetchFinMindMargin(symbol);
            if (marginResult && marginResult.prev > 0) {
                marginChangeRatio = ((marginResult.today - marginResult.prev) / marginResult.prev) * 100;
                marginChange = marginResult.today - marginResult.prev;
            }
            if (instData && instData.last5 && instData.last5.length > 0) {
                const lastDate = instData.last5[instData.last5.length - 1];
                const lastDay = instData.byDate[lastDate];
                if (lastDay) {
                    institutionalForeign = lastDay.Foreign_Investor ?? null;
                    institutionalTrust = lastDay.Investment_Trust ?? null;
                }
            }
        }

        // 7. Determine Category — 上市(TSE)→大型股門檻, 上櫃(OTC)→小型股門檻, ETF獨立處理
        const isETF = etfSymbolSet.size > 0
            ? etfSymbolSet.has(symbol)
            : (symbol.startsWith('00') || symbol.toLowerCase().includes('etf')); // FinMind未載入時的備援
        const isOtc = otcSymbolSet.has(symbol);
        const sizeCategory = isETF ? 'ETF' : (isOtc ? 'SMALL_CAP' : 'LARGE_CAP');

        // 9. V4.0 Signals & Risk Control
        const params = getTechParameters();

        const checkSlopeImproved = (days: number) => {
            if (days <= 0) return true;
            for (let i = 0; i < Math.min(days, biasSlopes.length); i++) {
                if (biasSlopes[i] <= 0) return false;
            }
            return true;
        };

        let techSignal: TechDataResult['techSignal'] = 'NONE';
        
        const checkSlopeDeteriorated = (days: number) => {
            if (days <= 0) return true;
            for (let i = 0; i < Math.min(days, biasSlopes.length); i++) {
                if (biasSlopes[i] >= 0) return false;
            }
            return true;
        };
        
        let marketRegime = MarketRegime.NORMAL;
        let twiiBias20 = 0;
        if (symbol !== '^TWII') {
            const mRegimeData = await fetchMarketRegime();
            marketRegime = mRegimeData.regime;
            twiiBias20 = mRegimeData.bias20;
        }
        
        const isConsecutiveLossLock = checkConsecutiveLossLock(transactions);
        if (isConsecutiveLossLock) {
            marketRegime = MarketRegime.CONSERVATIVE; // 強制進入保守模式
        }
        
        if (marketRegime === MarketRegime.CONSERVATIVE) {
            // 保守模式不再扣分，僅作為加碼限制
        }

        // 庫存判斷
        const heldAsset = assets?.find(a => a.symbol === symbol || a.name.includes(symbol) || symbol.includes(a.name));
        const isHeld = !!heldAsset;
        const lastBuyTransaction = transactions?.filter(t => (t.symbol === symbol || t.name === symbol) && t.side === 'BUY').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        let daysSinceLastBuy = 0;
        if (lastBuyTransaction) {
             const msDiff = Date.now() - new Date(lastBuyTransaction.date).getTime();
             daysSinceLastBuy = msDiff / (1000 * 60 * 60 * 24);
        }

        // ETF 豁免大盤單日跌幅機制 (若大盤Bias20未達-10%，則豁免防禦模式)
        let effectiveRegimeForBuy = marketRegime;
        if (sizeCategory === 'ETF') {
            if (twiiBias20 <= -10) {
                effectiveRegimeForBuy = MarketRegime.DEFENSIVE;
            } else if (twiiBias20 <= -5) {
                effectiveRegimeForBuy = MarketRegime.CONSERVATIVE;
            } else {
                effectiveRegimeForBuy = MarketRegime.NORMAL;
            }
        }

        const canBuy = effectiveRegimeForBuy !== MarketRegime.DEFENSIVE && currentBias20 < 0;

        if (sizeCategory === 'ETF') {
            if (currentBias20 >= params.etfSecondPartialSellBias && checkSlopeDeteriorated(params.etfPartialSellSlopeDays)) {
                techSignal = 'SECOND_PARTIAL_SELL';
            } else if (currentBias20 >= params.etfPartialSellBias && checkSlopeDeteriorated(params.etfPartialSellSlopeDays)) {
                techSignal = 'PARTIAL_SELL';
            } else if (currentBias20 <= params.etfStrongAdditionalBuyBias) {
                techSignal = 'STRONG_ADDITIONAL_BUY';
            } else if (currentBias20 <= params.etfAdditionalBuyBias) {
                techSignal = 'ADDITIONAL_BUY';
            } else if (canBuy && currentBias20 <= params.etfStrongBuyBias && checkSlopeImproved(params.etfStrongBuySlopeDays) && rsi < params.etfStrongBuyRsi) {
                techSignal = 'STRONG_BUY';
            } else if (canBuy && currentBias20 <= params.etfBuyBias && checkSlopeImproved(params.etfBuySlopeDays) && rsi < params.etfBuyRsi) {
                techSignal = 'BUY';
            }
        } else if (sizeCategory === 'LARGE_CAP') {
            if (currentBias20 >= params.largeCapForceSellBias) {
                techSignal = 'FORCE_SELL';
            } else if (currentBias20 >= params.largeCapPartialSellBias && checkSlopeDeteriorated(params.largeCapPartialSellSlopeDays)) {
                techSignal = 'PARTIAL_SELL';
            } else if (marketRegime === MarketRegime.NORMAL && isHeld && currentBias20 > params.largeCapTrendAddBiasMin && currentBias20 <= params.largeCapTrendAddBiasMax && ma20Slope > 0 && biasSlopes[0] > 0 && rsi >= params.largeCapTrendAddRsiMin && rsi <= params.largeCapTrendAddRsiMax && daysSinceLastBuy >= params.largeCapTrendAddCoolDownDays) {
                techSignal = 'TREND_ADD';
            } else if (canBuy && currentBias20 <= params.largeCapStrongBuyBias && checkSlopeImproved(params.largeCapStrongBuySlopeDays) && rsi < params.largeCapStrongBuyRsi) {
                techSignal = 'STRONG_BUY';
            } else if (canBuy && currentBias20 <= params.largeCapBuyBias && checkSlopeImproved(params.largeCapBuySlopeDays) && rsi < params.largeCapBuyRsi) {
                techSignal = 'BUY';
            }
        } else {
            // Small Cap
            if (currentBias20 >= params.smallCapForceSellBias) {
                techSignal = 'FORCE_SELL';
            } else if (currentBias20 >= params.smallCapPartialSellBias && checkSlopeDeteriorated(params.smallCapPartialSellSlopeDays)) {
                techSignal = 'PARTIAL_SELL';
            } else if (marketRegime === MarketRegime.NORMAL && isHeld && currentBias20 > params.smallCapTrendAddBiasMin && currentBias20 <= params.smallCapTrendAddBiasMax && ma20Slope > 0 && biasSlopes[0] > 0 && rsi >= params.smallCapTrendAddRsiMin && rsi <= params.smallCapTrendAddRsiMax && daysSinceLastBuy >= params.smallCapTrendAddCoolDownDays) {
                techSignal = 'TREND_ADD';
            } else if (canBuy && currentBias20 <= params.smallCapStrongBuyBias && checkSlopeImproved(params.smallCapStrongBuySlopeDays) && rsi < params.smallCapStrongBuyRsi) {
                techSignal = 'STRONG_BUY';
            } else if (canBuy && currentBias20 <= params.smallCapBuyBias && checkSlopeImproved(params.smallCapBuySlopeDays) && rsi < params.smallCapBuyRsi) {
                techSignal = 'BUY';
            }
        }
        
        // ── 第二軌：籌碼面共振 / 背離修正 ──
        if (instData) {
            const isBullishSignal = ['STRONG_BUY', 'BUY', 'TREND_ADD', 'ADDITIONAL_BUY', 'STRONG_ADDITIONAL_BUY'].includes(techSignal);
            const isWeakOrNeutral = ['NONE', 'RISK_ALERT', 'PARTIAL_SELL'].includes(techSignal);

            // 籌碼共振：原訊號偏多 && 外資+投信 近5日各≥3日買超 → 升級強力布局
            if (isBullishSignal && instData.foreignBuy && instData.trustBuy) {
                techSignal = 'STRONG_LAYOUT';
            }
            // 籌碼背離：原訊號偏多 && 外資連賣 && 融資增幅≥+2% → 降級持續觀察
            else if (isBullishSignal && instData.foreignSell && marginChangeRatio !== null && marginChangeRatio >= 2) {
                techSignal = 'WATCH_DIVERGE';
            }
            // 主力棄守：原訊號偏弱/中性 && 外資+投信 近5日各≥3日賣超 → 強制建議賣出
            else if (isWeakOrNeutral && instData.foreignSell && instData.trustSell) {
                techSignal = 'SELL';
            }
            // FORCE_SELL + 籌碼共振：維持強制停利，但在 signalHint 加提示（見 buildTriggerConditions）
        }

        const riskAlerts: RiskAlerts = {
            stopLossAlert: false, // 將由下方雙層停損邏輯動態判斷
            conservativeLock: isConsecutiveLossLock
        };

        // 雙層停損與預警機制 (ETF 不適用)
        if (isHeld && sizeCategory !== 'ETF' && heldAsset && heldAsset.avgCost) {
            const unrealizedProfit = ((currentPrice - heldAsset.avgCost) / heldAsset.avgCost) * 100;
            const stopLossPnL = sizeCategory === 'LARGE_CAP' ? params.largeCapStopLossPnL : params.smallCapStopLossPnL;
            const stopLossBias = sizeCategory === 'LARGE_CAP' ? params.largeCapStopLossBias : params.smallCapStopLossBias;
            const riskAlertBias = sizeCategory === 'LARGE_CAP' ? params.largeCapRiskAlertBias : params.smallCapRiskAlertBias;

            // 第一層：持倉損益停損
            if (unrealizedProfit <= stopLossPnL) {
                techSignal = 'STOP_LOSS_ALERT';
                riskAlerts.stopLossAlert = true;
            } 
            // 第二層：乖離率停損
            else if (currentBias20 <= stopLossBias) {
                techSignal = 'STOP_LOSS_ALERT';
                riskAlerts.stopLossAlert = true;
            }
            // 第三層：乖離率風險預警
            else if (currentBias20 <= riskAlertBias) {
                techSignal = 'RISK_ALERT';
            }
        }

        let signalHint: SignalHint | undefined = undefined;

        // ── 為所有正式燈號建立觸發條件小標籤（含實際數值）──
        const buildTriggerConditions = (): SignalHint | undefined => {
            const cond = (label: string, satisfied: boolean) => ({ label, satisfied });
            const slope0 = biasSlopes[0] ?? 0;
            const biasLabel = `乖離 ${currentBias20 > 0 ? '+' : ''}${currentBias20.toFixed(2)}%`;
            const rsiLabel = `RSI ${rsi !== null ? rsi.toFixed(1) : '-'}`;
            const slopeLabel = `斜率 ${slope0 > 0 ? '+' : ''}${slope0.toFixed(2)}`;
            const foreignLabel = institutionalForeign !== null ? `外資 ${institutionalForeign > 0 ? '+' : ''}${institutionalForeign.toLocaleString()}` : '外資';
            const trustLabel = institutionalTrust !== null ? `投信 ${institutionalTrust > 0 ? '+' : ''}${institutionalTrust.toLocaleString()}` : '投信';
            const marginLabel = marginChange !== null ? `融資 ${marginChange > 0 ? '+' : ''}${marginChange.toLocaleString()}` : '融資';
            const marginRatioLabel = marginChangeRatio !== null ? `融資 ${marginChangeRatio > 0 ? '+' : ''}${marginChangeRatio.toFixed(1)}%` : '融資';

            const techConds = [cond(biasLabel, true), cond(rsiLabel, true), cond(slopeLabel, true)];
            const techSellConds = [cond(biasLabel, true), cond(slopeLabel, true)];

            if (sizeCategory === 'ETF') {
                if (techSignal === 'STRONG_BUY') return { target: '', type: 'BUY', conditions: techConds };
                if (techSignal === 'BUY') return { target: '', type: 'BUY', conditions: techConds };
                if (techSignal === 'ADDITIONAL_BUY') return { target: '', type: 'BUY', conditions: [cond(biasLabel, true)] };
                if (techSignal === 'STRONG_ADDITIONAL_BUY') return { target: '', type: 'BUY', conditions: [cond(biasLabel, true)] };
                if (techSignal === 'PARTIAL_SELL') return { target: '', type: 'SELL', conditions: techSellConds };
                if (techSignal === 'SECOND_PARTIAL_SELL') return { target: '', type: 'SELL', conditions: techSellConds };
            } else if (sizeCategory === 'LARGE_CAP' || sizeCategory === 'SMALL_CAP') {
                if (techSignal === 'STRONG_BUY') return { target: '', type: 'BUY', conditions: techConds };
                if (techSignal === 'BUY') return { target: '', type: 'BUY', conditions: techConds };
                if (techSignal === 'TREND_ADD') return { target: '', type: 'BUY', conditions: [cond('持倉中', true), cond(biasLabel, true), cond(`MA20↑ ${ma20Slope > 0 ? '✓' : '✗'}`, ma20Slope > 0), cond(rsiLabel, true)] };
                if (techSignal === 'PARTIAL_SELL') return { target: '', type: 'SELL', conditions: techSellConds };
                if (techSignal === 'FORCE_SELL') {
                    const forceConds = [cond(biasLabel, true)];
                    if (instData?.foreignBuy && instData?.trustBuy) {
                        forceConds.push(cond('⚡ 籌碼共振 可考慮布局', true));
                    }
                    return { target: '', type: 'SELL', conditions: forceConds };
                }
            }
            if (techSignal === 'STRONG_LAYOUT') return { target: '', type: 'BUY', conditions: [cond(biasLabel, true), cond(foreignLabel, true), cond(trustLabel, true)] };
            if (techSignal === 'WATCH_DIVERGE') return { target: '', type: 'SELL', conditions: [cond(biasLabel, true), cond(foreignLabel, true), cond(marginRatioLabel, true)] };
            if (techSignal === 'SELL') return { target: '', type: 'SELL', conditions: [cond(foreignLabel, true), cond(trustLabel, true)] };
            if (techSignal === 'STOP_LOSS_ALERT') {
                const unrealPnL = isHeld && heldAsset?.avgCost ? (currentPrice - heldAsset.avgCost) / heldAsset.avgCost * 100 : 0;
                const stopPnL = sizeCategory === 'LARGE_CAP' ? params.largeCapStopLossPnL : params.smallCapStopLossPnL;
                const byPnL = unrealPnL <= stopPnL;
                return { target: '', type: 'SELL', conditions: byPnL
                    ? [cond(`損益 ${unrealPnL.toFixed(1)}%`, true), cond(`門檻 ${stopPnL}%`, true)]
                    : [cond(biasLabel, true), cond('乖離停損', true)] };
            }
            if (techSignal === 'RISK_ALERT') return { target: '', type: 'SELL', conditions: [cond(biasLabel, true), cond('進入預警區', true)] };
            if (techSignal === 'NONE' && institutionalForeign !== null) {
                return { target: '', type: 'BUY', conditions: [cond(foreignLabel, institutionalForeign > 0), cond(trustLabel, (institutionalTrust ?? 0) > 0), cond(marginLabel, (marginChange ?? 0) < 0)] };
            }
            return undefined;
        };

        if (techSignal === 'NONE' || techSignal === 'RISK_ALERT') {
            const analyzeBrewing = (
                buyBias: number, strongBuyBias: number, 
                buyRsi: number, strongBuyRsi: number, 
                buySlopeDays: number, strongBuySlopeDays: number,
                partialSellBias: number, partialSellSlopeDays: number
            ): import('../types').SignalHint | undefined => {
                const slope0b = biasSlopes[0] ?? 0;
                const bLabel = `乖離 ${currentBias20 > 0 ? '+' : ''}${currentBias20.toFixed(2)}%`;
                const rLabel = (threshold: number) => `RSI ${rsi !== null ? rsi.toFixed(1) : '-'} (<${threshold})`;
                const sLabel = `斜率 ${slope0b > 0 ? '+' : ''}${slope0b.toFixed(2)}`;
                if (currentBias20 < 0 && canBuy) {
                    if (currentBias20 <= buyBias) {
                        if (currentBias20 <= strongBuyBias) {
                            return {
                                target: '🟢 醞釀強買',
                                type: 'BUY',
                                conditions: [
                                    { label: bLabel, satisfied: true },
                                    { label: rLabel(strongBuyRsi), satisfied: rsi !== null && rsi < strongBuyRsi },
                                    { label: sLabel, satisfied: checkSlopeImproved(strongBuySlopeDays) }
                                ]
                            };
                        }
                        return {
                            target: '🟢 醞釀買進',
                            type: 'BUY',
                            conditions: [
                                { label: bLabel, satisfied: true },
                                { label: rLabel(buyRsi), satisfied: rsi !== null && rsi < buyRsi },
                                { label: sLabel, satisfied: checkSlopeImproved(buySlopeDays) }
                            ]
                        };
                    }
                } else if (currentBias20 > 0) {
                    if (currentBias20 >= partialSellBias) {
                        return {
                            target: '🟡 醞釀停利',
                            type: 'SELL',
                            conditions: [
                                { label: bLabel, satisfied: true },
                                { label: sLabel, satisfied: checkSlopeDeteriorated(partialSellSlopeDays) }
                            ]
                        };
                    }
                }
                return undefined;
            };

            if (sizeCategory === 'ETF') {
                signalHint = analyzeBrewing(params.etfBuyBias, params.etfStrongBuyBias, params.etfBuyRsi, params.etfStrongBuyRsi, params.etfBuySlopeDays, params.etfStrongBuySlopeDays, params.etfPartialSellBias, params.etfPartialSellSlopeDays);
            } else if (sizeCategory === 'LARGE_CAP') {
                signalHint = analyzeBrewing(params.largeCapBuyBias, params.largeCapStrongBuyBias, params.largeCapBuyRsi, params.largeCapStrongBuyRsi, params.largeCapBuySlopeDays, params.largeCapStrongBuySlopeDays, params.largeCapPartialSellBias, params.largeCapPartialSellSlopeDays);
            } else if (sizeCategory === 'SMALL_CAP') {
                 signalHint = analyzeBrewing(params.smallCapBuyBias, params.smallCapStrongBuyBias, params.smallCapBuyRsi, params.smallCapStrongBuyRsi, params.smallCapBuySlopeDays, params.smallCapStrongBuySlopeDays, params.smallCapPartialSellBias, params.smallCapPartialSellSlopeDays);
            }
        }

        // 正式燈號補上觸發條件
        if (!signalHint && techSignal !== 'NONE') {
            signalHint = buildTriggerConditions();
        }

        return {
            ma20: currentMa20,
            ma60: currentMa60,
            rsi,
            volumeRatio,
            biasSlopes,
            ma20Slope,
            marginChangeRatio,
            marginChange,
            institutionalForeign,
            institutionalTrust,
            institutionalDealer,
            foreignBuy: instData?.foreignBuy ?? false,
            foreignSell: instData?.foreignSell ?? false,
            trustBuy: instData?.trustBuy ?? false,
            trustSell: instData?.trustSell ?? false,
            foreignConsecBuy: instData?.foreignConsecBuy ?? 0,
            foreignConsecSell: instData?.foreignConsecSell ?? 0,
            trustConsecBuy: instData?.trustConsecBuy ?? 0,
            trustConsecSell: instData?.trustConsecSell ?? 0,
            dailyChangeRatio,
            dailyChange,
            sizeCategory,
            techSignal,
            currentPrice,
            marketRegime,
            riskAlerts,
            signalHint
        };
    } catch (error) {
        console.error(`Failed to fetch Technical Data for ${symbol}:`, error);
        return null;
    }
};








