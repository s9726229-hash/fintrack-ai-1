import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Currency, StockPerformanceResult, StockTransaction, Transaction, TechDataResult, MarketRegime, RiskAlerts, SignalHint } from "../types";
import { getApiKey, getFeeDiscount, getTechParameters, getFinMindToken } from "./storage";
import largeCaps from '../src/data/large_caps.json';
 
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
 
// 上市/上櫃分類快取（symbol → 'tse' | 'otc'），一個 Session 只打一次 FinMind
let otcSymbolSet: Set<string> = new Set();
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
 
/** 載入上市/上櫃分類表（symbol → otc 判斷），一個 Session 只打一次 FinMind */
const loadStockInfoMap = async (): Promise<void> => {
    if (stockInfoLoaded) return;
    stockInfoLoaded = true; // 不論成功失敗都標記，避免重複嘗試拖慢效能
    try {
        const data = await finmindFetch({ dataset: 'TaiwanStockInfo' });
        if (!data) return;
        const otcSet = new Set<string>();
        data.forEach((d: any) => {
            // FinMind type 欄位常見值：twse（上市）、tpex/otc（上櫃）
            const t = (d.type || '').toLowerCase();
            if (t.includes('otc') || t.includes('tpex')) otcSet.add(d.stock_id);
        });
        otcSymbolSet = otcSet;
    } catch { /* 查詢失敗則維持空集合，沿用 tse→otc 預設順序 fallback */ }
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
export const pa
