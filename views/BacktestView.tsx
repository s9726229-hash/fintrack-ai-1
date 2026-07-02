import React, { useState, useMemo, useEffect } from 'react';
import { PlayCircle, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react';
import { StockTransaction, BacktestResult } from '../types';
import { runBacktest } from '../services/stock';
import { getBacktestCache, saveBacktestCache } from '../services/storage';

interface Props {
    allTransactions: StockTransaction[];       // 全部交易（用於執行回測 + 快取）
    filteredTransactions: StockTransaction[];  // 日期/搜尋篩選後的交易（用於顯示）
}

const SIGNAL_LABELS: Record<string, string> = {
    STRONG_BUY: '強力布局', BUY: '適合布局', STRONG_LAYOUT: '籌碼共振',
    ADDITIONAL_BUY: '積極進場', STRONG_ADDITIONAL_BUY: '超跌布局',
    TREND_ADD: '順勢加碼', NONE: '觀察中', RISK_ALERT: '風險預警',
    WATCH_DIVERGE: '籌碼疑慮', PARTIAL_SELL: '高位停利',
    SECOND_PARTIAL_SELL: '嚴重過熱', FORCE_SELL: '強制停利',
    STOP_LOSS_ALERT: '停損預警', SELL: '法人棄守',
};

const getSignalStyle = (sig: string) => {
    if (['STRONG_BUY', 'BUY', 'ADDITIONAL_BUY', 'STRONG_ADDITIONAL_BUY'].includes(sig)) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (['STRONG_LAYOUT', 'TREND_ADD'].includes(sig)) return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    if (sig === 'NONE') return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
    if (sig === 'RISK_ALERT') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (sig === 'WATCH_DIVERGE') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (sig === 'PARTIAL_SELL') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (['SECOND_PARTIAL_SELL', 'FORCE_SELL'].includes(sig)) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (sig === 'STOP_LOSS_ALERT') return 'bg-rose-600/20 text-rose-400 border-rose-600/30';
    if (sig === 'SELL') return 'bg-red-700/20 text-red-400 border-red-700/30';
    return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
};

const getChipStyle = (target: string) => {
    if (target.includes('法人棄守')) return 'text-red-400';
    if (target.includes('籌碼疑慮')) return 'text-orange-400';
    if (target.includes('籌碼偏多')) return 'text-emerald-400';
    if (target.includes('籌碼觀察')) return 'text-sky-400';
    if (target.includes('籌碼偏弱')) return 'text-yellow-400';
    return 'text-slate-400';
};

const AlignmentBadge = ({ alignment }: { alignment: 'MATCH' | 'DIVERGE' | 'PARTIAL' }) => {
    if (alignment === 'MATCH')   return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✓ 吻合</span>;
    if (alignment === 'DIVERGE') return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">✗ 背離</span>;
    return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-700/50 text-slate-400 border border-slate-600/30">— 中性</span>;
};

const GapDisplay = ({ gap, type }: { gap: number | null; type: 'buy' | 'sell' }) => {
    if (gap === null) return <span className="text-slate-600 text-xs">-</span>;
    if (type === 'buy') {
        if (gap <= 0) return <span className="text-emerald-400 text-xs font-mono">已入 {Math.abs(gap).toFixed(1)}%</span>;
        return <span className="text-orange-400 text-xs font-mono">差 +{gap.toFixed(1)}%</span>;
    } else {
        if (gap >= 0) return <span className="text-red-400 text-xs font-mono">超出 +{gap.toFixed(1)}%</span>;
        return <span className="text-slate-500 text-xs font-mono">差 {Math.abs(gap).toFixed(1)}%</span>;
    }
};

const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return '剛才';
    if (mins < 60) return `${mins} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    return `${days} 天前`;
};

type FilterSide = 'ALL' | 'BUY' | 'SELL';
type FilterAlign = 'ALL' | 'MATCH' | 'DIVERGE' | 'PARTIAL';
type SortKey = 'date' | 'symbol' | 'bias20' | 'rsi' | 'alignment';

export const BacktestView: React.FC<Props> = ({ allTransactions, filteredTransactions }) => {
    const [results, setResults] = useState<BacktestResult[] | null>(null);
    const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number; symbol: string } | null>(null);
    const [filterSide, setFilterSide] = useState<FilterSide>('ALL');
    const [filterAlign, setFilterAlign] = useState<FilterAlign>('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // 啟動時讀快取
    useEffect(() => {
        const cache = getBacktestCache();
        if (cache) {
            setResults(cache.results);
            setCacheTimestamp(cache.timestamp);
        }
    }, []);

    const handleRun = async () => {
        setIsRunning(true);
        setProgress(null);
        try {
            const r = await runBacktest(allTransactions, (done, total, sym) => setProgress({ done, total, symbol: sym }));
            setResults(r);
            saveBacktestCache(r);
            setCacheTimestamp(Date.now());
        } catch (e) {
            console.error('Backtest error:', e);
        } finally {
            setIsRunning(false);
            setProgress(null);
        }
    };

    // filteredTransactions 的 id 集合（日期/搜尋已由上層篩好）
    const filteredIds = useMemo(() => new Set(filteredTransactions.map(t => t.id)), [filteredTransactions]);

    const displayResults = useMemo(() => {
        if (!results) return [];
        let list = results.filter(r => filteredIds.has(r.tradeId));
        if (filterSide !== 'ALL')  list = list.filter(r => r.side === filterSide);
        if (filterAlign !== 'ALL') list = list.filter(r => r.alignment === filterAlign);
        return [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'date')      cmp = a.date.localeCompare(b.date);
            else if (sortKey === 'symbol')    cmp = a.symbol.localeCompare(b.symbol);
            else if (sortKey === 'bias20')    cmp = a.bias20 - b.bias20;
            else if (sortKey === 'rsi')       cmp = a.rsi - b.rsi;
            else if (sortKey === 'alignment') cmp = a.alignment.localeCompare(b.alignment);
            return sortAsc ? cmp : -cmp;
        });
    }, [results, filteredIds, filterSide, filterAlign, sortKey, sortAsc]);

    const stats = useMemo(() => {
        const list = results ? results.filter(r => filteredIds.has(r.tradeId)) : [];
        if (!list.length) return null;
        const buys  = list.filter(r => r.side === 'BUY');
        const sells = list.filter(r => r.side === 'SELL');
        const buyMatch  = buys.filter(r => r.alignment === 'MATCH').length;
        const sellMatch = sells.filter(r => r.alignment === 'MATCH').length;
        const buyDiverge  = buys.filter(r => r.alignment === 'DIVERGE').length;
        const sellDiverge = sells.filter(r => r.alignment === 'DIVERGE').length;
        const sellMatchPnL   = sells.filter(r => r.alignment === 'MATCH'   && r.realizedProfit !== undefined && r.realizedProfit !== 0);
        const sellDivergePnL = sells.filter(r => r.alignment === 'DIVERGE' && r.realizedProfit !== undefined && r.realizedProfit !== 0);
        const avgPnL = (arr: BacktestResult[]) => arr.length ? arr.reduce((s, r) => s + (r.realizedProfit ?? 0), 0) / arr.length : null;
        return {
            total: list.length, buys: buys.length, sells: sells.length,
            buyMatch, buyDiverge, sellMatch, sellDiverge,
            buyMatchRate:  buys.length  ? (buyMatch  / buys.length  * 100) : 0,
            sellMatchRate: sells.length ? (sellMatch / sells.length * 100) : 0,
            avgPnLMatch:   avgPnL(sellMatchPnL),
            avgPnLDiverge: avgPnL(sellDivergePnL),
        };
    }, [results, filteredIds]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(p => !p);
        else { setSortKey(key); setSortAsc(false); }
    };
    const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
        ? (sortAsc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>)
        : null;

    return (
        <div className="border-t border-slate-700/50 pt-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <TrendingUp size={16} className="text-sky-400"/>
                    <div>
                        <span className="text-sm font-bold text-white">DSS 回測分析</span>
                        <span className="text-xs text-slate-500 ml-2">大盤假設 NORMAL，跳過持倉相關訊號</span>
                    </div>
                    {cacheTimestamp && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11}/> {formatTimestamp(cacheTimestamp)}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/25 hover:bg-sky-500/25 transition-all disabled:opacity-50 text-xs font-bold"
                >
                    {isRunning ? <RefreshCw size={13} className="animate-spin"/> : <PlayCircle size={13}/>}
                    {isRunning ? '分析中...' : results ? '重新分析' : '開始回測'}
                </button>
            </div>

            {/* Progress */}
            {isRunning && progress && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-300">分析 <span className="text-white font-mono">{progress.symbol}</span>...</span>
                        <span className="text-slate-400 font-mono">{progress.done} / {progress.total} 檔</span>
                    </div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* Stats bar */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-slate-800/40 rounded-lg border border-slate-700/40 px-3 py-2">
                        <div className="text-xs text-slate-500">區間筆數</div>
                        <div className="text-lg font-bold text-white">{stats.total} <span className="text-xs text-slate-500">筆</span></div>
                        <div className="text-xs text-slate-500">買 {stats.buys} / 賣 {stats.sells}</div>
                    </div>
                    <div className="bg-slate-800/40 rounded-lg border border-slate-700/40 px-3 py-2">
                        <div className="text-xs text-slate-500">BUY 吻合率</div>
                        <div className={`text-lg font-bold ${stats.buyMatchRate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>{stats.buyMatchRate.toFixed(0)}%</div>
                        <div className="text-xs text-slate-500">吻合 {stats.buyMatch} / 背離 {stats.buyDiverge}</div>
                    </div>
                    <div className="bg-slate-800/40 rounded-lg border border-slate-700/40 px-3 py-2">
                        <div className="text-xs text-slate-500">SELL 吻合率</div>
                        <div className={`text-lg font-bold ${stats.sellMatchRate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>{stats.sellMatchRate.toFixed(0)}%</div>
                        <div className="text-xs text-slate-500">吻合 {stats.sellMatch} / 背離 {stats.sellDiverge}</div>
                    </div>
                    <div className="bg-slate-800/40 rounded-lg border border-slate-700/40 px-3 py-2">
                        <div className="text-xs text-slate-500">賣出損益（吻合 vs 背離）</div>
                        <div className="space-y-0.5 mt-0.5">
                            {stats.avgPnLMatch !== null && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">吻合賣出</span>
                                    <span className={`font-mono font-bold ${stats.avgPnLMatch >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {stats.avgPnLMatch >= 0 ? '+' : ''}{(stats.avgPnLMatch / 1000).toFixed(1)}K
                                    </span>
                                </div>
                            )}
                            {stats.avgPnLDiverge !== null && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">背離賣出</span>
                                    <span className={`font-mono font-bold ${stats.avgPnLDiverge >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {stats.avgPnLDiverge >= 0 ? '+' : ''}{(stats.avgPnLDiverge / 1000).toFixed(1)}K
                                    </span>
                                </div>
                            )}
                            {stats.avgPnLMatch === null && stats.avgPnLDiverge === null && (
                                <span className="text-slate-600 text-xs">無賣出損益資料</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            {results && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
                        {(['ALL', 'BUY', 'SELL'] as FilterSide[]).map(v => (
                            <button key={v} onClick={() => setFilterSide(v)}
                                className={`px-3 py-1.5 font-bold transition-all ${filterSide === v ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                {v === 'ALL' ? '全部' : v === 'BUY' ? '買進' : '賣出'}
                            </button>
                        ))}
                    </div>
                    <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
                        {(['ALL', 'MATCH', 'DIVERGE', 'PARTIAL'] as FilterAlign[]).map(v => (
                            <button key={v} onClick={() => setFilterAlign(v)}
                                className={`px-3 py-1.5 font-bold transition-all ${filterAlign === v ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                {v === 'ALL' ? '全部' : v === 'MATCH' ? '✓ 吻合' : v === 'DIVERGE' ? '✗ 背離' : '— 中性'}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">顯示 {displayResults.length} 筆</span>
                </div>
            )}

            {/* Table */}
            {results && (
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                    <table className="w-full text-sm min-w-[860px]">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/60">
                                {([
                                    { label: '日期',      key: 'date'      as SortKey },
                                    { label: '股票',      key: 'symbol'    as SortKey },
                                    { label: '動作',      key: null },
                                    { label: '訊號(技術)', key: null },
                                    { label: '訊號(籌碼)', key: null },
                                    { label: '月乖離%',   key: 'bias20'    as SortKey },
                                    { label: 'RSI',       key: 'rsi'       as SortKey },
                                    { label: '距買進',    key: null },
                                    { label: '距停利',    key: null },
                                    { label: '吻合',      key: 'alignment' as SortKey },
                                    { label: '損益',      key: null },
                                ] as { label: string; key: SortKey | null }[]).map(({ label, key }) => (
                                    <th key={label}
                                        onClick={() => key && toggleSort(key)}
                                        className={`px-3 py-2.5 text-left text-xs text-slate-400 font-bold whitespace-nowrap ${key ? 'cursor-pointer hover:text-white select-none' : ''}`}>
                                        <span className="flex items-center gap-1">{label}{key && <SortIcon k={key}/>}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayResults.map(row => (
                                <React.Fragment key={row.tradeId}>
                                    <tr
                                        className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                                        onClick={() => setExpandedRow(expandedRow === row.tradeId ? null : row.tradeId)}
                                    >
                                        <td className="px-3 py-2.5 text-slate-400 font-mono text-xs whitespace-nowrap">{row.date}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="font-bold text-white text-xs">{row.symbol}</div>
                                            <div className="text-slate-500 text-[11px]">{row.name}</div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${row.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                                {row.side === 'BUY' ? '買進' : '賣出'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {row.error
                                                ? <span className="flex items-center gap-1 text-slate-600 text-xs"><AlertCircle size={11}/>{row.error}</span>
                                                : <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${getSignalStyle(row.techSignal)}`}>{SIGNAL_LABELS[row.techSignal] ?? row.techSignal}</span>
                                            }
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {row.chipHint
                                                ? <span className={`text-xs font-bold ${getChipStyle(row.chipHint.target)}`}>{row.chipHint.target}</span>
                                                : <span className="text-slate-600 text-xs">-</span>
                                            }
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {row.error ? <span className="text-slate-600 text-xs">-</span> :
                                                <span className={`font-mono text-xs font-bold ${row.bias20 >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {row.bias20 >= 0 ? '+' : ''}{row.bias20.toFixed(1)}%
                                                </span>
                                            }
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {row.error ? <span className="text-slate-600 text-xs">-</span> :
                                                <span className={`font-mono text-xs ${row.rsi > 70 ? 'text-red-400' : row.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                    {row.rsi.toFixed(0)}
                                                </span>
                                            }
                                        </td>
                                        <td className="px-3 py-2.5"><GapDisplay gap={row.gapToBuyBias} type="buy"/></td>
                                        <td className="px-3 py-2.5"><GapDisplay gap={row.gapToSellBias} type="sell"/></td>
                                        <td className="px-3 py-2.5"><AlignmentBadge alignment={row.alignment}/></td>
                                        <td className="px-3 py-2.5">
                                            {row.side === 'SELL' && row.realizedProfit !== undefined && row.realizedProfit !== 0
                                                ? <span className={`font-mono text-xs font-bold ${row.realizedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {row.realizedProfit >= 0 ? '+' : ''}{(row.realizedProfit / 1000).toFixed(1)}K
                                                  </span>
                                                : <span className="text-slate-600 text-xs">-</span>
                                            }
                                        </td>
                                    </tr>
                                    {expandedRow === row.tradeId && !row.error && (
                                        <tr className="border-b border-slate-800/50 bg-slate-800/20">
                                            <td colSpan={11} className="px-4 py-3">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                    <div>
                                                        <div className="text-slate-500 mb-1">成交明細</div>
                                                        <div className="text-slate-300">價格 <span className="font-mono text-white">{row.price}</span></div>
                                                        <div className="text-slate-300">張數 <span className="font-mono text-white">{(row.shares / 1000).toFixed(0)} 張</span></div>
                                                        <div className="text-slate-300">分類 <span className="text-slate-400">{row.sizeCategory}</span></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500 mb-1">外資 / 投信</div>
                                                        <div className="text-slate-300">外資連買 <span className="font-mono text-emerald-400">{row.foreignConsecBuy}日</span></div>
                                                        <div className="text-slate-300">外資連賣 <span className="font-mono text-red-400">{row.foreignConsecSell}日</span></div>
                                                        <div className="text-slate-300">投信連買 <span className="font-mono text-emerald-400">{row.trustConsecBuy}日</span></div>
                                                        <div className="text-slate-300">投信連賣 <span className="font-mono text-red-400">{row.trustConsecSell}日</span></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500 mb-1">融資 / 斜率</div>
                                                        <div className="text-slate-300">融資連增 <span className="font-mono text-emerald-400">{row.marginConsecIncrease}日</span></div>
                                                        <div className="text-slate-300">融資連減 <span className="font-mono text-red-400">{row.marginConsecDecrease}日</span></div>
                                                        <div className="text-slate-300">斜率[0] <span className={`font-mono ${(row.biasSlopes[0] ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(row.biasSlopes[0] ?? 0).toFixed(2)}</span></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500 mb-1">籌碼條件</div>
                                                        {row.chipHint?.conditions.map((c, i) => (
                                                            <div key={i} className={c.satisfied ? 'text-emerald-400' : 'text-slate-600'}>
                                                                {c.satisfied ? '✓' : '✗'} {c.label}
                                                            </div>
                                                        )) ?? <div className="text-slate-600">無籌碼資料</div>}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {displayResults.length === 0 && (
                                <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-500 text-sm">
                                    {results ? '沒有符合條件的交易記錄' : '尚未執行回測，點擊「開始回測」'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!results && !isRunning && (
                <div className="py-8 text-center text-slate-500 text-sm">
                    點擊「開始回測」，系統將呼叫 FinMind 歷史資料，分析 {allTransactions.length} 筆交易的 DSS 訊號吻合情況。
                </div>
            )}
        </div>
    );
};
