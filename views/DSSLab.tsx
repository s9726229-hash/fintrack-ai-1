import React, { useMemo, useState, useEffect } from 'react';
import { FlaskConical, Trophy, Target, ChevronDown, ChevronUp, BarChart2, Zap, Loader2 } from 'lucide-react';
import { StockTransaction, BacktestResult } from '../types';
import { lookupStockName, fetchKlineWindow } from '../services/stock';
import { getBacktestCache } from '../services/storage';

interface Props {
    stockTransactions: StockTransaction[];
}

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
        const buyQueue: StockTransaction[] = [];
        for (const t of sorted) {
            if (t.side === 'BUY') {
                buyQueue.push(t);
            } else if (t.side === 'SELL' && t.realizedProfit !== undefined) {
                const buy = buyQueue.shift();
                if (!buy) continue;
                const returnPct = buy.price > 0 ? ((t.price - buy.price) / buy.price) * 100 : 0;
                result.push({
                    symbol,
                    name: t.name ?? buy.name,
                    category: guessCategory(symbol),
                    buyDate: buy.date,
                    sellDate: t.date,
                    buyPrice: buy.price,
                    sellPrice: t.price,
                    shares: t.shares,
                    realizedProfit: t.realizedProfit,
                    returnPct,
                    holdingDays: daysBetween(buy.date, t.date),
                });
            }
        }
    }
    return result;
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

const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

const CmpRow = ({ label, wVal, lVal, unit = '', inverse = false }: {
    label: string; wVal: number | null; lVal: number | null; unit?: string; inverse?: boolean;
}) => {
    if (wVal === null || lVal === null) return null;
    const winnerBetter = inverse ? wVal < lVal : wVal > lVal;
    return (
        <tr className="border-t border-slate-700/40">
            <td className="py-2.5 px-3 text-sm text-slate-300">{label}</td>
            <td className="py-2.5 px-3 text-center font-mono text-sm text-emerald-400 font-bold">{wVal.toFixed(1)}{unit}</td>
            <td className="py-2.5 px-3 text-center font-mono text-sm text-red-400 font-bold">{lVal.toFixed(1)}{unit}</td>
            <td className="py-2.5 px-3 text-center text-xs text-slate-400">
                {winnerBetter
                    ? <span className="text-emerald-400">Winner 較優 ↑</span>
                    : <span className="text-amber-400">差距不明顯</span>}
            </td>
            <td className="py-2.5 px-3 text-right text-xs font-mono text-violet-300">
                {inverse
                    ? `< ${((wVal + lVal) / 2).toFixed(1)}${unit}`
                    : `≥ ${((wVal + lVal) / 2).toFixed(1)}${unit}`}
            </td>
        </tr>
    );
};

const SignalQualitySection: React.FC<{ completedTrades: CompletedTrade[]; nameMap: Map<string, string> }> = ({ completedTrades }) => {
    const [enriched, setEnriched] = useState<EnrichedTrade[] | null>(null);

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

    const stats = useMemo(() => {
        if (!enriched?.length) return null;
        const withDSS = enriched.filter(t => t.rsi !== undefined);
        if (!withDSS.length) return null;
        const winners = withDSS.filter(t => t.realizedProfit > 0);
        const losers  = withDSS.filter(t => t.realizedProfit <= 0);
        return {
            matched: withDSS.length,
            winners: winners.length,
            losers: losers.length,
            wRsi:   avg(winners.map(t => t.rsi!)),
            lRsi:   avg(losers.map(t => t.rsi!)),
            wBias:  avg(winners.map(t => t.bias20!)),
            lBias:  avg(losers.map(t => t.bias20!)),
            wForeign: avg(winners.map(t => t.foreignConsecBuy ?? 0)),
            lForeign: avg(losers.map(t => t.foreignConsecBuy ?? 0)),
            wTrust:   avg(winners.map(t => t.trustConsecBuy ?? 0)),
            lTrust:   avg(losers.map(t => t.trustConsecBuy ?? 0)),
            wHolding: avg(winners.map(t => t.holdingDays)),
            lHolding: avg(losers.map(t => t.holdingDays)),
        };
    }, [enriched]);

    if (!enriched) return null;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <BarChart2 size={16} className="text-violet-400" />
                <h3 className="text-sm font-bold text-slate-200">進場條件分析</h3>
                <span className="text-xs text-slate-500 ml-1">交叉比對回測快取 · Winner vs Loser</span>
            </div>
            {!enriched.length || !stats ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                    尚無回測快取 — 請先至「交易紀錄 → DSS 回測分析」執行一次分析
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>已比對 <strong className="text-white">{stats.matched}</strong> 筆</span>
                        <span className="text-emerald-400">✓ Winner {stats.winners} 筆</span>
                        <span className="text-red-400">✗ Loser {stats.losers} 筆</span>
                        {completedTrades.length - stats.matched > 0 &&
                            <span className="text-slate-500">（{completedTrades.length - stats.matched} 筆無快取資料）</span>}
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs text-slate-400">
                                <th className="py-1.5 px-3 text-left font-medium">指標</th>
                                <th className="py-1.5 px-3 text-center font-medium text-emerald-400">Winner 平均</th>
                                <th className="py-1.5 px-3 text-center font-medium text-red-400">Loser 平均</th>
                                <th className="py-1.5 px-3 text-center font-medium">差異</th>
                                <th className="py-1.5 px-3 text-right font-medium text-violet-300">建議門檻</th>
                            </tr>
                        </thead>
                        <tbody>
                            <CmpRow label="RSI 進場" wVal={stats.wRsi} lVal={stats.lRsi} inverse />
                            <CmpRow label="Bias20 進場" wVal={stats.wBias} lVal={stats.lBias} unit="%" inverse />
                            <CmpRow label="外資連買天數" wVal={stats.wForeign} lVal={stats.lForeign} unit="天" />
                            <CmpRow label="投信連買天數" wVal={stats.wTrust}   lVal={stats.lTrust}   unit="天" />
                            <CmpRow label="持倉天數" wVal={stats.wHolding} lVal={stats.lHolding} unit="天" />
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ── Section 3：±N日最佳進場分析 ───────────────────────────────────────────
interface WindowResult {
    symbol: string;
    name?: string;
    buyDate: string;
    sellDate: string;
    sellPrice: number;
    actualBuyPrice: number;
    actualReturn: number;
    bestDate: string;
    bestPrice: number;
    bestReturn: number;
    improvement: number; // bestReturn - actualReturn
    dayOffset: number;   // negative = earlier, positive = later
}

const OptimalEntrySection: React.FC<{ completedTrades: CompletedTrade[]; nameMap: Map<string, string> }> = ({ completedTrades, nameMap }) => {
    const [window_, setWindow_] = useState<5 | 10>(5);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [results, setResults] = useState<WindowResult[] | null>(null);

    const handleRun = async () => {
        setIsRunning(true);
        setResults(null);
        const symbols = [...new Set(completedTrades.map(t => t.symbol))];
        const klineCache = new Map<string, { date: string; close: number }[]>();
        const total = symbols.length;
        let done = 0;

        // 1. 每個 symbol 的 kline（以 buyDate 的最早日期為中心，抓整個交易範圍）
        for (const sym of symbols) {
            setProgress({ done, total });
            const symTrades = completedTrades.filter(t => t.symbol === sym);
            const minDate = symTrades.reduce((m, t) => t.buyDate < m ? t.buyDate : m, symTrades[0].buyDate);
            const maxDate = symTrades.reduce((m, t) => t.sellDate > m ? t.sellDate : m, symTrades[0].sellDate);
            const rows = await fetchKlineWindow(sym, minDate, window_ + 5, 0); // 用最早 buyDate 起抓到 maxDate
            // 實際取完整範圍
            const full = await fetchKlineWindow(sym, minDate, window_ + 5, daysBetween2(minDate, maxDate) + window_ + 5);
            if (full) klineCache.set(sym, full);
            done++;
        }
        setProgress({ done: total, total });

        // 2. 每筆交易找最佳進場日
        const windowResults: WindowResult[] = [];
        for (const trade of completedTrades) {
            const kline = klineCache.get(trade.symbol);
            if (!kline) continue;
            // 取 [buyDate - window_, buyDate + window_] 內的交易日收盤
            const candidates = kline.filter(r => {
                const diff = daysBetween2(r.date, trade.buyDate); // positive = r before buyDate
                return diff >= -window_ && diff <= window_;
            });
            if (!candidates.length) continue;
            // 找最低收盤（最便宜的入場點）
            const best = candidates.reduce((m, c) => c.close < m.close ? c : m, candidates[0]);
            const bestReturn = trade.sellPrice > 0 ? ((trade.sellPrice - best.close) / best.close) * 100 : 0;
            windowResults.push({
                symbol: trade.symbol,
                name: nameMap.get(trade.symbol),
                buyDate: trade.buyDate,
                sellDate: trade.sellDate,
                sellPrice: trade.sellPrice,
                actualBuyPrice: trade.buyPrice,
                actualReturn: trade.returnPct,
                bestDate: best.date,
                bestPrice: best.close,
                bestReturn,
                improvement: bestReturn - trade.returnPct,
                dayOffset: daysBetween2(best.date, trade.buyDate), // positive = best was before actual
            });
        }
        setResults(windowResults.sort((a, b) => b.improvement - a.improvement));
        setIsRunning(false);
        setProgress(null);
    };

    const avgImprovement = results?.length ? avg(results.map(r => r.improvement)) : null;
    const couldImprove = results?.filter(r => r.improvement > 0.5).length ?? 0;

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">±N日最佳進場分析</h3>
                <span className="text-xs text-slate-500 ml-1">若改在附近最低價入場，報酬率可提升多少？</span>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">視窗範圍：</span>
                    {([5, 10] as const).map(n => (
                        <button key={n} onClick={() => setWindow_(n)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${window_ === n ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-slate-400 border-slate-700 hover:text-white'}`}>
                            ±{n} 日
                        </button>
                    ))}
                    <button onClick={handleRun} disabled={isRunning}
                        className="ml-4 px-4 py-1.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white border border-violet-500 disabled:opacity-50 flex items-center gap-2 transition-all">
                        {isRunning ? <><Loader2 size={14} className="animate-spin" />分析中…</> : '開始分析'}
                    </button>
                    {progress && <span className="text-xs text-slate-400">{progress.done}/{progress.total} 標的</span>}
                </div>

                {results && (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">平均可改善報酬</div>
                                <div className={`text-lg font-bold ${(avgImprovement ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {avgImprovement !== null ? `+${avgImprovement.toFixed(2)}%` : '-'}
                                </div>
                            </div>
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">可顯著改善筆數</div>
                                <div className="text-lg font-bold text-amber-400">{couldImprove} / {results.length}</div>
                                <div className="text-[10px] text-slate-500">改善 &gt; 0.5%</div>
                            </div>
                            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">視窗</div>
                                <div className="text-lg font-bold text-violet-300">±{window_} 日</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="text-xs text-slate-400 border-b border-slate-700">
                                    <th className="py-2 px-3">標的</th>
                                    <th className="py-2 px-3 text-center">進場日</th>
                                    <th className="py-2 px-3 text-right">實際買入</th>
                                    <th className="py-2 px-3 text-right">實際報酬</th>
                                    <th className="py-2 px-3 text-center">最佳日（偏移）</th>
                                    <th className="py-2 px-3 text-right">最佳價格</th>
                                    <th className="py-2 px-3 text-right">最佳報酬</th>
                                    <th className="py-2 px-3 text-right">可改善</th>
                                </tr></thead>
                                <tbody>
                                    {results.slice(0, 50).map((r, i) => (
                                        <tr key={i} className="border-t border-slate-700/30 hover:bg-slate-700/10">
                                            <td className="py-2 px-3 text-sm">
                                                <div className="font-medium text-white">{r.name ?? r.symbol}</div>
                                                <div className="text-xs text-slate-500">{r.symbol}</div>
                                            </td>
                                            <td className="py-2 px-3 text-center text-xs text-slate-400">{r.buyDate}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm text-slate-300">{r.actualBuyPrice}</td>
                                            <td className="py-2 px-3 text-right font-mono text-sm">
                                                <span className={r.actualReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {r.actualReturn >= 0 ? '+' : ''}{r.actualReturn.toFixed(2)}%
                                                </span>
                                            </td>
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

    const allCompleted = useMemo(() => buildCompletedTrades(stockTransactions), [stockTransactions]);

    const filteredTrades = useMemo(() =>
        categoryFilter === 'ALL' ? allCompleted : allCompleted.filter(t => t.category === categoryFilter),
        [allCompleted, categoryFilter]);

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
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
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

                    {/* Symbol Stats Table */}
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

                    <SignalQualitySection completedTrades={filteredTrades} nameMap={nameMap} />
                    <OptimalEntrySection completedTrades={filteredTrades} nameMap={nameMap} />
                </>
            )}
        </div>
    );
};
