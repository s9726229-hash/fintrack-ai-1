import React, { useState, useEffect } from 'react';
import { Eye, Plus, X, Search, RefreshCw, Loader2, LineChart, Trash2, Target, ShieldAlert } from 'lucide-react';
import { WatchlistGroup, MarketRegime } from '../types';
import * as storage from '../services/storage';
import { fetchTechnicalData, fetchMarketRegime } from '../services/stock';
import twStocks from '../src/data/tw_stocks.json';

// --- Module Level Cache (Preserves data across tab switching) ---
let globalTechDataCache: Record<string, any> = {};
let globalLastUpdatedCache: number | null = null;

export const Watchlist: React.FC = () => {
    const [groups, setGroups] = useState<WatchlistGroup[]>(storage.getWatchlists());
    const [activeGroupId, setActiveGroupId] = useState<string>(groups[0]?.id || '');
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newSymbol, setNewSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Store fetched technical data (Initialize from global cache)
    const [techDataMap, setTechDataMap] = useState<Record<string, any>>(globalTechDataCache);
    const [lastUpdated, setLastUpdated] = useState<number | null>(globalLastUpdatedCache);
    const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
    const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number, total: number, symbol: string } | null>(null);

    // Sync state to global cache
    useEffect(() => {
        globalTechDataCache = techDataMap;
        globalLastUpdatedCache = lastUpdated;
    }, [techDataMap, lastUpdated]);

    const activeGroup = groups.find(g => g.id === activeGroupId);

    // Save groups whenever they change
    useEffect(() => {
        storage.saveWatchlists(groups);
    }, [groups]);
    useEffect(() => {
        if (localStorage.getItem('needs_rescan_watchlist') === 'true') {
            localStorage.removeItem('needs_rescan_watchlist');
            if (activeGroup && activeGroup.symbols.length > 0) {
                setTimeout(() => refreshData(true), 100);
            }
        }
    }, [activeGroup]);

    // Fetch data for active group
    const refreshData = async (force: boolean = false) => {
        if (!activeGroup || activeGroup.symbols.length === 0) return;
        
        // Find which symbols actually need fetching (skip if already cached unless forced)
        const symbolsToFetch = force 
            ? activeGroup.symbols 
            : activeGroup.symbols.filter(sym => !techDataMap[sym]);
            
        if (symbolsToFetch.length === 0) return;

        setIsLoading(true);
        const newMap = { ...techDataMap };
        
        const mRegimeData = await fetchMarketRegime();
        const regime = mRegimeData.regime;
        setMarketRegime(regime);

        const assets = storage.getAssets();
        const transactions = storage.getStockTransactions();
        
        let completed = 0;
        setAnalyzeProgress({ current: 0, total: symbolsToFetch.length, symbol: symbolsToFetch[0] });

        // Chunking array into smaller sizes to avoid rate limiting
        const chunkArray = <T,>(arr: T[], size: number): T[][] => 
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

        // Pre-warm market regime cache before parallel execution to prevent duplicate TWII requests
        await fetchMarketRegime(true);
        const chunks = chunkArray(symbolsToFetch, 15);
        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (symbol) => {
                try {
                    const data = await fetchTechnicalData(symbol, assets, transactions);
                    if (data) {
                        newMap[symbol] = data;
                    } else {
                        newMap[symbol] = { error: true }; // Cache the failure so it doesn't spin forever
                    }
                } catch (e) {
                    console.error(`Failed to fetch data for ${symbol}`, e);
                    newMap[symbol] = { error: true };
                } finally {
                    completed++;
                    setAnalyzeProgress({ current: completed, total: symbolsToFetch.length, symbol: symbol });
                }
            }));
        }

        setTechDataMap(newMap);
        setLastUpdated(Date.now());
        setIsLoading(false);
        setAnalyzeProgress(null);
    };

    useEffect(() => {
        refreshData(false); // Do not force fetch on tab switch
    }, [activeGroupId]);

    const handleAddGroup = () => {
        if (!newGroupName.trim()) return;
        const newGroup: WatchlistGroup = {
            id: crypto.randomUUID(),
            name: newGroupName.trim(),
            symbols: []
        };
        const updatedGroups = [...groups, newGroup];
        setGroups(updatedGroups);
        setActiveGroupId(newGroup.id);
        setNewGroupName('');
        setIsAddingGroup(false);
    };

    const handleDeleteGroup = (id: string) => {
        if (groups.length <= 1) {
            alert('至少需保留一個觀察名單');
            return;
        }
        if (!window.confirm('確定要刪除此觀察名單嗎？')) return;
        const updatedGroups = groups.filter(g => g.id !== id);
        setGroups(updatedGroups);
        if (activeGroupId === id) {
            setActiveGroupId(updatedGroups[0].id);
        }
    };

    const handleAddSymbol = async () => {
        if (!newSymbol.trim() || !activeGroup) return;
        const symbol = newSymbol.trim().toUpperCase();
        if (activeGroup.symbols.includes(symbol)) {
            setNewSymbol('');
            return;
        }

        const updatedGroups = groups.map(g => {
            if (g.id === activeGroupId) {
                return { ...g, symbols: [...g.symbols, symbol] };
            }
            return g;
        });
        setGroups(updatedGroups);
        setNewSymbol('');
        
        // Fetch data immediately for the new symbol
        setIsLoading(true);
        const data = await fetchTechnicalData(symbol);
        if (data) {
            setTechDataMap(prev => ({ ...prev, [symbol]: data }));
            setLastUpdated(Date.now());
        }
        setIsLoading(false);
    };

    const handleDeleteSymbol = (symbolToRemove: string) => {
        const updatedGroups = groups.map(g => {
            if (g.id === activeGroupId) {
                return { ...g, symbols: g.symbols.filter(s => s !== symbolToRemove) };
            }
            return g;
        });
        setGroups(updatedGroups);
    };

    const renderTechRow = (symbol: string) => {
        const data = techDataMap[symbol];
        const stockName = (twStocks as Record<string, string>)[symbol] || '';

        if (!data) {
            return (
                <tr key={symbol} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800 transition-colors">
                    <td className="p-3">
                        <p className="font-bold text-white">{symbol} <span className="text-slate-400 text-xs font-normal">{stockName}</span></p>
                    </td>
                    <td className="p-3 text-center" colSpan={8}>
                        <span className="text-slate-500 text-sm flex items-center justify-center gap-2">
                            {isLoading ? <><Loader2 size={14} className="animate-spin"/> 載入中...</> : '等候更新'}
                        </span>
                    </td>
                    <td className="p-3 text-center">
                        <button onClick={() => handleDeleteSymbol(symbol)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </td>
                </tr>
            );
        }

        if (data.error) {
            return (
                <tr key={symbol} className="border-b border-slate-800 last:border-b-0 hover:bg-red-900/20 transition-colors">
                    <td className="p-3">
                        <p className="font-bold text-white">{symbol} <span className="text-slate-400 text-xs font-normal">{stockName}</span></p>
                    </td>
                    <td className="p-3 text-center" colSpan={8}>
                        <span className="text-red-400 text-sm flex items-center justify-center gap-2">
                            抓取失敗 (代號錯誤或無資料)
                        </span>
                    </td>
                    <td className="p-3 text-center">
                        <button onClick={() => handleDeleteSymbol(symbol)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </td>
                </tr>
            );
        }

        const techParams = storage.getTechParameters();
        const bias20 = data.ma20 && data.currentPrice ? ((data.currentPrice - data.ma20) / data.ma20) * 100 : null;
        
        let consecutivePositiveSlopes = 0;
        if (data.biasSlopes) {
            for (let i = 0; i < data.biasSlopes.length; i++) {
                if (data.biasSlopes[i] !== undefined && data.biasSlopes[i] > 0) {
                    consecutivePositiveSlopes++;
                } else {
                    break;
                }
            }
        }

        let buyBiasThreshold = techParams.largeCapBuyBias;
        let rsiThreshold = techParams.largeCapBuyRsi;
        let slopeDaysThreshold = techParams.largeCapBuySlopeDays;
        let partialSellThreshold = techParams.largeCapPartialSellBias;
        let stopLossThreshold = techParams.largeCapStopLossBias;
        
        if (data.sizeCategory === 'ETF') {
            buyBiasThreshold = techParams.etfBuyBias;
            rsiThreshold = techParams.etfBuyRsi;
            slopeDaysThreshold = techParams.etfBuySlopeDays;
            partialSellThreshold = techParams.etfPartialSellBias;
            stopLossThreshold = -999;
        } else if (data.sizeCategory === 'SMALL_CAP') {
            buyBiasThreshold = techParams.smallCapBuyBias;
            rsiThreshold = techParams.smallCapBuyRsi;
            slopeDaysThreshold = techParams.smallCapBuySlopeDays;
            partialSellThreshold = techParams.smallCapPartialSellBias;
            stopLossThreshold = techParams.smallCapStopLossBias;
        }

        let biasHighlightClass = '';
        let biasSubtext = null;
        if (stopLossThreshold !== -999 && bias20 !== null && bias20 <= stopLossThreshold) {
            biasHighlightClass = 'bg-rose-900/30';
            biasSubtext = <div className="text-[10px] text-rose-400/80 mt-0.5 leading-tight">達停損門檻 <span className="scale-90 inline-block">(&lt;={stopLossThreshold}%)</span></div>;
        } else if (bias20 !== null && bias20 <= buyBiasThreshold) {
            biasHighlightClass = 'bg-emerald-900/30';
            biasSubtext = <div className="text-[10px] text-emerald-400/80 mt-0.5 leading-tight">達買進門檻 <span className="scale-90 inline-block">(&lt;={buyBiasThreshold}%)</span></div>;
        } else if (bias20 !== null && bias20 >= partialSellThreshold) {
            biasHighlightClass = 'bg-orange-900/30';
            biasSubtext = <div className="text-[10px] text-orange-400/80 mt-0.5 leading-tight">達停利門檻 <span className="scale-90 inline-block">(&gt;={partialSellThreshold}%)</span></div>;
        }

        let slopeHighlightClass = '';
        let slopeSubtext = null;
        if (consecutivePositiveSlopes >= slopeDaysThreshold) {
            slopeHighlightClass = 'bg-emerald-900/30';
            slopeSubtext = <div className="text-[10px] text-emerald-400/80 mt-0.5 leading-tight">達買進門檻 <span className="scale-90 inline-block">(連{slopeDaysThreshold}增)</span></div>;
        }

        let rsiHighlightClass = '';
        let rsiSubtext = null;
        if (data.rsi !== undefined && data.rsi !== null && data.rsi <= rsiThreshold) {
            rsiHighlightClass = 'bg-emerald-900/30';
            rsiSubtext = <div className="text-[10px] text-emerald-400/80 mt-0.5 leading-tight">達買進門檻 <span className="scale-90 inline-block">(&lt;={rsiThreshold})</span></div>;
        }

        const targetBuyPrice = data.ma20 ? (data.ma20 * (1 + buyBiasThreshold / 100)).toFixed(2) : '-';
        const targetSellPrice = data.ma20 ? (data.ma20 * (1 + partialSellThreshold / 100)).toFixed(2) : '-';
        const targetStopPrice = data.ma20 && stopLossThreshold !== -999 ? (data.ma20 * (1 + stopLossThreshold / 100)).toFixed(2) : '-';

        const renderSignalBadge = (signal: string) => {
            switch (signal) {
                case 'STRONG_BUY': return <span className="bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">🚀 強力買進 (&lt;={targetBuyPrice})</span>;
                case 'BUY': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-bold">🟢 買進訊號 (&lt;={targetBuyPrice})</span>;
                case 'PARTIAL_SELL': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-xs font-bold">🟡 部分停利 (&gt;={targetSellPrice})</span>;
                case 'FORCE_SELL': return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-bold">🔴 強制停利 (&gt;={targetSellPrice})</span>;
                case 'STOP_LOSS': return <span className="bg-rose-700/30 text-rose-400 border border-rose-500/50 px-2 py-1 rounded text-xs font-bold">⚠️ 停損警示 (&lt;={targetStopPrice})</span>;
                case 'STOP_LOSS_ALERT': return <span className="bg-rose-700 text-white border border-rose-500 px-2 py-1 rounded text-xs font-bold shadow-lg shadow-rose-900/50">⚠️ 停損警示 (&lt;={targetStopPrice})</span>;
                case 'RISK_ALERT': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-xs font-bold">🟡 留意風險</span>;
                case 'ADDITIONAL_BUY': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-bold">💰 加碼訊號 (&lt;={targetBuyPrice})</span>;
                case 'STRONG_ADDITIONAL_BUY': return <span className="bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">🔥 強力加碼 (&lt;={targetBuyPrice})</span>;
                case 'TREND_ADD': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs font-bold">🔵 順勢加碼</span>;
                case 'FINAL_ADD': return <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded text-xs font-bold">🔵🔵 最後加碼</span>;
                case 'SECOND_PARTIAL_SELL': return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded text-xs font-bold">🟠 再次減碼 (&gt;={targetSellPrice})</span>;
                default: 
                    if (data.signalHint) {
                        return (
                            <div className="flex flex-col items-center gap-1.5 mt-1">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${data.signalHint.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400/80 border-amber-500/20'}`}>
                                    {data.signalHint.target}
                                </span>
                                <div className="flex items-center justify-center gap-1 flex-wrap max-w-[120px]">
                                    {data.signalHint.conditions.map((c: any, i: number) => {
                                        const isBuy = data.signalHint!.type === 'BUY';
                                        const activeBg = isBuy ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                                        const inactiveBg = 'bg-slate-500/20 text-slate-500 opacity-60 border-slate-500/30';
                                        return (
                                            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${c.satisfied ? activeBg : inactiveBg}`} title={c.label}>
                                                {c.label.split(' ')[0]}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }
                    return <span className="text-slate-600 text-xs font-bold">👀 觀察中</span>;
            }
        };
        const signalBadge = renderSignalBadge(data.techSignal || '');

        const currentSlope = data.biasSlopes && data.biasSlopes[0] !== undefined ? data.biasSlopes[0] : null;
        const slopeColor = currentSlope !== null ? (currentSlope > 0 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-500';

        const categoryLabel = data.sizeCategory === 'LARGE_CAP' ? '大型股' : (data.sizeCategory === 'SMALL_CAP' ? '小型股' : 'ETF');

        return (
            <tr key={symbol} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800 transition-colors">
                <td className="p-3">
                    <p className="font-bold text-white">{symbol} <span className="text-slate-400 text-xs font-normal">{stockName}</span></p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {data.sizeCategory === 'LARGE_CAP' && <span className="text-[9px] px-1 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 font-bold tracking-wider">大型股</span>}
                        {data.sizeCategory === 'SMALL_CAP' && <span className="text-[9px] px-1 bg-sky-500/20 text-sky-400 rounded border border-sky-500/30 font-bold tracking-wider">小型股</span>}
                        {data.sizeCategory === 'ETF' && <span className="text-[9px] px-1 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30 font-bold tracking-wider">ETF</span>}
                    </div>
                </td>
                <td className="p-3 text-right font-mono font-bold text-white">{data.currentPrice?.toFixed(2) || '-'}</td>
                <td className="p-3 text-right font-mono text-slate-400">{data.ma20?.toFixed(2) || '-'}</td>
                <td className="p-3 text-right font-mono text-slate-500">{data.ma60?.toFixed(2) || '-'}</td>
                <td className={`p-3 text-right font-mono transition-colors ${biasHighlightClass}`}>
                    {bias20 !== null ? <span className={bias20 > 0 ? 'text-red-400' : 'text-emerald-400'}>{bias20 > 0 ? '+' : ''}{bias20.toFixed(2)}%</span> : '-'}
                    {biasSubtext}
                </td>
                <td className={`p-3 text-right font-mono transition-colors ${slopeHighlightClass}`}>
                    {currentSlope !== null ? (
                        <span className={slopeColor}>{currentSlope > 0 ? '+' : ''}{currentSlope.toFixed(2)} {consecutivePositiveSlopes > 0 ? <span className="text-[10px] ml-1 opacity-80">(連{consecutivePositiveSlopes}增)</span> : ''}</span>
                    ) : '-'}
                    {slopeSubtext}
                </td>
                <td className={`p-3 text-right font-mono text-slate-300 transition-colors ${rsiHighlightClass}`}>
                    {data.rsi?.toFixed(1) || '-'}
                    {rsiSubtext}
                </td>
                <td className="p-3 text-right font-mono">
                    {data.marginChangeRatio !== undefined && data.marginChangeRatio !== null ? (
                        <span className={data.marginChangeRatio > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {data.marginChangeRatio > 0 ? '+' : ''}{data.marginChangeRatio.toFixed(2)}%
                        </span>
                    ) : '-'}
                </td>

                <td className="p-3 text-center">{signalBadge}</td>
                <td className="p-3 text-center">
                    <button onClick={() => handleDeleteSymbol(symbol)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Eye className="text-sky-400" /> 選股掃描與觀察名單
                        </h2>
                        {marketRegime === 'NORMAL' && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShieldAlert size={14}/> 正常模式</span>}
                        {marketRegime === 'CONSERVATIVE' && <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1" title="大盤乖離率 <= -5% 或 單日跌幅 >= 3%，或近期個人操作連續3筆虧損"><ShieldAlert size={14}/> 保守模式 (大盤大跌或連虧)</span>}
                        {marketRegime === 'DEFENSIVE' && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1" title="大盤乖離率 <= -10% 或 單日跌幅 >= 5%"><ShieldAlert size={14}/> 防禦模式 (大盤乖離&lt;-10%或跌幅&gt;5%)</span>}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">建立自訂分頁，利用雙引擎自動分析標的強弱勢與買賣點</p>
                </div>
                {lastUpdated && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">最後更新: {new Date(lastUpdated).toLocaleTimeString()}</span>
                        <button 
                            onClick={() => refreshData(true)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all duration-300 ease-in-out text-sm font-medium border border-slate-700 relative overflow-hidden min-w-[120px]"
                        >
                            <RefreshCw size={16} className={isLoading ? "animate-spin text-sky-400" : ""} />
                            {isLoading && analyzeProgress ? (
                                <span className="flex items-center gap-1 z-10 relative">
                                    掃描中 {analyzeProgress.symbol} <span className="text-[10px] text-sky-400">({analyzeProgress.current}/{analyzeProgress.total})</span>
                                </span>
                            ) : '重新掃描'}
                            {isLoading && analyzeProgress && (
                                <div 
                                    className="absolute left-0 top-0 bottom-0 bg-sky-500/20 transition-all duration-300"
                                    style={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
                                />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
                {groups.map(g => (
                    <div key={g.id} className="relative group">
                        <button
                            onClick={() => setActiveGroupId(g.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeGroupId === g.id 
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                        >
                            {g.name}
                        </button>
                        {groups.length > 1 && (
                            <button 
                                onClick={() => handleDeleteGroup(g.id)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 text-slate-400"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                ))}
                
                {isAddingGroup ? (
                    <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                            placeholder="輸入群組名稱"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white w-32 focus:outline-none focus:border-sky-500"
                            autoFocus
                        />
                        <button onClick={handleAddGroup} className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"><Plus size={16}/></button>
                        <button onClick={() => setIsAddingGroup(false)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg"><X size={16}/></button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsAddingGroup(true)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors border border-dashed border-slate-700 hover:border-slate-500"
                    >
                        <Plus size={16} /> 新增分類
                    </button>
                )}
            </div>

            {/* Active Group Content */}
            {activeGroup && (
                <div className="space-y-4">
                    {/* Add Symbol Input */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="text"
                                value={newSymbol}
                                onChange={e => setNewSymbol(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSymbol()}
                                placeholder="輸入股票代號 (例: 2330, 0050)..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                            />
                        </div>
                        <button 
                            onClick={handleAddSymbol}
                            disabled={!newSymbol.trim() || isLoading}
                            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-sky-500/20"
                        >
                            <Plus size={18} /> 加入清單
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col mt-4 max-h-[75vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/30 rounded-t-2xl shrink-0">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <LineChart size={16} className="text-sky-400" /> {activeGroup.name} 掃描結果
                            </h3>
                            <span className="text-xs text-slate-500">共 {activeGroup.symbols.length} 檔標的</span>
                        </div>
                        <div className="flex-1 overflow-auto"><table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-900 z-10 shadow-md"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium w-32">標的</th>
                                <th className="p-3 font-medium text-right">當前價格</th>
                                <th className="p-3 font-medium text-right">月線 (20MA)</th>
                                <th className="p-3 font-medium text-right">季線 (60MA)</th>
                                <th className="p-3 font-medium text-right">月乖離 (BIAS20)</th>
                                <th className="p-3 font-medium text-right">乖離斜率</th>
                                <th className="p-3 font-medium text-right">強弱指標 (RSI)</th>
                                <th className="p-3 font-medium text-right">融資增減</th>
                                <th className="p-3 font-medium text-center">訊號</th>
                                <th className="p-3 font-medium text-center w-16">操作</th>
                            </tr></thead>
                            <tbody>
                                {activeGroup.symbols.length > 0 ? (
                                    activeGroup.symbols.map(renderTechRow)
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Target size={32} className="text-slate-600 mb-2" />
                                                <p className="font-bold text-slate-400">目前清單內尚無標的</p>
                                                <p className="text-sm">請在上方的搜尋框輸入股票代號並加入清單</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table></div>
                    </div>
                </div>
            )}
        </div>
    );
};
