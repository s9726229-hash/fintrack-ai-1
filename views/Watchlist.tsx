import React, { useState, useEffect } from 'react';
import { Eye, Plus, X, Search, RefreshCw, Loader2, LineChart, Trash2, Target, ShieldAlert } from 'lucide-react';
import { WatchlistGroup, MarketRegime } from '../types';
import * as storage from '../services/storage';
import { fetchTechnicalData, fetchMarketRegime } from '../services/stock';
import twStocks from '../src/data/tw_stocks.json';

export const Watchlist: React.FC = () => {
    const [groups, setGroups] = useState<WatchlistGroup[]>(storage.getWatchlists());
    const [activeGroupId, setActiveGroupId] = useState<string>(groups[0]?.id || '');
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newSymbol, setNewSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Store fetched technical data
    const [techDataMap, setTechDataMap] = useState<Record<string, any>>({});
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
    const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number, total: number, symbol: string } | null>(null);

    const activeGroup = groups.find(g => g.id === activeGroupId);

    // Save groups whenever they change
    useEffect(() => {
        storage.saveWatchlists(groups);
    }, [groups]);

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
        
        const regime = await fetchMarketRegime();
        setMarketRegime(regime);

        const assets = storage.getAssets();
        const transactions = storage.getStockTransactions();
        
        let completed = 0;
        setAnalyzeProgress({ current: 0, total: symbolsToFetch.length, symbol: symbolsToFetch[0] });

        // Fetch all concurrently
        await Promise.all(symbolsToFetch.map(async (symbol) => {
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
                setAnalyzeProgress({ current: completed, total: symbolsToFetch.length, symbol });
            }
        }));

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
                    <td className="p-3 text-center" colSpan={9}>
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
                    <td className="p-3 text-center" colSpan={9}>
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

        const bias20 = data.ma20 && data.currentPrice ? ((data.currentPrice - data.ma20) / data.ma20) * 100 : null;
        
        let signalBadge = <span className="text-slate-600 text-xs font-bold">👀 觀察中</span>;
        if (data.techSignal === 'STRONG_BUY') signalBadge = <span className="bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">🚀 強力買進</span>;
        else if (data.techSignal === 'BUY') signalBadge = <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-bold">🟢 買進訊號</span>;
        else if (data.techSignal === 'PARTIAL_SELL') signalBadge = <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-xs font-bold">🟡 部分停利</span>;
        else if (data.techSignal === 'FORCE_SELL') signalBadge = <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-bold">🔴 強制停利</span>;
        else if (data.techSignal === 'STOP_LOSS') signalBadge = <span className="bg-rose-700/30 text-rose-400 border border-rose-500/50 px-2 py-1 rounded text-xs font-bold">⚠️ 停損警示</span>;
        else if (data.techSignal === 'STOP_LOSS_ALERT') signalBadge = <span className="bg-rose-700 text-white border border-rose-500 px-2 py-1 rounded text-xs font-bold shadow-lg shadow-rose-900/50">⚠️ 停損警示</span>;
        else if (data.techSignal === 'ADDITIONAL_BUY') signalBadge = <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-bold">💰 加碼訊號</span>;
        else if (data.techSignal === 'STRONG_ADDITIONAL_BUY') signalBadge = <span className="bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">💰💰 強力加碼</span>;
        else if (data.techSignal === 'TREND_ADD') signalBadge = <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs font-bold">🔵 順勢加碼</span>;
        else if (data.techSignal === 'FINAL_ADD') signalBadge = <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded text-xs font-bold">🔵🔵 最後加碼</span>;
        else if (data.techSignal === 'SECOND_PARTIAL_SELL') signalBadge = <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded text-xs font-bold">🟠 再次減碼</span>;

        const slopeColor = data.biasSlopes && data.biasSlopes[0] !== undefined 
            ? (data.biasSlopes[0] > 0 ? 'text-red-400' : 'text-emerald-400') 
            : 'text-slate-500';

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
                <td className="p-3 text-right font-mono">
                    {bias20 !== null ? <span className={bias20 > 0 ? 'text-red-400' : 'text-emerald-400'}>{bias20 > 0 ? '+' : ''}{bias20.toFixed(2)}%</span> : '-'}
                    {data.biasSlopes && data.biasSlopes[0] !== undefined && (
                        <p className={`text-[10px] mt-0.5 ${slopeColor}`}>Slope: {data.biasSlopes[0] > 0 ? '↗' : '↘'} {Math.abs(data.biasSlopes[0]).toFixed(2)}</p>
                    )}
                </td>
                <td className="p-3 text-right font-mono">
                    <span className={data.ma20Slope && data.ma20Slope > 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {data.ma20Slope ? (data.ma20Slope > 0 ? '+' : '') + data.ma20Slope.toFixed(2) : '-'}
                    </span>
                </td>
                <td className="p-3 text-right font-mono text-slate-300">{data.rsi?.toFixed(1) || '-'}</td>
                <td className="p-3 text-right font-mono">
                    {data.marginChangeRatio !== undefined && data.marginChangeRatio !== null ? (
                        <span className={data.marginChangeRatio > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {data.marginChangeRatio > 0 ? '+' : ''}{data.marginChangeRatio.toFixed(2)}%
                        </span>
                    ) : '-'}
                </td>
                <td className="p-3 text-center font-mono font-bold text-violet-400">{(data.techScore !== undefined && data.techScore !== null && data.techScore > 0) ? data.techScore : <span className="text-slate-500">-</span>}</td>
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
                        {marketRegime === 'CONSERVATIVE' && <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShieldAlert size={14}/> 保守模式 (停加碼/懲罰)</span>}
                        {marketRegime === 'DEFENSIVE' && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShieldAlert size={14}/> 防禦模式 (只出不進)</span>}
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
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col mt-4">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/30 rounded-t-2xl">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <LineChart size={16} className="text-sky-400" /> {activeGroup.name} 掃描結果
                            </h3>
                            <span className="text-xs text-slate-500">共 {activeGroup.symbols.length} 檔標的</span>
                        </div>
                        <div className="overflow-x-auto"><table className="w-full text-left">
                            <thead className="bg-slate-900/50"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium w-32">標的</th>
                                <th className="p-3 font-medium text-right">收盤價</th>
                                <th className="p-3 font-medium text-right">20MA</th>
                                <th className="p-3 font-medium text-right">60MA</th>
                                <th className="p-3 font-medium text-right">Bias20</th>
                                <th className="p-3 font-medium text-right">MA20斜率</th>
                                <th className="p-3 font-medium text-right">RSI(14)</th>
                                <th className="p-3 font-medium text-right">融資增減</th>
                                <th className="p-3 font-medium text-center">評分</th>
                                <th className="p-3 font-medium text-center">訊號</th>
                                <th className="p-3 font-medium text-center w-16">操作</th>
                            </tr></thead>
                            <tbody>
                                {activeGroup.symbols.length > 0 ? (
                                    activeGroup.symbols.map(renderTechRow)
                                ) : (
                                    <tr>
                                        <td colSpan={11} className="text-center py-12 text-slate-500">
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
