import React, { useMemo, useState, useEffect } from 'react';
import { FlaskConical, Trophy, Target, ChevronDown, ChevronUp, BarChart2, Zap, Loader2, Save, Download, Upload } from 'lucide-react';
import { StockTransaction, BacktestResult } from '../types';
import { lookupStockName, fetchKlineWindow, computeMultiBias, computeDSSForDate, fetchHistoricalInstForBacktest, fetchHistoricalMarginForBacktest } from '../services/stock';
import { getBacktestCache, getDSSProfiles, saveDSSProfiles, DSSProfile, getTechParameters } from '../services/storage';

interface Props {
    stockTransactions: StockTransaction[];
}

/** ±N日進出場分析統一視窗天數（買入分析/出場分析共用，也讓原始資料快取可互相重用）*/
const WINDOW_DAYS = 10;

interface CompletedTrade {
    symbol: string;
    name?: string;
    category: 'ETF' | '上市' | '上櫃';
    buyDate: string;
    sellDate: string;
    buyPrice: number;
    sellPrice: number;
    shares: number;
    realizedProfit: number;
    returnPct: number;
    holdingDays: number;
}

interface SymbolStats {
    symbol: string;
    name?: string;
    category: 'ETF' | '上市' | '上櫃';
    trades: CompletedTrade[];
    wins: number;
    losses: number;
    winRate: number;
    avgProfit: number;
    avgReturn: number;
    avgHoldingDays: number;
    totalPnL: number;
    maxProfit: number;
    maxLoss: number;
}

const daysBetween = (d1: string, d2: string) => {
    const diff = new Date(d2).getTime() - new Date(d1).getTime();
    return Math.round(diff / 86400000);
};

const guessCategory = (symbol: string): 'ETF' | '上市' | '上櫃' => {
    if (symbol.startsWith('00') && symbol.length >= 4) return 'ETF';
    // OTC codes: typically 4-digit starting with 3,4,5,6,8 (rough heuristic)
    const n = parseInt(symbol, 10);
    if (!isNaN(n) && (n >= 3000 && n <= 6999 || n >= 8000 && n <= 8999)) return '上櫃';
    return '上市';
};

const buildCompletedTrades = (transactions: StockTransaction[]): CompletedTrade[] => {
    const bySymbol: Record<string, StockTransaction[]> = {};
    for (const t of transactions) {
        if (!t.symbol) continue;
        (bySymbol[t.symbol] = bySymbol[t.symbol] ?? []).push(t);
    }

    const result: CompletedTrade[] = [];
    for (const [symbol, txns] of Object.entries(bySymbol)) {
        const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
        // FIFO 依股數配對，而非「一筆買進對一筆賣出」；一筆賣出可能同時平掉多筆買進，
        // 一筆買進也可能被多筆賣出分批出清，需依實際股數拆分/合併才能算出正確的持倉天數與報酬率。
        const lots: { date: string; price: number; name?: string; remaining: number }[] = [];
        for (const t of sorted) {
            if (t.side === 'BUY') {
                lots.push({ date: t.date, price: t.price, name: t.name, remaining: t.shares });
            } else if (t.side === 'SELL' && t.realizedProfit !== undefined) {
                const totalSellShares = t.shares;
                let remainingToMatch = t.shares;
                while (remainingToMatch > 0 && lots.length > 0) {
                    const lot = lots[0];
                    const matchedShares = Math.min(lot.remaining, remainingToMatch);
                    const allocatedProfit = totalSellShares > 0 ? t.realizedProfit * (matchedShares / totalSellShares) : 0;
                    const returnPct = lot.price > 0 ? ((t.price - lot.price) / lot.price) * 100 : 0;
                    result.push({
                        symbol,
                        name: t.name ?? lot.name,
                        category: guessCategory(symbol),
                        buyDate: lot.date,
                        sellDate: t.date,
                        buyPrice: lot.price,
                        sellPrice: t.price,
                        shares: matchedShares,
                        realizedProfit: allocatedProfit,
                        returnPct,
                        holdingDays: daysBetween(lot.date, t.date),
                    });
                    lot.remaining -= matchedShares;
                    remainingToMatch -= matchedShares;
                    if (lot.remaining <= 0) lots.shift();
                }
                // remainingToMatch > 0 代表賣出股數超過已知買進紀錄（資料不完整），無買進紀錄可配對的部分直接略過
            }
        }
    }
    return result.filter(t => t.holdingDays > 0);
};

const buildSymbolStats = (trades: CompletedTrade[]): SymbolStats[] => {
    const bySymbol: Record<string, CompletedTrade[]> = {};
    for (const t of trades) {
        (bySymbol[t.symbol] = bySymbol[t.symbol] ?? []).push(t);
    }
    return Object.entries(bySymbol).map(([symbol, list]) => {
        const wins = list.filter(t => t.realizedProfit > 0);
        const losses = list.filter(t => t.realizedProfit <= 0);
        return {
            symbol,
            name: list[0]?.name,
            category: list[0]?.category ?? '上市',
            trades: list,
            wins: wins.length,
            losses: losses.length,
            winRate: list.length ? (wins.length / list.length) * 100 : 0,
            avgProfit: list.length ? list.reduce((s, t) => s + t.realizedProfit, 0) / list.length : 0,
            avgReturn: list.length ? list.reduce((s, t) => s + t.returnPct, 0) / list.length : 0,
            avgHoldingDays: list.length ? list.reduce((s, t) => s + t.holdingDays, 0) / list.length : 0,
            totalPnL: list.reduce((s, t) => s + t.realizedProfit, 0),
            maxProfit: wins.length ? Math.max(...wins.map(t => t.realizedProfit)) : 0,
            maxLoss: losses.length ? Math.min(...losses.map(t => t.realizedProfit)) : 0,
        };
    }).sort((a, b) => b.trades.length - a.trades.length);
};

type SortKey = 'trades' | 'winRate' | 'avgProfit' | 'totalPnL' | 'avgHolding';
type CategoryFilter = 'ALL' | 'ETF' | '上市' | '上櫃';

// ── Section 2：進場條件分析（交叉比對回測快取）──────────────────────────────
interface EnrichedTrade extends CompletedTrade {
    rsi?: number;
    bias20?: number;
    techSignal?: string;
    foreignConsecBuy?: number;
    trustConsecBuy?: number;
}

const median = (arr: number[]): number | null => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

interface CatStats {
    cat: 'ETF' | '上市' | '上櫃';
    matched: number; winners: number; losers: number;
    wRsi: number | null; lRsi: number | null; medRsi: number | null;
    wBias: number | null; lBias: number | null; medBias: number | null;
    wForeign: number | null; lForeign: number | null;
    wTrust: number | null; lTrust: number | null;
    wHolding: number | null; lHolding: number | null;
}

const buildCatStats = (list: EnrichedTrade[], cat: 'ETF' | '上市' | '上櫃'): CatStats | null => {
    const minN = cat === 'ETF' ? 1 : 3;
    const withDSS = list.filter(t => t.category === cat && t.rsi !== undefined);
    if (withDSS.length < minN) return null;
    const winners = withDSS.filter(t => t.realizedProfit > 0);
    const losers  = withDSS.filter(t => t.realizedProfit <= 0);
    return {
        cat, matched: withDSS.length, winners: winners.length, losers: losers.length,
        wRsi: avg(winners.map(t => t.rsi!)), lRsi: avg(losers.map(t => t.rsi!)),
        medRsi: median(winners.map(t => t.rsi!)),
        wBias: avg(winners.map(t => t.bias20!)), lBias: avg(losers.map(t => t.bias20!)),
        medBias: median(winners.map(t => t.bias20!)),
        wForeign: avg(winners.map(t => t.foreignConsecBuy ?? 0)),
        lForeign: avg(losers.map(t => t.foreignConsecBuy ?? 0)),
        wTrust: avg(winners.map(t => t.trustConsecBuy ?? 0)),
        lTrust: avg(losers.map(t => t.trustConsecBuy ?? 0)),
        wHolding: avg(winners.map(t => t.holdingDays)),
        lHolding: avg(losers.map(t => t.holdingDays)),
    };
};

const CmpRow = ({ label, wVal, lVal, medVal, unit = '', inverse = false }: {
    label: string; wVal: number | null; lVal: number | null; medVal?: number | null; unit?: string; inverse?: boolean;
}) => {
    if (wVal === null || lVal === null) return null;
    const winnerBetter = inverse ? wVal < lVal : wVal > lVal;
    return (
        <tr className="border-t border-slate-700/40">
            <td className="py-2.5 px-3 text-sm text-slate-300">{label}</td>
            <td className="py-2.5 px-3 text-center font-mono text-sm text-emerald-400 font-bold">{wVal.toFixed(1)}{unit}</td>
            <td className="py-2.5 px-3 text-center font-mono text-sm text-red-400 font-bold">{lVal.toFixed(1)}{unit}</td>
            <td className="py-2.5 px-3 text-center text-xs">
                {winnerBetter
                    ? <span className="text-emerald-400">Winner 較優 ↑</span>
                    : <span className="text-amber-400">差距不明顯</span>}
            </td>
            <td className="py-2.5 px-3 text-right text-xs font-mono text-violet-300">
                {medVal !== null && medVal !== undefined
                    ? (inverse ? `< ${medVal.toFixed(1)}${unit}` : `≥ ${medVal.toFixed(1)}${unit}`)
                    : '—'}
            </td>
        </tr>
    );
};

const CatPanel: React.FC<{ s: CatStats }> = ({ s }) => (
    <div className="space-y-3">
        <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>已比對 <strong className="text-white">{s.matched}</strong> 筆</span>
            <span className="text-emerald-400">✓ Winner {s.winners} 筆</span>
            <span className="text-red-400">✗ Loser {s.losers} 筆</span>
            <span className="text-slate-500 ml-auto">建議門檻 = Winner 中位數</span>
        </div>
        <table className="w-full">
            <thead>
                <tr className="text-xs text-slate-400">
                    <th className="py-1.5 px-3 text-left font-medium">指標</th>
                    <th className="py-1.5 px-3 text-center font-medium text-emerald-400">Winner 均值</th>
                    <th className="py-1.5 px-3 text-center font-medium text-red-400">Loser 均值</th>
                    <th className="py-1.5 px-3 text-center font-medium">差異</th>
                    <th className="py-1.5 px-3 text-right font-medium text-violet-300">建議門檻</th>
                </tr>
            </thead>
            <tbody>
                <CmpRow label="RSI 進場" wVal={s.wRsi} lVal={s.lRsi} medVal={s.medRsi} inverse />
                <CmpRow label="Bias20 進場" wVal={s.wBias} lVal={s.lBias} medVal={s.medBias} unit="%" inverse />
                <CmpRow label="外資連買天數" wVal={s.wForeign} lVal={s.lForeign} unit="天" />
                <CmpRow label="投信連買天數" wVal={s.wTrust} lVal={s.lTrust} unit="天" />
                <CmpRow label="持倉天數" wVal={s.wHolding} lVal={s.lHolding} unit="天" />
            </tbody>
        </table>
    </div>
);

const SignalQualitySection: React.FC<{ completedTrades: CompletedTrade[]; nameMap: Map<string, string> }> = ({ completedTrades }) => {
    const [enriched, setEnriched] = useState<EnrichedTrade[] | null>(null);
    const [activeTab, setActiveTab] = useState<'ETF' | '上市' | '上櫃'>('上市');
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    useEffect(() => {
        const cache = getBacktestCache();
        if (!cache) { setEnriched([]); return; }
        const resultMap = new Map<string, BacktestResult>();
        cache.results.forEach(r => { if (r.side === 'BUY') resultMap.set(`${r.symbol}|${r.date}`, r); });
        const list: EnrichedTrade[] = completedTrades.map(t => {
            const r = resultMap.get(`${t.symbol}|${t.buyDate}`);
            return r ? { ...t, rsi: r.rsi, bias20: r.bias20, techSignal: r.techSignal, foreignConsecBuy: r.foreignConsecBuy, trustConsecBuy: r.trustConsecBuy } : t;
        });
        setEnriched(list);
    }, [completedTrades]);

    const catStats = useMemo(() => {
        if (!enriched?.length) return null;
        const etf   = buildCatStats(enriched, 'ETF');
        const listed = buildCatStats(enriched, '上市');
        const otc   = buildCatStats(enriched, '上櫃');
        if (!etf && !listed && !otc) return null;
        return { ETF: etf, 上市: listed, 上櫃: otc };
    }, [enriched]);

    const totalMatched = enriched?.filter(t => t.rsi !== undefined).length ?? 0;

    const handleSaveProfile = () => {
        if (!catStats) return;
        setSaving(true);
        const cats: DSSProfile['categories'] = {};
        if (catStats.ETF)  cats['ETF']  = { rsi: catStats.ETF.medRsi ?? 0,  bias20: catStats.ETF.medBias ?? 0,  n: catStats.ETF.matched };
        if (catStats['上市']) cats['上市'] = { rsi: catStats['上市'].medRsi ?? 0, bias20: catStats['上市'].medBias ?? 0, n: catStats['上市'].matched };
        if (catStats['上櫃']) cats['上櫃'] = { rsi: catStats['上櫃'].medRsi ?? 0, bias20: catStats['上櫃'].medBias ?? 0, n: catStats['上櫃'].matched };
        const profile: DSSProfile = {
            id: crypto.randomUUID(),
            name: `交易分析 ${new Date().toLocaleDateString('zh-TW')}`,
            createdAt: Date.now(),
            source: { total: completedTrades.length, matched: totalMatched },
            categories: cats,
        };
        const profiles = getDSSProfiles();
        saveDSSProfiles([...profiles, profile]);
        setSaving(false);
        setSavedMsg('已儲存！可至系統設定套用');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    if (!enriched) return null;

    const tabs: Array<'ETF' | '上市' | '上櫃'> = ['ETF', '上市', '上櫃'];

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <BarChart2 size={16} className="text-violet-400" />
                <h3 className="text-sm font-bold text-slate-200">進場條件分析</h3>
                <span className="text-xs text-slate-500 ml-1">交叉比對回測快取 · Winner vs Loser</span>
                <div className="ml-auto flex items-center gap-2">
                    {savedMsg && <span className="text-xs text-emerald-400">{savedMsg}</span>}
                    {catStats && (
                        <button onClick={handleSaveProfile} disabled={saving}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg transition-colors">
                            <Save size={12} />儲存為設定檔
                        </button>
                    )}
                </div>
            </div>
            {!enriched.length || !catStats ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                    尚無回測快取 — 請先至「交易紀錄 → DSS 回測分析」執行一次分析
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    <div className="flex gap-1">
                        {tabs.map(tab => {
                            const s = catStats[tab];
                            const disabled = !s;
                            return (
                                <button key={tab} onClick={() => !disabled && setActiveTab(tab)}
                                    disabled={disabled}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        activeTab === tab && !disabled
                                            ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                                            : disabled
                                                ? 'text-slate-600 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                    }`}>
                                    {tab}
                                    {s ? <span className="ml-1 text-slate-500">({s.matched})</span>
                                       : <span className="ml-1 text-slate-600">(不足)</span>}
                                </button>
                            );
                        })}
                    </div>
                    {catStats[activeTab]
                        ? <CatPanel s={catStats[activeTab]!} />
                        : <div className="text-xs text-slate-500 py-4 text-center">此類別資料不足（上市/上櫃需 ≥3 筆，ETF 需 ≥1 筆）</div>
                    }
                </div>
            )}
        </div>
    );
};

// ── Section 3：±N日最佳進場分析 ───────────────────────────────────────────
interface WindowResult {
    symbol: string;
    name?: string;
    category: 'ETF' | '上市' | '上櫃';
    buyDate: string;
    sellDate: string;
    sellPrice: number;
    actualBuyPrice: number;
    actualReturn: number;
    actualBias5: number | null;
    actualBias10: number | null;
    actualBias20: number | null;
    bestDate: string;
    bestPrice: number;
    bestReturn: number;
    bestBias5: number | null;
    bestBias10: number | null;
    bestBias20: number | null;
    improvement: number;
    dayOffset: number;
    // Step2 補齊：斜率(連升天數)/RSI/籌碼 — 實際進場日 vs 最佳進場日
    actualRsi: number | null;
    actualSlopeUpDays: number | null;
    actualForeignConsecBuy: number | null;
    actualTrustConsecBuy: number | null;
    actualMarginConsecIncrease: number | null;
    bestRsi: number | null;
    bestSlopeUpDays: number | null;
    bestForeignConsecBuy: number | null;
    bestTrustConsecBuy: number | null;
    bestMarginConsecIncrease: number | null;
}

/** biasSlopes[0] 起算連續正斜率天數（配合 TechParameters 的 xxxBuySlopeDays 門檻概念）*/
const slopeConsecUp = (slopes: number[]): number => {
    let n = 0;
    for (const s of slopes) { if (s > 0) n++; else break; }
    return n;
};

// ── Step3：±N日最佳進場分析數據 → 依分類(ETF/上市/上櫃)取中位數 ──────────────
interface OptimalCatStats {
    cat: 'ETF' | '上市' | '上櫃';
    n: number;
    rawN: number;
    qualityCutoff: number;
    medRsi: number | null;
    medBias5: number | null;
    medBias10: number | null;
    medBias20: number | null;
    medSlopeUpDays: number | null;
    medForeignConsecBuy: number | null;
    medTrustConsecBuy: number | null;
    medMarginConsecIncrease: number | null;
}

const notNull = (v: number | null): v is number => v !== null;

/** 優質數據篩選：依改善幅度(improvement)排序，僅保留該分類前70%（排除改善幅度最低的30%）*/
const KEEP_RATIO = 0.7;
const filterQualityTrades = <T extends { improvement: number }>(list: T[]): { kept: T[]; cutoff: number } => {
    if (list.length === 0) return { kept: [], cutoff: 0 };
    const sorted = [...list].sort((a, b) => a.improvement - b.improvement);
    const cutoffIdx = Math.floor(sorted.length * (1 - KEEP_RATIO));
    const cutoff = sorted[cutoffIdx].improvement;
    return { kept: list.filter(r => r.improvement >= cutoff), cutoff };
};

const buildOptimalCatStats = (results: WindowResult[], cat: 'ETF' | '上市' | '上櫃'): OptimalCatStats | null => {
    const minN = cat === 'ETF' ? 1 : 3;
    const catList = results.filter(r => r.category === cat);
    if (catList.length < minN) return null;

    const { kept: list, cutoff } = filterQualityTrades(catList);
    if (list.length < minN) return null;

    return {
        cat,
        n: list.length,
        rawN: catList.length,
        qualityCutoff: cutoff,
        medRsi: median(list.map(r => r.bestRsi).filter(notNull)),
        medBias5: median(list.map(r => r.bestBias5).filter(notNull)),
        medBias10: median(list.map(r => r.bestBias10).filter(notNull)),
        medBias20: median(list.map(r => r.bestBias20).filter(notNull)),
        medSlopeUpDays: median(list.map(r => r.bestSlopeUpDays).filter(notNull)),
        medForeignConsecBuy: median(list.map(r => r.bestForeignConsecBuy).filter(notNull)),
        medTrustConsecBuy: median(list.map(r => r.bestTrustConsecBuy).filter(notNull)),
        medMarginConsecIncrease: median(list.map(r => r.bestMarginConsecIncrease).filter(notNull)),
    };
};

interface RawCacheEntry {
    kline: { date: string; close: number }[];
    inst: { date: string; foreign: number; trust: number }[];
    margin: { date: string; balance: number }[];
}

const OptimalEntrySection: React.FC<{ results: WindowResult[] | null }> = ({ results }) => {
    const [optimalCatTab, setOptimalCatTab] = useState<'ETF' | '上市' | '上櫃'>('上市');

    const optimalCatStats = useMemo(() => {
        if (!results?.length) return null;
        const etf = buildOptimalCatStats(results, 'ETF');
        const listed = buildOptimalCatStats(results, '上市');
        const otc = buildOptimalCatStats(results, '上櫃');
        if (!etf && !listed && !otc) return null;
        return { ETF: etf, 上市: listed, 上櫃: otc };
    }, [results]);

    const avgImprovement = results?.length ? avg(results.map(r => r.improvement)) : null;
    const couldImprove = results?.filter(r => r.improvement > 0.5).length ?? 0;
    const losers = results?.filter(r => r.actualReturn < 0) ?? [];
    const avgLossReduction = losers.length ? avg(losers.map(r => r.improvement)) : null;
    const lossAvoided = losers.filter(r => r.bestReturn >= 0).length;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">±N日最佳進場分析</h3>
                <span className="text-xs text-slate-500 ml-1">若改在附近最低價入場，報酬率可提升多少？</span>
            </div>
            <div className="p-4 space-y-4">
                {!results && (
                    <div className="text-center py-12 text-slate-500 text-sm">尚未執行分析，請至上方點擊「開始分析」</div>
                )}
                {results && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">平均可改善報酬</div>
                                <div className={`text-lg font-bold ${(avgImprovement ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {avgImprovement !== null ? `+${avgImprovement.toFixed(2)}%` : '-'}
                                </div>
                                <div className="text-[10px] text-slate-500">全部交易</div>
                            </div>
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">可顯著改善筆數</div>
                                <div className="text-lg font-bold text-amber-400">{couldImprove} / {results.length}</div>
                                <div className="text-[10px] text-slate-500">改善 &gt; 0.5%</div>
                            </div>
                            <div className="bg-red-900/30 border border-red-800/40 rounded-xl p-3 text-center">
                                <div className="text-xs text-red-400 mb-1">虧損交易筆數</div>
                                <div className="text-lg font-bold text-red-400">{losers.length}</div>
                                <div className="text-[10px] text-slate-500">實際負報酬</div>
                            </div>
                            <div className="bg-red-900/30 border border-red-800/40 rounded-xl p-3 text-center">
                                <div className="text-xs text-red-400 mb-1">虧損平均可減少</div>
                                <div className={`text-lg font-bold ${(avgLossReduction ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {avgLossReduction !== null ? `+${avgLossReduction.toFixed(2)}%` : '-'}
                                </div>
                                <div className="text-[10px] text-slate-500">提早/延後進場</div>
                            </div>
                            <div className="bg-red-900/30 border border-red-800/40 rounded-xl p-3 text-center">
                                <div className="text-xs text-red-400 mb-1">可轉為獲利</div>
                                <div className="text-lg font-bold text-emerald-400">{lossAvoided} 筆</div>
                                <div className="text-[10px] text-slate-500">最佳日報酬 ≥ 0</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                                    <th className="py-2 px-3">標的</th>
                                    <th className="py-2 px-3 text-center">進場日</th>
                                    <th className="py-2 px-3 text-center">出場日</th>
                                    <th className="py-2 px-3 text-right">實際買入</th>
                                    <th className="py-2 px-3 text-right">實際報酬</th>
                                    <th className="py-2 px-3 text-center text-sky-400">B5</th>
                                    <th className="py-2 px-3 text-center text-violet-400">B10</th>
                                    <th className="py-2 px-3 text-center text-slate-400">B20</th>
                                    <th className="py-2 px-3 text-center">最佳日（偏移）</th>
                                    <th className="py-2 px-3 text-right">最佳價格</th>
                                    <th className="py-2 px-3 text-right">最佳報酬</th>
                                    <th className="py-2 px-3 text-center text-sky-400">最佳B5</th>
                                    <th className="py-2 px-3 text-center text-violet-400">最佳B10</th>
                                    <th className="py-2 px-3 text-center text-slate-400">最佳B20</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳RSI</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳斜率</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳外資</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳投信</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳融資</th>
                                    <th className="py-2 px-3 text-right">可改善</th>
                                </tr></thead>
                                <tbody>
                                    {results.slice(0, 50).map((r, i) => (
                                        <tr key={i} className={`border-t border-slate-700/30 transition-colors ${r.actualReturn < 0 ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-slate-700/10'}`}>
                                            <td className="py-2 px-3 text-sm">
                                                <div className="font-medium text-white">{r.name ?? r.symbol}</div>
                                                <div className="text-xs text-slate-500">{r.symbol}</div>
                                            </td>
                                            <td className="py-2 px-3 text-center text-xs text-slate-400">{r.buyDate}</td>
                                            <td className="py-2 px-3 text-center text-xs text-slate-400">{r.sellDate}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm text-slate-300">{r.actualBuyPrice}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm">
                                                <span className={r.actualReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {r.actualReturn >= 0 ? '+' : ''}{r.actualReturn.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-sky-400">{r.actualBias5 !== null ? `${r.actualBias5.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-violet-400">{r.actualBias10 !== null ? `${r.actualBias10.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{r.actualBias20 !== null ? `${r.actualBias20.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center text-xs">
                                                <span className="text-slate-300">{r.bestDate}</span>
                                                <span className={`ml-1 ${r.dayOffset > 0 ? 'text-sky-400' : r.dayOffset < 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    {r.dayOffset > 0 ? `(早 ${r.dayOffset}天)` : r.dayOffset < 0 ? `(晚 ${Math.abs(r.dayOffset)}天)` : '(同日)'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-sm text-slate-300">{r.bestPrice}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm">
                                                <span className={r.bestReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {r.bestReturn >= 0 ? '+' : ''}{r.bestReturn.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-sky-400">{r.bestBias5 !== null ? `${r.bestBias5.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-violet-400">{r.bestBias10 !== null ? `${r.bestBias10.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{r.bestBias20 !== null ? `${r.bestBias20.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestRsi != null ? r.bestRsi.toFixed(1) : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestSlopeUpDays != null ? `${r.bestSlopeUpDays}天` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestForeignConsecBuy != null ? `${r.bestForeignConsecBuy}天` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestTrustConsecBuy != null ? `${r.bestTrustConsecBuy}天` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestMarginConsecIncrease != null ? `${r.bestMarginConsecIncrease}天` : '-'}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm font-bold">
                                                <span className={r.improvement > 0.5 ? 'text-amber-400' : r.improvement > 0 ? 'text-slate-300' : 'text-slate-500'}>
                                                    {r.improvement > 0 ? '+' : ''}{r.improvement.toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {optimalCatStats && (
                            <div className="pt-4 border-t border-slate-700 space-y-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-200">最佳進場點參數中位數</h4>
                                    <span className="text-xs text-slate-500">依分類彙總 — 供進場條件分析參考優化後門檻</span>
                                </div>
                                <div className="flex gap-1">
                                    {(['ETF', '上市', '上櫃'] as const).map(tab => {
                                        const s = optimalCatStats[tab];
                                        const disabled = !s;
                                        return (
                                            <button key={tab} onClick={() => !disabled && setOptimalCatTab(tab)}
                                                disabled={disabled}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                    optimalCatTab === tab && !disabled
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                        : disabled
                                                            ? 'text-slate-600 cursor-not-allowed'
                                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                                }`}>
                                                {tab}
                                                {s ? <span className="ml-1 text-slate-500">({s.n}/{s.rawN})</span>
                                                   : <span className="ml-1 text-slate-600">(不足)</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {optimalCatStats[optimalCatTab] ? (
                                    <>
                                    <div className="text-xs text-slate-500">
                                        優質數據篩選：改善幅度前 70%（{optimalCatStats[optimalCatTab]!.rawN} 筆中保留 {optimalCatStats[optimalCatTab]!.n} 筆，門檻 ≥ {optimalCatStats[optimalCatTab]!.qualityCutoff.toFixed(1)}%）
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <StatCard label="RSI 中位數" value={optimalCatStats[optimalCatTab]!.medRsi?.toFixed(1) ?? '-'} color="text-amber-300" />
                                        <StatCard label="Bias5 中位數" value={optimalCatStats[optimalCatTab]!.medBias5 !== null ? `${optimalCatStats[optimalCatTab]!.medBias5!.toFixed(1)}%` : '-'} color="text-sky-400" />
                                        <StatCard label="Bias10 中位數" value={optimalCatStats[optimalCatTab]!.medBias10 !== null ? `${optimalCatStats[optimalCatTab]!.medBias10!.toFixed(1)}%` : '-'} color="text-violet-400" />
                                        <StatCard label="Bias20 中位數" value={optimalCatStats[optimalCatTab]!.medBias20 !== null ? `${optimalCatStats[optimalCatTab]!.medBias20!.toFixed(1)}%` : '-'} color="text-slate-300" />
                                        <StatCard label="斜率連升天數中位數" value={optimalCatStats[optimalCatTab]!.medSlopeUpDays !== null ? `${optimalCatStats[optimalCatTab]!.medSlopeUpDays}天` : '-'} color="text-amber-300" />
                                        <StatCard label="外資連買天數中位數" value={optimalCatStats[optimalCatTab]!.medForeignConsecBuy !== null ? `${optimalCatStats[optimalCatTab]!.medForeignConsecBuy}天` : '-'} color="text-amber-300" />
                                        <StatCard label="投信連買天數中位數" value={optimalCatStats[optimalCatTab]!.medTrustConsecBuy !== null ? `${optimalCatStats[optimalCatTab]!.medTrustConsecBuy}天` : '-'} color="text-amber-300" />
                                        <StatCard label="融資連增天數中位數" value={optimalCatStats[optimalCatTab]!.medMarginConsecIncrease !== null ? `${optimalCatStats[optimalCatTab]!.medMarginConsecIncrease}天` : '-'} color="text-amber-300" />
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-xs text-slate-500 py-4 text-center">此類別資料不足（上市/上櫃需 ≥3 筆，ETF 需 ≥1 筆）</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const daysBetween2 = (d1: string, d2: string) => {
    const diff = new Date(d2).getTime() - new Date(d1).getTime();
    return Math.round(diff / 86400000);
};

// ── Section 4：出場分析（對稱於 ±N日最佳進場分析，改找最佳「出場」日）────────
interface ExitWindowResult {
    symbol: string;
    name?: string;
    category: 'ETF' | '上市' | '上櫃';
    buyDate: string;
    sellDate: string;
    buyPrice: number;
    actualSellPrice: number;
    actualReturn: number;
    actualBias5: number | null;
    actualBias10: number | null;
    actualBias20: number | null;
    bestDate: string;
    bestPrice: number;
    bestReturn: number;
    bestBias5: number | null;
    bestBias10: number | null;
    bestBias20: number | null;
    improvement: number;
    dayOffset: number;
    actualRsi: number | null;
    actualSlopeUpDays: number | null;
    actualForeignConsecBuy: number | null;
    actualTrustConsecBuy: number | null;
    actualMarginConsecIncrease: number | null;
    bestRsi: number | null;
    bestSlopeUpDays: number | null;
    bestForeignConsecBuy: number | null;
    bestTrustConsecBuy: number | null;
    bestMarginConsecIncrease: number | null;
}

interface ExitCatStats {
    cat: 'ETF' | '上市' | '上櫃';
    n: number;
    rawN: number;
    qualityCutoff: number;
    medRsi: number | null;
    medBias5: number | null;
    medBias10: number | null;
    medBias20: number | null;
    medSlopeUpDays: number | null;
    medForeignConsecBuy: number | null;
    medTrustConsecBuy: number | null;
    medMarginConsecIncrease: number | null;
}

const buildExitCatStats = (results: ExitWindowResult[], cat: 'ETF' | '上市' | '上櫃'): ExitCatStats | null => {
    const minN = cat === 'ETF' ? 1 : 3;
    const catList = results.filter(r => r.category === cat);
    if (catList.length < minN) return null;

    const { kept: list, cutoff } = filterQualityTrades(catList);
    if (list.length < minN) return null;

    return {
        cat,
        n: list.length,
        rawN: catList.length,
        qualityCutoff: cutoff,
        medRsi: median(list.map(r => r.bestRsi).filter(notNull)),
        medBias5: median(list.map(r => r.bestBias5).filter(notNull)),
        medBias10: median(list.map(r => r.bestBias10).filter(notNull)),
        medBias20: median(list.map(r => r.bestBias20).filter(notNull)),
        medSlopeUpDays: median(list.map(r => r.bestSlopeUpDays).filter(notNull)),
        medForeignConsecBuy: median(list.map(r => r.bestForeignConsecBuy).filter(notNull)),
        medTrustConsecBuy: median(list.map(r => r.bestTrustConsecBuy).filter(notNull)),
        medMarginConsecIncrease: median(list.map(r => r.bestMarginConsecIncrease).filter(notNull)),
    };
};

const ExitAnalysisSection: React.FC<{ results: ExitWindowResult[] | null }> = ({ results }) => {
    const [exitCatTab, setExitCatTab] = useState<'ETF' | '上市' | '上櫃'>('上市');

    const exitCatStats = useMemo(() => {
        if (!results?.length) return null;
        const etf = buildExitCatStats(results, 'ETF');
        const listed = buildExitCatStats(results, '上市');
        const otc = buildExitCatStats(results, '上櫃');
        if (!etf && !listed && !otc) return null;
        return { ETF: etf, 上市: listed, 上櫃: otc };
    }, [results]);

    const avgImprovement = results?.length ? avg(results.map(r => r.improvement)) : null;
    const couldImprove = results?.filter(r => r.improvement > 0.5).length ?? 0;
    const losers = results?.filter(r => r.actualReturn < 0) ?? [];
    const avgLossReduction = losers.length ? avg(losers.map(r => r.improvement)) : null;
    const lossAvoided = losers.filter(r => r.bestReturn >= 0).length;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <Target size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">出場分析</h3>
                <span className="text-xs text-slate-500 ml-1">若改在附近最高價出場，報酬率可提升多少？</span>
            </div>
            <div className="p-4 space-y-4">
                {!results && (
                    <div className="text-center py-12 text-slate-500 text-sm">尚未執行分析，請至上方點擊「開始分析」</div>
                )}
                {results && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">平均可改善報酬</div>
                                <div className={`text-lg font-bold ${(avgImprovement ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {avgImprovement !== null ? `+${avgImprovement.toFixed(2)}%` : '-'}
                                </div>
                                <div className="text-[10px] text-slate-500">全部交易</div>
                            </div>
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">可顯著改善筆數</div>
                                <div className="text-lg font-bold text-amber-400">{couldImprove} / {results.length}</div>
                                <div className="text-[10px] text-slate-500">改善 &gt; 0.5%</div>
                            </div>
                            <div className="bg-red-900/30 border border-red-800/40 rounded-xl p-3 text-center">
                                <div className="text-xs text-red-400 mb-1">虧損交易筆數</div>
                                <div className="text-lg font-bold text-red-400">{losers.length}</div>
                                <div className="text-[10px] text-slate-500">實際負報酬</div>
                            </div>
                            <div className="bg-red-900/30 border border-red-800/40 rounded-xl p-3 text-center">
                                <div className="text-xs text-red-400 mb-1">虧損平均可減少</div>
                                <div className={`text-lg font-bold ${(avgLossReduction ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {avgLossReduction !== null ? `+${avgLossReduction.toFixed(2)}%` : '-'}
                                </div>
                                <div className="text-[10px] text-slate-500">提早/延後出場</div>
                            </div>
                            <div className="bg-red-900/30 border border-red-800/40 rounded-xl p-3 text-center">
                                <div className="text-xs text-red-400 mb-1">可轉為獲利</div>
                                <div className="text-lg font-bold text-emerald-400">{lossAvoided} 筆</div>
                                <div className="text-[10px] text-slate-500">最佳日報酬 ≥ 0</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                                    <th className="py-2 px-3">標的</th>
                                    <th className="py-2 px-3 text-center">進場日</th>
                                    <th className="py-2 px-3 text-center">出場日</th>
                                    <th className="py-2 px-3 text-right">實際賣出</th>
                                    <th className="py-2 px-3 text-right">實際報酬</th>
                                    <th className="py-2 px-3 text-center text-sky-400">B5</th>
                                    <th className="py-2 px-3 text-center text-violet-400">B10</th>
                                    <th className="py-2 px-3 text-center text-slate-400">B20</th>
                                    <th className="py-2 px-3 text-center">最佳日（偏移）</th>
                                    <th className="py-2 px-3 text-right">最佳價格</th>
                                    <th className="py-2 px-3 text-right">最佳報酬</th>
                                    <th className="py-2 px-3 text-center text-sky-400">最佳B5</th>
                                    <th className="py-2 px-3 text-center text-violet-400">最佳B10</th>
                                    <th className="py-2 px-3 text-center text-slate-400">最佳B20</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳RSI</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳斜率</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳外資</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳投信</th>
                                    <th className="py-2 px-3 text-center text-amber-400">最佳融資</th>
                                    <th className="py-2 px-3 text-right">可改善</th>
                                </tr></thead>
                                <tbody>
                                    {results.slice(0, 50).map((r, i) => (
                                        <tr key={i} className={`border-t border-slate-700/30 transition-colors ${r.actualReturn < 0 ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-slate-700/10'}`}>
                                            <td className="py-2 px-3 text-sm">
                                                <div className="font-medium text-white">{r.name ?? r.symbol}</div>
                                                <div className="text-xs text-slate-500">{r.symbol}</div>
                                            </td>
                                            <td className="py-2 px-3 text-center text-xs text-slate-400">{r.buyDate}</td>
                                            <td className="py-2 px-3 text-center text-xs text-slate-400">{r.sellDate}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm text-slate-300">{r.actualSellPrice}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm">
                                                <span className={r.actualReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {r.actualReturn >= 0 ? '+' : ''}{r.actualReturn.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-sky-400">{r.actualBias5 !== null ? `${r.actualBias5.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-violet-400">{r.actualBias10 !== null ? `${r.actualBias10.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{r.actualBias20 !== null ? `${r.actualBias20.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center text-xs">
                                                <span className="text-slate-300">{r.bestDate}</span>
                                                <span className={`ml-1 ${r.dayOffset > 0 ? 'text-sky-400' : r.dayOffset < 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    {r.dayOffset > 0 ? `(早 ${r.dayOffset}天)` : r.dayOffset < 0 ? `(晚 ${Math.abs(r.dayOffset)}天)` : '(同日)'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-sm text-slate-300">{r.bestPrice}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm">
                                                <span className={r.bestReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {r.bestReturn >= 0 ? '+' : ''}{r.bestReturn.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-sky-400">{r.bestBias5 !== null ? `${r.bestBias5.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-violet-400">{r.bestBias10 !== null ? `${r.bestBias10.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{r.bestBias20 !== null ? `${r.bestBias20.toFixed(1)}%` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestRsi != null ? r.bestRsi.toFixed(1) : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestSlopeUpDays != null ? `${r.bestSlopeUpDays}天` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestForeignConsecBuy != null ? `${r.bestForeignConsecBuy}天` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestTrustConsecBuy != null ? `${r.bestTrustConsecBuy}天` : '-'}</td>
                                            <td className="py-2 px-3 text-center font-mono text-xs text-amber-300">{r.bestMarginConsecIncrease != null ? `${r.bestMarginConsecIncrease}天` : '-'}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm font-bold">
                                                <span className={r.improvement > 0.5 ? 'text-amber-400' : r.improvement > 0 ? 'text-slate-300' : 'text-slate-500'}>
                                                    {r.improvement > 0 ? '+' : ''}{r.improvement.toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {exitCatStats && (
                            <div className="pt-4 border-t border-slate-700 space-y-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-200">最佳出場點參數中位數</h4>
                                    <span className="text-xs text-slate-500">依分類彙總 — 供停利/停損門檻參考</span>
                                </div>
                                <div className="flex gap-1">
                                    {(['ETF', '上市', '上櫃'] as const).map(tab => {
                                        const s = exitCatStats[tab];
                                        const disabled = !s;
                                        return (
                                            <button key={tab} onClick={() => !disabled && setExitCatTab(tab)}
                                                disabled={disabled}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                    exitCatTab === tab && !disabled
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                        : disabled
                                                            ? 'text-slate-600 cursor-not-allowed'
                                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                                }`}>
                                                {tab}
                                                {s ? <span className="ml-1 text-slate-500">({s.n}/{s.rawN})</span>
                                                   : <span className="ml-1 text-slate-600">(不足)</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {exitCatStats[exitCatTab] ? (
                                    <>
                                    <div className="text-xs text-slate-500">
                                        優質數據篩選：改善幅度前 70%（{exitCatStats[exitCatTab]!.rawN} 筆中保留 {exitCatStats[exitCatTab]!.n} 筆，門檻 ≥ {exitCatStats[exitCatTab]!.qualityCutoff.toFixed(1)}%）
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <StatCard label="RSI 中位數" value={exitCatStats[exitCatTab]!.medRsi?.toFixed(1) ?? '-'} color="text-amber-300" />
                                        <StatCard label="Bias5 中位數" value={exitCatStats[exitCatTab]!.medBias5 !== null ? `${exitCatStats[exitCatTab]!.medBias5!.toFixed(1)}%` : '-'} color="text-sky-400" />
                                        <StatCard label="Bias10 中位數" value={exitCatStats[exitCatTab]!.medBias10 !== null ? `${exitCatStats[exitCatTab]!.medBias10!.toFixed(1)}%` : '-'} color="text-violet-400" />
                                        <StatCard label="Bias20 中位數" value={exitCatStats[exitCatTab]!.medBias20 !== null ? `${exitCatStats[exitCatTab]!.medBias20!.toFixed(1)}%` : '-'} color="text-slate-300" />
                                        <StatCard label="斜率連升天數中位數" value={exitCatStats[exitCatTab]!.medSlopeUpDays !== null ? `${exitCatStats[exitCatTab]!.medSlopeUpDays}天` : '-'} color="text-amber-300" />
                                        <StatCard label="外資連買天數中位數" value={exitCatStats[exitCatTab]!.medForeignConsecBuy !== null ? `${exitCatStats[exitCatTab]!.medForeignConsecBuy}天` : '-'} color="text-amber-300" />
                                        <StatCard label="投信連買天數中位數" value={exitCatStats[exitCatTab]!.medTrustConsecBuy !== null ? `${exitCatStats[exitCatTab]!.medTrustConsecBuy}天` : '-'} color="text-amber-300" />
                                        <StatCard label="融資連增天數中位數" value={exitCatStats[exitCatTab]!.medMarginConsecIncrease !== null ? `${exitCatStats[exitCatTab]!.medMarginConsecIncrease}天` : '-'} color="text-amber-300" />
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-xs text-slate-500 py-4 text-center">此類別資料不足（上市/上櫃需 ≥3 筆，ETF 需 ≥1 筆）</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="text-xs text-slate-400 mb-1">{label}</div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
);

export const DSSLab: React.FC<Props> = ({ stockTransactions }) => {
    const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const symbols = [...new Set(stockTransactions.map(t => t.symbol).filter(Boolean))] as string[];
        Promise.all(symbols.map(async s => [s, await lookupStockName(s)] as [string, string | null]))
            .then(entries => {
                const map = new Map<string, string>();
                entries.forEach(([s, n]) => { if (n) map.set(s, n); });
                setNameMap(map);
            });
    }, [stockTransactions]);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('trades');
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'winrate' | 'entry' | 'optimal' | 'exit'>('winrate');

    const OPTIMAL_CACHE_KEY = 'ft_dsslab_optimal_cache';
    const EXIT_CACHE_KEY = 'ft_dsslab_exit_cache';
    const RAW_CACHE_KEY = 'ft_dsslab_raw_cache';
    const [optimalResults, setOptimalResults] = useState<WindowResult[] | null>(null);
    const [exitResults, setExitResults] = useState<ExitWindowResult[] | null>(null);
    const [analysisRunning, setAnalysisRunning] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);
    const [analysisTs, setAnalysisTs] = useState<number | null>(null);
    const [savedProfileMsg, setSavedProfileMsg] = useState('');

    const allCompleted = useMemo(() => buildCompletedTrades(stockTransactions), [stockTransactions]);

    const filteredTrades = useMemo(() =>
        categoryFilter === 'ALL' ? allCompleted : allCompleted.filter(t => t.category === categoryFilter),
        [allCompleted, categoryFilter]);

    useEffect(() => {
        try {
            const rawOpt = localStorage.getItem(OPTIMAL_CACHE_KEY);
            if (rawOpt) { const p = JSON.parse(rawOpt); setOptimalResults(p.results); setAnalysisTs(p.timestamp); }
        } catch { /* 快取損壞則忽略 */ }
        try {
            const rawExit = localStorage.getItem(EXIT_CACHE_KEY);
            if (rawExit) { const p = JSON.parse(rawExit); setExitResults(p.results); }
        } catch { /* 快取損壞則忽略 */ }
    }, []);

    /** 統一分析：進場+出場一次跑完，共用同一份原始資料抓取（kline/籌碼/融資只抓一次）*/
    const handleRunAnalysis = async () => {
        setAnalysisRunning(true);
        setOptimalResults(null);
        setExitResults(null);
        const params = getTechParameters();
        const symbols = [...new Set(filteredTrades.map(t => t.symbol))];
        const klineCache = new Map<string, { date: string; close: number }[]>();
        const instCache = new Map<string, { date: string; foreign: number; trust: number }[]>();
        const marginCache = new Map<string, { date: string; balance: number }[]>();
        const total = symbols.length;
        let done = 0;

        let rawCache: Record<string, RawCacheEntry> = {};
        try { rawCache = JSON.parse(localStorage.getItem(RAW_CACHE_KEY) || '{}'); } catch { /* 忽略損壞快取 */ }

        for (const sym of symbols) {
            setAnalysisProgress({ done, total });
            const symTrades = filteredTrades.filter(t => t.symbol === sym);
            const minDate = symTrades.reduce((m, t) => t.buyDate < m ? t.buyDate : m, symTrades[0].buyDate);
            const maxDate = symTrades.reduce((m, t) => t.sellDate > m ? t.sellDate : m, symTrades[0].sellDate);
            const cacheKey = `${sym}|${minDate}|${maxDate}|${WINDOW_DAYS}`;
            const cached = rawCache[cacheKey];

            if (cached) {
                klineCache.set(sym, cached.kline);
                instCache.set(sym, cached.inst);
                marginCache.set(sym, cached.margin);
                done++;
                continue;
            }

            const full = await fetchKlineWindow(sym, minDate, WINDOW_DAYS + 5, daysBetween2(minDate, maxDate) + WINDOW_DAYS + 5);
            if (full) klineCache.set(sym, full);

            const rangeStart = new Date(minDate); rangeStart.setDate(rangeStart.getDate() - WINDOW_DAYS - 10);
            const rangeEnd = new Date(maxDate); rangeEnd.setDate(rangeEnd.getDate() + WINDOW_DAYS + 10);
            const rangeStartStr = rangeStart.toISOString().slice(0, 10);
            const rangeEndStr = rangeEnd.toISOString().slice(0, 10);
            const [instRows, marginRows] = await Promise.all([
                fetchHistoricalInstForBacktest(sym, rangeStartStr, rangeEndStr),
                fetchHistoricalMarginForBacktest(sym, rangeStartStr, rangeEndStr),
            ]);
            if (instRows) instCache.set(sym, instRows);
            if (marginRows) marginCache.set(sym, marginRows);

            rawCache[cacheKey] = { kline: full ?? [], inst: instRows ?? [], margin: marginRows ?? [] };
            done++;
        }
        setAnalysisProgress({ done: total, total });
        try { localStorage.setItem(RAW_CACHE_KEY, JSON.stringify(rawCache)); } catch { /* 空間不足則不快取原始資料 */ }

        const optResults: WindowResult[] = [];
        const extResults: ExitWindowResult[] = [];
        for (const trade of filteredTrades) {
            const kline = klineCache.get(trade.symbol);
            if (!kline) continue;
            const instRows = instCache.get(trade.symbol) ?? [];
            const marginRows = marginCache.get(trade.symbol) ?? [];
            const sizeCategory = trade.category === 'ETF' ? 'ETF' : trade.category === '上櫃' ? 'SMALL_CAP' : 'LARGE_CAP';

            // 進場：買入日 ±WINDOW_DAYS 內找報酬最大化（等同最低價）的一天
            const buyCandidates = kline.filter(r => {
                const diff = daysBetween2(r.date, trade.buyDate);
                return diff >= -WINDOW_DAYS && diff <= WINDOW_DAYS;
            });
            if (buyCandidates.length) {
                const withReturns = buyCandidates.map(c => ({ ...c, ret: trade.sellPrice > 0 ? ((trade.sellPrice - c.close) / c.close) * 100 : -Infinity }));
                const best = withReturns.reduce((m, c) => c.ret > m.ret ? c : m, withReturns[0]);
                const bestReturn = best.ret === -Infinity ? 0 : best.ret;
                const actualBias = computeMultiBias(kline, trade.buyDate);
                const bestBias = computeMultiBias(kline, best.date);
                const actualDss = computeDSSForDate(kline, instRows, marginRows, trade.buyDate, params, sizeCategory);
                const bestDss = computeDSSForDate(kline, instRows, marginRows, best.date, params, sizeCategory);
                optResults.push({
                    symbol: trade.symbol, name: nameMap.get(trade.symbol), category: trade.category,
                    buyDate: trade.buyDate, sellDate: trade.sellDate, sellPrice: trade.sellPrice,
                    actualBuyPrice: trade.buyPrice, actualReturn: trade.returnPct,
                    actualBias5: actualBias.bias5, actualBias10: actualBias.bias10, actualBias20: actualBias.bias20,
                    bestDate: best.date, bestPrice: best.close, bestReturn,
                    bestBias5: bestBias.bias5, bestBias10: bestBias.bias10, bestBias20: bestBias.bias20,
                    improvement: bestReturn - trade.returnPct, dayOffset: daysBetween2(best.date, trade.buyDate),
                    actualRsi: actualDss?.rsi ?? null, actualSlopeUpDays: actualDss ? slopeConsecUp(actualDss.biasSlopes) : null,
                    actualForeignConsecBuy: actualDss?.foreignConsecBuy ?? null, actualTrustConsecBuy: actualDss?.trustConsecBuy ?? null,
                    actualMarginConsecIncrease: actualDss?.marginConsecIncrease ?? null,
                    bestRsi: bestDss?.rsi ?? null, bestSlopeUpDays: bestDss ? slopeConsecUp(bestDss.biasSlopes) : null,
                    bestForeignConsecBuy: bestDss?.foreignConsecBuy ?? null, bestTrustConsecBuy: bestDss?.trustConsecBuy ?? null,
                    bestMarginConsecIncrease: bestDss?.marginConsecIncrease ?? null,
                });
            }

            // 出場：賣出日 ±WINDOW_DAYS 內（不早於買入日）找報酬最大化（等同最高價）的一天
            const sellCandidates = kline.filter(r => {
                const diff = daysBetween2(r.date, trade.sellDate);
                return diff >= -WINDOW_DAYS && diff <= WINDOW_DAYS && r.date >= trade.buyDate;
            });
            if (sellCandidates.length) {
                const withReturns = sellCandidates.map(c => ({ ...c, ret: trade.buyPrice > 0 ? ((c.close - trade.buyPrice) / trade.buyPrice) * 100 : -Infinity }));
                const best = withReturns.reduce((m, c) => c.ret > m.ret ? c : m, withReturns[0]);
                const bestReturn = best.ret === -Infinity ? 0 : best.ret;
                const actualBias = computeMultiBias(kline, trade.sellDate);
                const bestBias = computeMultiBias(kline, best.date);
                const actualDss = computeDSSForDate(kline, instRows, marginRows, trade.sellDate, params, sizeCategory);
                const bestDss = computeDSSForDate(kline, instRows, marginRows, best.date, params, sizeCategory);
                extResults.push({
                    symbol: trade.symbol, name: nameMap.get(trade.symbol), category: trade.category,
                    buyDate: trade.buyDate, sellDate: trade.sellDate, buyPrice: trade.buyPrice,
                    actualSellPrice: trade.sellPrice, actualReturn: trade.returnPct,
                    actualBias5: actualBias.bias5, actualBias10: actualBias.bias10, actualBias20: actualBias.bias20,
                    bestDate: best.date, bestPrice: best.close, bestReturn,
                    bestBias5: bestBias.bias5, bestBias10: bestBias.bias10, bestBias20: bestBias.bias20,
                    improvement: bestReturn - trade.returnPct, dayOffset: daysBetween2(best.date, trade.sellDate),
                    actualRsi: actualDss?.rsi ?? null, actualSlopeUpDays: actualDss ? slopeConsecUp(actualDss.biasSlopes) : null,
                    actualForeignConsecBuy: actualDss?.foreignConsecBuy ?? null, actualTrustConsecBuy: actualDss?.trustConsecBuy ?? null,
                    actualMarginConsecIncrease: actualDss?.marginConsecIncrease ?? null,
                    bestRsi: bestDss?.rsi ?? null, bestSlopeUpDays: bestDss ? slopeConsecUp(bestDss.biasSlopes) : null,
                    bestForeignConsecBuy: bestDss?.foreignConsecBuy ?? null, bestTrustConsecBuy: bestDss?.trustConsecBuy ?? null,
                    bestMarginConsecIncrease: bestDss?.marginConsecIncrease ?? null,
                });
            }
        }
        const sortedOpt = optResults.sort((a, b) => b.improvement - a.improvement);
        const sortedExt = extResults.sort((a, b) => b.improvement - a.improvement);
        const ts = Date.now();
        setOptimalResults(sortedOpt);
        setExitResults(sortedExt);
        setAnalysisTs(ts);
        try { localStorage.setItem(OPTIMAL_CACHE_KEY, JSON.stringify({ results: sortedOpt, timestamp: ts, window: WINDOW_DAYS })); } catch { /* 空間不足忽略 */ }
        try { localStorage.setItem(EXIT_CACHE_KEY, JSON.stringify({ results: sortedExt, timestamp: ts, window: WINDOW_DAYS })); } catch { /* 空間不足忽略 */ }
        setAnalysisRunning(false);
        setAnalysisProgress(null);
    };

    /** 匯出進場+出場分析結果與原始資料快取，一起打包成一份 JSON */
    const handleExportAnalysis = () => {
        if (!optimalResults?.length && !exitResults?.length) return;
        let rawCache: Record<string, RawCacheEntry> = {};
        try { rawCache = JSON.parse(localStorage.getItem(RAW_CACHE_KEY) || '{}'); } catch { /* 忽略損壞快取 */ }
        const payload = { optimalResults, exitResults, timestamp: analysisTs ?? Date.now(), window: WINDOW_DAYS, rawCache };
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dsslab_analysis_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /** 匯入進場+出場打包 JSON，兩邊結果與原始資料快取一起還原 */
    const handleImportAnalysis = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                const hasOpt = Array.isArray(parsed.optimalResults);
                const hasExt = Array.isArray(parsed.exitResults);
                if (!hasOpt && !hasExt) throw new Error('invalid');
                const ts = parsed.timestamp ?? Date.now();
                if (hasOpt) {
                    localStorage.setItem(OPTIMAL_CACHE_KEY, JSON.stringify({ results: parsed.optimalResults, timestamp: ts, window: parsed.window }));
                    setOptimalResults(parsed.optimalResults);
                }
                if (hasExt) {
                    localStorage.setItem(EXIT_CACHE_KEY, JSON.stringify({ results: parsed.exitResults, timestamp: ts, window: parsed.window }));
                    setExitResults(parsed.exitResults);
                }
                if (parsed.rawCache) {
                    try { localStorage.setItem(RAW_CACHE_KEY, JSON.stringify(parsed.rawCache)); } catch { /* 空間不足則跳過原始資料 */ }
                }
                setAnalysisTs(ts);
            } catch {
                alert('匯入失敗：檔案格式不正確');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    /** 把進場(最佳進場日)+出場(最佳出場日)的分類中位數合併存成一份 DSS 設定檔 */
    const handleSaveOptimalProfile = () => {
        if (!optimalResults?.length && !exitResults?.length) return;
        const cats: DSSProfile['categories'] = {};
        (['ETF', '上市', '上櫃'] as const).forEach(cat => {
            const entryStats = optimalResults?.length ? buildOptimalCatStats(optimalResults, cat) : null;
            const exitStats = exitResults?.length ? buildExitCatStats(exitResults, cat) : null;
            if (!entryStats && !exitStats) return;
            cats[cat] = {
                rsi: entryStats?.medRsi ?? 0,
                bias20: entryStats?.medBias20 ?? 0,
                n: entryStats?.n ?? 0,
                slopeUpDays: entryStats?.medSlopeUpDays ?? undefined,
                bias5: entryStats?.medBias5 ?? undefined,
                bias10: entryStats?.medBias10 ?? undefined,
                foreignConsecBuy: entryStats?.medForeignConsecBuy ?? undefined,
                trustConsecBuy: entryStats?.medTrustConsecBuy ?? undefined,
                marginConsecIncrease: entryStats?.medMarginConsecIncrease ?? undefined,
                exitRsi: exitStats?.medRsi ?? undefined,
                exitBias5: exitStats?.medBias5 ?? undefined,
                exitBias10: exitStats?.medBias10 ?? undefined,
                exitBias20: exitStats?.medBias20 ?? undefined,
                exitSlopeUpDays: exitStats?.medSlopeUpDays ?? undefined,
                exitForeignConsecBuy: exitStats?.medForeignConsecBuy ?? undefined,
                exitTrustConsecBuy: exitStats?.medTrustConsecBuy ?? undefined,
                exitMarginConsecIncrease: exitStats?.medMarginConsecIncrease ?? undefined,
                exitN: exitStats?.n ?? undefined,
            };
        });
        if (Object.keys(cats).length === 0) return;
        const profile: DSSProfile = {
            id: crypto.randomUUID(),
            name: `優化參數 ${new Date().toLocaleDateString('zh-TW')}`,
            createdAt: Date.now(),
            source: { total: filteredTrades.length, matched: optimalResults?.length ?? exitResults?.length ?? 0 },
            categories: cats,
        };
        const profiles = getDSSProfiles();
        saveDSSProfiles([...profiles, profile]);
        setSavedProfileMsg('已儲存！可至系統設定套用');
        setTimeout(() => setSavedProfileMsg(''), 3000);
    };

    const symbolStats = useMemo(() => {
        const stats = buildSymbolStats(filteredTrades);
        return [...stats].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'trades')      cmp = a.trades.length - b.trades.length;
            else if (sortKey === 'winRate')    cmp = a.winRate - b.winRate;
            else if (sortKey === 'avgProfit')  cmp = a.avgProfit - b.avgProfit;
            else if (sortKey === 'totalPnL')   cmp = a.totalPnL - b.totalPnL;
            else if (sortKey === 'avgHolding') cmp = a.avgHoldingDays - b.avgHoldingDays;
            return sortAsc ? cmp : -cmp;
        });
    }, [filteredTrades, sortKey, sortAsc]);

    const summary = useMemo(() => {
        if (!filteredTrades.length) return null;
        const wins = filteredTrades.filter(t => t.realizedProfit > 0);
        const totalPnL = filteredTrades.reduce((s, t) => s + t.realizedProfit, 0);
        const avgHolding = filteredTrades.reduce((s, t) => s + t.holdingDays, 0) / filteredTrades.length;
        const avgReturn = filteredTrades.reduce((s, t) => s + t.returnPct, 0) / filteredTrades.length;
        return {
            total: filteredTrades.length,
            winRate: (wins.length / filteredTrades.length) * 100,
            totalPnL,
            avgHolding,
            avgReturn,
        };
    }, [filteredTrades]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(p => !p);
        else { setSortKey(key); setSortAsc(false); }
    };

    const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
        ? (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
        : null;

    const catColor = (cat: string) => {
        if (cat === 'ETF') return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
        if (cat === '上櫃') return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
        return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
                    <FlaskConical size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">DSS 實驗室</h1>
                    <p className="text-xs text-slate-400">訊號品質分析 · 以真實交易結果回推最佳參數</p>
                </div>
            </div>

            {allCompleted.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
                    <p>尚無完整交易紀錄（需有買入對應的賣出資料）</p>
                </div>
            ) : (
                <>
                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        {(['ALL', 'ETF', '上市', '上櫃'] as CategoryFilter[]).map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${categoryFilter === cat ? 'bg-violet-600/30 text-violet-300 border-violet-500/50' : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'}`}>
                                {cat === 'ALL' ? '全部' : cat}
                            </button>
                        ))}
                        <span className="ml-auto text-xs text-slate-500">{filteredTrades.length} 筆完整交易</span>
                    </div>

                    {/* Summary Cards */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard label="整體勝率" value={`${summary.winRate.toFixed(1)}%`}
                                sub={`${filteredTrades.filter(t => t.realizedProfit > 0).length} 勝 / ${filteredTrades.filter(t => t.realizedProfit <= 0).length} 敗`}
                                color={summary.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
                            <StatCard label="累計損益" value={`${summary.totalPnL >= 0 ? '+' : ''}${summary.totalPnL.toLocaleString()}`}
                                color={summary.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                            <StatCard label="平均報酬率" value={`${summary.avgReturn >= 0 ? '+' : ''}${summary.avgReturn.toFixed(2)}%`}
                                color={summary.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                            <StatCard label="平均持倉天數" value={`${summary.avgHolding.toFixed(1)} 天`} color="text-slate-200" />
                        </div>
                    )}

                    {/* Section Tabs */}
                    <div className="flex gap-2 border-b border-slate-800">
                        {([
                            { key: 'winrate', label: '標的勝率排行', icon: Trophy },
                            { key: 'entry', label: '進場條件分析', icon: BarChart2 },
                            { key: 'optimal', label: '±N日最佳進場分析', icon: Zap },
                            { key: 'exit', label: '出場分析', icon: Target },
                        ] as const).map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setActiveSection(key)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeSection === key ? 'bg-slate-800/50 text-violet-400 border-b-2 border-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* 統一分析工具列：進場+出場一起跑、一起匯出/匯入，避免各分頁分開操作 */}
                    {(activeSection === 'optimal' || activeSection === 'exit') && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-slate-400">視窗範圍：±{WINDOW_DAYS} 日（進場+出場一起分析）</span>
                            <button onClick={handleRunAnalysis} disabled={analysisRunning}
                                className="px-4 py-1.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white border border-violet-500 disabled:opacity-50 flex items-center gap-2 transition-all">
                                {analysisRunning ? <><Loader2 size={14} className="animate-spin" />分析中…</> : '開始分析'}
                            </button>
                            {analysisProgress && <span className="text-xs text-slate-400">{analysisProgress.done}/{analysisProgress.total} 標的</span>}
                            {analysisTs && !analysisRunning && <span className="text-xs text-slate-500">上次分析：{new Date(analysisTs).toLocaleString('zh-TW', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>}
                            <div className="ml-auto flex items-center gap-2">
                                {savedProfileMsg && <span className="text-xs text-emerald-400">{savedProfileMsg}</span>}
                                {(optimalResults?.length || exitResults?.length) ? (
                                    <button onClick={handleSaveOptimalProfile}
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg transition-colors">
                                        <Save size={12} />儲存為設定檔
                                    </button>
                                ) : null}
                                {(optimalResults?.length || exitResults?.length) ? (
                                    <button onClick={handleExportAnalysis}
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg transition-colors">
                                        <Download size={12} />匯出快取
                                    </button>
                                ) : null}
                                <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg transition-colors cursor-pointer">
                                    <Upload size={12} />匯入快取
                                    <input type="file" accept="application/json" className="hidden" onChange={handleImportAnalysis} />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Symbol Stats Table */}
                    {activeSection === 'winrate' && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                            <Trophy size={16} className="text-amber-400" />
                            <h3 className="text-sm font-bold text-slate-200">標的勝率排行</h3>
                            <span className="text-xs text-slate-500 ml-1">（點擊展開明細）</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-900 z-10">
                                    <tr className="text-xs text-slate-400 uppercase">
                                        <th className="p-3 font-medium">標的</th>
                                        <th className="p-3 font-medium text-center cursor-pointer select-none hover:text-white" onClick={() => toggleSort('trades')}>
                                            <span className="flex items-center justify-center gap-1">交易數 <SortIcon k="trades" /></span>
                                        </th>
                                        <th className="p-3 font-medium text-center cursor-pointer select-none hover:text-white" onClick={() => toggleSort('winRate')}>
                                            <span className="flex items-center justify-center gap-1">勝率 <SortIcon k="winRate" /></span>
                                        </th>
                                        <th className="p-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('avgProfit')}>
                                            <span className="flex items-center justify-end gap-1">平均損益 <SortIcon k="avgProfit" /></span>
                                        </th>
                                        <th className="p-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('totalPnL')}>
                                            <span className="flex items-center justify-end gap-1">累計損益 <SortIcon k="totalPnL" /></span>
                                        </th>
                                        <th className="p-3 font-medium text-center cursor-pointer select-none hover:text-white" onClick={() => toggleSort('avgHolding')}>
                                            <span className="flex items-center justify-center gap-1">平均持倉 <SortIcon k="avgHolding" /></span>
                                        </th>
                                        <th className="p-3 font-medium text-right">最大獲利 / 最大虧損</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {symbolStats.map(s => (
                                        <React.Fragment key={s.symbol}>
                                            <tr className="border-t border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors"
                                                onClick={() => setExpandedSymbol(expandedSymbol === s.symbol ? null : s.symbol)}>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            {(nameMap.get(s.symbol) ?? s.name) && <div className="font-bold text-white text-sm">{nameMap.get(s.symbol) ?? s.name}</div>}
                                                            <div className={`font-mono ${(nameMap.get(s.symbol) ?? s.name) ? 'text-xs text-slate-500' : 'font-bold text-white text-sm'}`}>{s.symbol}</div>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${catColor(s.category)}`}>{s.category}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="text-white font-bold">{s.trades.length}</span>
                                                    <span className="text-xs text-slate-500 ml-1">筆</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className={`font-bold text-sm ${s.winRate >= 60 ? 'text-emerald-400' : s.winRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {s.winRate.toFixed(0)}%
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{s.wins}W / {s.losses}L</div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={`font-mono text-sm font-bold ${s.avgProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {s.avgProfit >= 0 ? '+' : ''}{s.avgProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <div className="text-[10px] text-slate-500">{s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(2)}%</div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={`font-mono text-sm font-bold ${s.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {s.totalPnL >= 0 ? '+' : ''}{s.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center text-slate-300 text-sm">
                                                    {s.avgHoldingDays.toFixed(1)} 天
                                                </td>
                                                <td className="p-3 text-right text-xs">
                                                    {s.maxProfit > 0 && <div className="text-emerald-400">+{s.maxProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                                                    {s.maxLoss < 0 && <div className="text-red-400">{s.maxLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                                                </td>
                                            </tr>
                                            {expandedSymbol === s.symbol && (
                                                <tr className="bg-slate-900/60">
                                                    <td colSpan={7} className="px-6 py-3">
                                                        <div className="text-xs text-slate-400 mb-2 font-semibold">交易明細</div>
                                                        <div className="space-y-1">
                                                            {s.trades.sort((a, b) => b.sellDate.localeCompare(a.sellDate)).map((t, i) => (
                                                                <div key={i} className="flex items-center gap-4 text-xs">
                                                                    <span className="text-slate-500 w-20">{t.buyDate}</span>
                                                                    <span className="text-slate-500">→</span>
                                                                    <span className="text-slate-500 w-20">{t.sellDate}</span>
                                                                    <span className="text-slate-400 w-10 text-right">{t.holdingDays}天</span>
                                                                    <span className="text-slate-400">買 {t.buyPrice} → 賣 {t.sellPrice}</span>
                                                                    <span className={`ml-auto font-mono font-bold ${t.realizedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                        {t.realizedProfit >= 0 ? '+' : ''}{t.realizedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                    </span>
                                                                    <span className={`w-14 text-right ${t.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                        {t.returnPct >= 0 ? '+' : ''}{t.returnPct.toFixed(2)}%
                                                                    </span>
                                                                    <span className={`w-6 text-center ${t.realizedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                        {t.realizedProfit >= 0 ? '✓' : '✗'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    )}

                    {activeSection === 'entry' && <SignalQualitySection completedTrades={filteredTrades} nameMap={nameMap} />}
                    {activeSection === 'optimal' && <OptimalEntrySection results={optimalResults} />}
                    {activeSection === 'exit' && <ExitAnalysisSection results={exitResults} />}
                </>
            )}
        </div>
    );
};
