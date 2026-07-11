import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Asset, AssetType, StockSnapshot, StockTransaction, Transaction, MarketRegime } from '../types';
import { TrendingUp, PlusCircle, BrainCircuit, List, Wallet, UploadCloud, ClipboardList, RefreshCw, Landmark, Edit2, Trash2, PieChart, Coins, Clock, WifiOff } from 'lucide-react';
import { MarketRegimeBadge } from '../components/MarketRegimeBadge';
import { Button, Card } from '../components/ui';
import { InvestmentInputModal } from '../components/investments/InvestmentInputModal';
import { calculateStockPerformance, parseStockTransactionCSV, parseStockInventoryCSV, fetchTechnicalData, fetchMarketRegime, fetchTWSEBatch } from '../services/stock';
import { getApiKey, getAutoTechUpdateEnabled, setAutoTechUpdateEnabled } from '../services/storage';
import { TransactionAnalysisView } from '../components/investments/TransactionAnalysisView';
import { TransactionFilters, TimeRange } from '../components/transactions/TransactionFilters';

interface InvestmentsProps {
    assets: Asset[];
    stockHistory: StockSnapshot[];
    stockTransactions: StockTransaction[];
    transactions: Transaction[]; // For dividend calculation
    onAdd: (asset: Asset) => void;
    onUpdate: (asset: Asset) => void;
    onUpdateMultiple?: (assets: Asset[]) => void;
    onDelete: (id: string) => void;
    
    enrichStatus: {
        price: { isUpdating: boolean; progress: { current: number; total: number; } };
        dividend: { isUpdating: boolean; progress: { current: number; total: number; } };
    };
    onUpdatePrices: (idsToEnrich?: string[] | null) => void;
    onUpdateDividends: (idsToEnrich?: string[] | null) => void;
    
    onImportTransactions: (transactions: StockTransaction[]) => void;
    onImportInventory: (assets: Partial<Asset>[]) => void;
    onToggleRecurringTransaction?: (id: string) => void;
    onBulkMarkRecurringTransactions?: (ids: string[]) => void;
    isActiveView?: boolean;
}

type ActiveTab = 'INVENTORY' | 'HISTORY' | 'DIVIDEND';

const formatTimeAgo = (timestamp: number | undefined): { text: string; color: string } => {
    if (!timestamp) return { text: 'N/A', color: 'text-slate-500' };
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return { text: '幾秒前', color: 'text-slate-500' };
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return { text: `${minutes}分鐘前`, color: 'text-slate-500' };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { text: `${hours}小時前`, color: 'text-slate-500' };
    const days = Math.floor(hours / 24);
    return { text: `${days}天前`, color: 'text-red-500' };
};

const translateFrequency = (freq: string | undefined): string => {
    if (!freq) return '未知';
    const lowerFreq = freq.toLowerCase();
    if (lowerFreq.includes('monthly')) return '月配';
    if (lowerFreq.includes('quarterly')) return '季配';
    if (lowerFreq.includes('semi-annual')) return '半年配';
    if (lowerFreq.includes('annual')) return '年配';
    return freq; // Fallback to original
};

export const Investments: React.FC<InvestmentsProps> = ({
    assets, stockHistory, stockTransactions, transactions,
    onAdd, onUpdate, onUpdateMultiple, onDelete,
    enrichStatus, onUpdatePrices, onUpdateDividends,
    onImportTransactions, onImportInventory, onToggleRecurringTransaction, onBulkMarkRecurringTransactions, isActiveView = true
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('INVENTORY');
    const [isUpdatingBias, setIsUpdatingBias] = useState(false);
    const [priceSource, setPriceSource] = useState<'TWSE' | 'TWSE_FAILED'>('TWSE');
    const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number, total: number, symbol: string } | null>(null);
    const [marketRegime, setMarketRegime] = useState<MarketRegime>(MarketRegime.NORMAL);
    const [taiexInfo, setTaiexInfo] = useState<{ lastClose: number, dailyChange: number, changeAmount: number } | null>(null);

    React.useEffect(() => {
        fetchMarketRegime().then(r => {
            setMarketRegime(r.regime);
            setTaiexInfo({ lastClose: r.lastClose, dailyChange: r.dailyChange, changeAmount: r.changeAmount });
        });
    }, []);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inventoryFileInputRef = useRef<HTMLInputElement>(null);
    const hasApiKey = !!getApiKey();
    
    const [filter, setFilter] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [autoUpdateEnabled, setAutoUpdateEnabledState] = useState(getAutoTechUpdateEnabled());

    const inventory = useMemo(() => assets.filter(a => a.type === AssetType.STOCK), [assets]);

    const STALE_THRESHOLD = 14 * 24 * 60 * 60 * 1000;

    const isAnyStockStale = useMemo(() => {
        return inventory.some(stock => !stock.lastUpdated || (Date.now() - stock.lastUpdated) > STALE_THRESHOLD);
    }, [inventory]);

    const { stats, allocationData, dividendStats } = useMemo(() => {
        let totalMarketValue = 0, totalCost = 0, estimatedAnnualDividend = 0;
        const allocation: { name: string; value: number; roi: number; }[] = [];
        
        inventory.forEach(stock => {
            const performance = calculateStockPerformance(stock, transactions);
            totalMarketValue += performance.marketValue;
            totalCost += performance.totalCost;
            allocation.push({ name: stock.symbol || 'N/A', value: performance.marketValue, roi: performance.roi });
            if (stock.shares && stock.dividendPerShare) {
                estimatedAnnualDividend += stock.shares * stock.dividendPerShare;
            }
        });

        const currentYear = new Date().getFullYear();
        const realizedDividends = transactions
            .filter(t => t.type === 'DIVIDEND' && new Date(t.date).getFullYear() === currentYear)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPL = totalMarketValue - totalCost;
        return { 
            stats: { totalMarketValue, totalPL, totalPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0 },
            allocationData: allocation,
            dividendStats: { realizedDividends, estimatedAnnualDividend }
        };
    }, [inventory, transactions]);
    
    const stockNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        stockTransactions.forEach(tx => {
            if (tx.symbol && tx.name) map[tx.symbol] = tx.name;
        });
        inventory.forEach(asset => {
            if (asset.symbol) map[asset.symbol] = asset.name || asset.symbol;
        });
        return map;
    }, [inventory, stockTransactions]);

    const { filteredStockTransactions, dateRangeLabel } = useMemo(() => {
        const now = new Date();
        let startDate = new Date(); let endDate = new Date(now);
        const formatDate = (d: Date) => `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
        switch (timeRange) {
            case 'MONTH': startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); break;
            case 'QUARTER': const q = Math.floor(now.getMonth() / 3); startDate = new Date(now.getFullYear(), q * 3, 1); endDate = new Date(now.getFullYear(), q * 3 + 3, 0); break;
            case 'HALF_YEAR': 
                startDate = new Date(now); 
                startDate.setMonth(now.getMonth() - 6); 
                endDate = new Date(now); 
                break;
            case 'YEAR': startDate = new Date(now.getFullYear(), 0, 1); endDate = new Date(now.getFullYear(), 11, 31); break;
            case 'CUSTOM': startDate = customStart ? new Date(customStart) : new Date(0); endDate = customEnd ? new Date(customEnd) : new Date(); break;
            case 'ALL': startDate = new Date(0); endDate = new Date(); break;
        }
        startDate.setHours(0, 0, 0, 0); endDate.setHours(23, 59, 59, 999);
        const label = timeRange === 'ALL' ? '所有紀錄' : `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
        const processed = stockTransactions.filter(t => {
            const tDate = new Date(t.date); if (tDate < startDate || tDate > endDate) return false;
            if (filter) { const lower = filter.toLowerCase(), name = stockNameMap[t.symbol]?.toLowerCase() || ''; return t.symbol.toLowerCase().includes(lower) || name.includes(lower); }
            return true;
        });
        return { filteredStockTransactions: processed, dateRangeLabel: label };
    }, [stockTransactions, timeRange, customStart, customEnd, filter, stockNameMap]);

    const isEnriching = enrichStatus.price.isUpdating || enrichStatus.dividend.isUpdating;

    const handleOpenModal = (asset: Asset | null = null) => { setEditingAsset(asset); setIsModalOpen(true); };
    const handleSaveAsset = (asset: Asset) => { if (editingAsset) onUpdate(asset); else onAdd(asset); setIsModalOpen(false); setEditingAsset(null); };

    const handleUpdateBias = async () => {
        setIsUpdatingBias(true);
        const validStocks = inventory.filter(s => s.symbol);
        setAnalyzeProgress({ current: 0, total: validStocks.length, symbol: '' });

        const updatedAssets: Asset[] = [];
        let currentIdx = 0;
        
        // Chunking array into smaller sizes
        const chunkArray = <T,>(arr: T[], size: number): T[][] => 
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

        // Pre-warm market regime cache before parallel execution to prevent duplicate TWII requests
        const refreshedRegime = await fetchMarketRegime(true);
        setMarketRegime(refreshedRegime.regime);
        setTaiexInfo({ lastClose: refreshedRegime.lastClose, dailyChange: refreshedRegime.dailyChange, changeAmount: refreshedRegime.changeAmount });

        // 批次抓即時現價（一次 CF 呼叫），與 Watchlist 相同做法
        const symbols = validStocks.map(s => s.symbol!);
        const batchResult = await fetchTWSEBatch(symbols);
        setPriceSource(batchResult.source);

        const chunks = chunkArray(validStocks, 15);
        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (stock) => {
                if (stock.symbol) {
                    // 批次已整批失敗時不逐檔重打 TWSE（避免併發爆量觸發 rate limit），直接讓 fetchTechnicalData 用昨收 fallback
                    const preloadedPrice = batchResult.source === 'TWSE_FAILED'
                        ? { price: 0, change: null, changePercent: null }
                        : (batchResult.prices[stock.symbol] ?? null);
                    const techData = await fetchTechnicalData(stock.symbol, inventory, stockTransactions, preloadedPrice);
                    if (techData !== null) {
                        const cleanTechData: Partial<Asset> = {};
                        if (techData.ma20 !== null) cleanTechData.ma20 = techData.ma20;
                        if (techData.ma60 !== null) cleanTechData.ma60 = techData.ma60;
                        if (techData.rsi !== null) cleanTechData.rsi = techData.rsi;
                        cleanTechData.techSignal = techData.techSignal;
                        cleanTechData.biasSlopes = techData.biasSlopes;
                        if (techData.ma20Slope !== null) cleanTechData.ma20Slope = techData.ma20Slope;
                        if (techData.marginChangeRatio !== null) cleanTechData.marginChangeRatio = techData.marginChangeRatio;
                        if (techData.marginChange !== null && techData.marginChange !== undefined) cleanTechData.marginChange = techData.marginChange;
                        if (techData.institutionalForeign !== null && techData.institutionalForeign !== undefined) cleanTechData.institutionalForeign = techData.institutionalForeign;
                        if (techData.institutionalTrust !== null && techData.institutionalTrust !== undefined) cleanTechData.institutionalTrust = techData.institutionalTrust;
                        if (techData.institutionalDealer !== null && techData.institutionalDealer !== undefined) cleanTechData.institutionalDealer = techData.institutionalDealer;
                        cleanTechData.foreignBuy = techData.foreignBuy;
                        cleanTechData.foreignSell = techData.foreignSell;
                        cleanTechData.trustBuy = techData.trustBuy;
                        cleanTechData.trustSell = techData.trustSell;
                        cleanTechData.foreignConsecBuy = techData.foreignConsecBuy;
                        cleanTechData.foreignConsecSell = techData.foreignConsecSell;
                        cleanTechData.trustConsecBuy = techData.trustConsecBuy;
                        cleanTechData.trustConsecSell = techData.trustConsecSell;
                        cleanTechData.signalHint = techData.signalHint ?? undefined;
                        cleanTechData.chipHint = techData.chipHint ?? undefined;
                        if (techData.sizeCategory) cleanTechData.sizeCategory = techData.sizeCategory;
                        if (techData.currentPrice !== undefined) cleanTechData.currentPrice = techData.currentPrice;
                        if (techData.dailyChangeRatio !== null && techData.dailyChangeRatio !== undefined) cleanTechData.dailyChangeRatio = techData.dailyChangeRatio;
                        if (techData.dailyChange !== null && techData.dailyChange !== undefined) cleanTechData.dailyChange = techData.dailyChange;
                        if (techData.riskAlerts) cleanTechData.riskAlerts = techData.riskAlerts;
                        
                        updatedAssets.push({ ...stock, ...cleanTechData, lastUpdated: Date.now() });
                    }
                    currentIdx++;
                    setAnalyzeProgress({ current: currentIdx, total: validStocks.length, symbol: stock.symbol });
                }
            }));
        }
        if (updatedAssets.length > 0 && onUpdateMultiple) {
            onUpdateMultiple(updatedAssets);
        }
        localStorage.setItem('last_tech_update_time', Date.now().toString());
        setIsUpdatingBias(false);
        setAnalyzeProgress(null);
    };

    const handleUpdateBiasRef = useRef(handleUpdateBias);
    useEffect(() => {
        handleUpdateBiasRef.current = handleUpdateBias;
    });

    // 同步其他頁面的開關狀態（Watchlist 切換也會影響 localStorage）
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'auto_tech_update_enabled') {
                setAutoUpdateEnabledState(e.newValue === 'true');
            }
            if (e.key === 'needs_rescan_inventory' && e.newValue === 'true') {
                localStorage.removeItem('needs_rescan_inventory');
                setTimeout(() => handleUpdateBiasRef.current(), 100);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        if (!autoUpdateEnabled) return;
        const interval = setInterval(() => {
            if (!isActiveView) return; // 非當前頁面，跳過（避免與 Watchlist 同時打 API）
            const lastUpdate = localStorage.getItem('last_tech_update_time') || '0';
            if (Date.now() - parseInt(lastUpdate) >= 5 * 60 * 1000) {
                if (document.visibilityState === 'visible' && !isUpdatingBias && !isEnriching) {
                    handleUpdateBiasRef.current();
                }
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [autoUpdateEnabled, isUpdatingBias, isEnriching, isActiveView]);
    const handleTransactionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const t = e.target?.result as string; const { transactions: p, error } = parseStockTransactionCSV(t); if (error) { alert(`CSV 解析失敗：\n${error}`); return; } if (p.length > 0) onImportTransactions(p); else alert('CSV 中找不到有效交易。'); }; r.readAsText(f, 'big5'); e.target.value = ''; };
    const handleInventoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const t = e.target?.result as string; const { assets: p, error } = parseStockInventoryCSV(t); if (error) { alert(`庫存 CSV 解析失敗：\n${error}`); return; } if (p.length > 0) onImportInventory(p); else alert('CSV 中找不到有效庫存。'); }; r.readAsText(f, 'big5'); e.target.value = ''; };
    
    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
            {priceSource === 'TWSE_FAILED' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                    <WifiOff size={15} />
                    <span>即時現價暫時無法取得，目前顯示昨日收盤價，DSS 訊號僅供參考。</span>
                </div>
            )}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="text-violet-400"/> 股票投資</h2>
                        <MarketRegimeBadge regime={marketRegime} />
                        {taiexInfo && taiexInfo.lastClose > 0 && (
                            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                加權指數 <span className="text-slate-200 font-bold">{taiexInfo.lastClose.toFixed(2)}</span>
                                <span className={taiexInfo.changeAmount > 0 ? 'text-red-400' : taiexInfo.changeAmount < 0 ? 'text-emerald-400' : 'text-slate-400'}>
                                    {taiexInfo.changeAmount > 0 ? '▲' : taiexInfo.changeAmount < 0 ? '▼' : ''} {Math.abs(taiexInfo.changeAmount).toFixed(2)} ({taiexInfo.dailyChange > 0 ? '+' : ''}{taiexInfo.dailyChange.toFixed(2)}%)
                                </span>
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">追蹤庫存市值、未實現損益與歷史趨勢</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="file" ref={inventoryFileInputRef} onChange={handleInventoryFileChange} accept=".csv" className="hidden" />
                    <Button variant="secondary" onClick={() => inventoryFileInputRef.current?.click()}><ClipboardList size={16}/> 匯入庫存</Button>
                    <input type="file" ref={fileInputRef} onChange={handleTransactionFileChange} accept=".csv" className="hidden" />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><UploadCloud size={16}/> 匯入交易</Button>
                    <Button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-violet-600 to-primary shadow-lg shadow-violet-500/20"><PlusCircle size={16}/> 新增持股</Button>
                </div>
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-700 flex-wrap gap-y-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('INVENTORY')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'INVENTORY' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>庫存總覽</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'HISTORY' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>交易紀錄</button>
                    <button onClick={() => setActiveTab('DIVIDEND')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'DIVIDEND' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>股息分析</button>
                </div>
                <div className="relative flex items-center gap-2">
                    <Button onClick={() => onUpdateDividends(null)} variant="secondary" disabled={isEnriching || !hasApiKey} loading={enrichStatus.dividend.isUpdating} className="h-8 text-xs bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20">
                        {!enrichStatus.dividend.isUpdating && <Landmark size={14}/>}
                        {enrichStatus.dividend.isUpdating ? `分析中...(${enrichStatus.dividend.progress.current}/${enrichStatus.dividend.progress.total})` : 'AI 分析股息'}
                    </Button>
                    <Button onClick={handleUpdateBias} disabled={isEnriching || isUpdatingBias} loading={isUpdatingBias} className="h-8 text-xs bg-sky-500/10 text-sky-300 border-sky-500/20 hover:bg-sky-500/20 transition-all duration-300 ease-in-out min-w-[120px] relative overflow-hidden">
                        {!isUpdatingBias && <TrendingUp size={14}/>}
                        {isUpdatingBias && analyzeProgress ? (
                            <span className="flex items-center gap-1 z-10 relative">
                                處理中 {analyzeProgress.symbol} <span className="text-[10px] text-sky-400">({analyzeProgress.current}/{analyzeProgress.total})</span>
                            </span>
                        ) : '分析技術面'}
                        {isUpdatingBias && analyzeProgress && (
                            <div 
                                className="absolute left-0 top-0 bottom-0 bg-sky-500/20 transition-all duration-300"
                                style={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
                            />
                        )}
                    </Button>
                    <Button 
                        onClick={() => {
                            const newState = !autoUpdateEnabled;
                            setAutoUpdateEnabledState(newState);
                            setAutoTechUpdateEnabled(newState);
                        }} 
                        variant="secondary" 
                        className={`h-8 text-xs border transition-all duration-300 ${autoUpdateEnabled ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50'}`}
                        title="5分鐘自動更新"
                    >
                        <Clock size={14} className={autoUpdateEnabled ? "animate-pulse text-red-400" : ""} />
                        {autoUpdateEnabled ? '自動更新中' : '自動更新'}
                    </Button>
                    {isAnyStockStale && !isEnriching && (<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>)}
                </div>
            </div>

            {activeTab === 'INVENTORY' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card><div className="text-slate-400 text-xs font-bold uppercase mb-1">庫存總市值</div><div className="text-2xl font-bold text-white font-mono">${stats.totalMarketValue.toLocaleString(undefined, {maximumFractionDigits:0})}</div></Card>
                        <Card><div className="text-slate-400 text-xs font-bold uppercase mb-1">未實現總損益</div><div className={`text-2xl font-bold font-mono ${stats.totalPL > 0 ? 'text-red-400' : stats.totalPL < 0 ? 'text-emerald-400' : 'text-white'}`}>{stats.totalPL > 0 ? '+' : ''}{stats.totalPL < 0 ? '-' : ''}${Math.abs(stats.totalPL).toLocaleString(undefined, {maximumFractionDigits:0})}</div></Card>
                        <Card><div className="text-slate-400 text-xs font-bold uppercase mb-1">總報酬率</div><div className={`text-2xl font-bold font-mono ${stats.totalPL > 0 ? 'text-red-400' : stats.totalPL < 0 ? 'text-emerald-400' : 'text-white'}`}>{stats.totalPL > 0 ? '+' : ''}{stats.totalPLPercent.toFixed(2)}%</div></Card>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl max-h-[70vh] flex flex-col">
                        <div className="p-4 border-b border-slate-700"><h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><List size={16} className="text-violet-400" /> 庫存明細</h3></div>
                        <div className="flex-1 overflow-y-auto"><table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-900 z-10"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium">股票</th>
                                <th className="p-3 font-medium text-right">持股</th>
                                <th className="p-3 font-medium text-right">價格</th>
                                <th className="p-3 font-medium text-right">損益</th>
                                <th className="p-3 font-medium text-center">操作</th>
                            </tr></thead>
                            <tbody>{inventory.length > 0 ? inventory.map(pos => {
                                const perf = calculateStockPerformance(pos, transactions);
                                const priceDiff = (pos.currentPrice || 0) - (pos.avgCost || 0);
                                const priceColor = priceDiff > 0 ? 'text-red-400' : priceDiff < 0 ? 'text-emerald-400' : 'text-white';
                                const plColor = perf.netProfit > 0 ? 'text-red-400' : perf.netProfit < 0 ? 'text-emerald-400' : 'text-white';
                                const timeAgo = formatTimeAgo(pos.lastUpdated);
                                return (<tr key={pos.id} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800 transition-colors">
                                    <td className="p-3"><p className="font-bold text-white truncate">{pos.name}</p><p className="text-xs text-slate-500 font-mono">{pos.symbol}</p></td>
                                    <td className="p-3 text-right font-mono text-slate-200 font-medium">{pos.shares?.toLocaleString()}股</td>
                                    <td className="p-3 text-right">
                                        <p className={`text-lg font-bold font-mono ${priceColor}`}>{pos.currentPrice?.toFixed(2) ?? '-'}</p>
                                        <div className="flex items-center justify-end gap-1.5"><p className={`text-[10px] ${timeAgo.color}`}>{timeAgo.text}</p><p className="text-xs text-slate-500 font-mono">均價: {pos.avgCost?.toFixed(2) ?? '-'}</p></div>
                                    </td>

                                    <td className="p-3 text-right"><p className="font-mono font-bold text-white">${perf.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className={`text-xs font-mono ${plColor}`}>{perf.netProfit.toLocaleString(undefined, { signDisplay: 'always', maximumFractionDigits: 0 })} ({perf.roi.toFixed(1)}%)</p></td>
                                    <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onUpdatePrices([pos.id])} className="p-2 rounded-lg text-slate-400 hover:bg-sky-500/20 hover:text-sky-400" title="更新現價"><RefreshCw size={14}/></button>
                                        <button onClick={() => handleOpenModal(pos)} className="p-2 rounded-lg text-slate-400 hover:bg-primary/20 hover:text-primary" title="編輯"><Edit2 size={14}/></button>
                                        <button onClick={() => onDelete(pos.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-500" title="刪除"><Trash2 size={14}/></button>
                                    </div></td>
                                </tr>);
                            }) : (<tr><td colSpan={7} className="text-center py-10 text-slate-500 text-sm">尚無庫存資料</td></tr>)}</tbody>
                        </table></div>
                    </div>
                </div>
            )}
            {activeTab === 'DIVIDEND' && (
                <div className="space-y-6 animate-fade-in">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Card><div className="text-emerald-400 text-xs font-bold uppercase mb-1">本年已領股息</div><div className="text-3xl font-bold text-emerald-400 font-mono">+${dividendStats.realizedDividends.toLocaleString()}</div></Card>
                       <Card><div className="text-amber-400 text-xs font-bold uppercase mb-1">預估年收股息</div><div className="text-3xl font-bold text-amber-400 font-mono">+${dividendStats.estimatedAnnualDividend.toLocaleString()}</div></Card>
                   </div>
                   <div className="bg-slate-800/50 border border-slate-700 rounded-2xl max-h-[70vh] flex flex-col">
                        <div className="p-4 border-b border-slate-700"><h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><List size={16} className="text-amber-400"/> 股息明細</h3></div>
                        <div className="flex-1 overflow-y-auto"><table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-900 z-10"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium">標的</th><th className="p-3 font-medium">頻率</th><th className="p-3 font-medium text-right">DPS (近一年)</th>
                                <th className="p-3 font-medium text-right">預估年收 (殖利率)</th><th className="p-3 font-medium">日期 (除息/發放)</th>
                            </tr></thead>
                            <tbody>{inventory.length > 0 ? inventory.map(pos => {
                                const estYield = (pos.avgCost && pos.dividendPerShare) ? (pos.dividendPerShare / pos.avgCost) * 100 : 0;
                                const estAnnual = (pos.shares || 0) * (pos.dividendPerShare || 0);
                                return (<tr key={pos.id} className="border-b border-slate-800 last:border-b-0">
                                    <td className="p-3"><p className="font-bold text-white truncate">{pos.name}</p><p className="text-xs text-slate-500 font-mono">{pos.symbol}</p></td>
                                    <td className="p-3"><span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">{translateFrequency(pos.dividendFrequency)}</span></td>
                                    <td className="p-3 text-right font-mono text-slate-300">合計: ${pos.dividendPerShare?.toFixed(2) || '-'}</td>
                                    <td className="p-3 text-right"><p className="font-bold text-amber-400 font-mono">${estAnnual.toLocaleString(undefined, {maximumFractionDigits:0})}</p><p className="text-xs text-slate-500 font-mono">{estYield > 0 ? `${estYield.toFixed(1)}%` : '-'}</p></td>
                                    <td className="p-3"><p className="text-xs text-slate-300 font-mono">{pos.exDate || 'N/A'}</p><p className="text-xs text-slate-500 font-mono">{pos.paymentDate || 'N/A'}</p></td>
                                </tr>);
                            }) : (<tr><td colSpan={5} className="text-center py-10 text-slate-500 text-sm">尚無庫存資料</td></tr>)}</tbody>
                        </table></div>
                   </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="space-y-4 animate-fade-in">
                    <TransactionFilters filter={filter} setFilter={setFilter} timeRange={timeRange} setTimeRange={setTimeRange} dateRangeLabel={dateRangeLabel} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
                    <TransactionAnalysisView transactions={filteredStockTransactions} stockNameMap={stockNameMap} onToggleRecurring={onToggleRecurringTransaction} onBulkMarkRecurring={onBulkMarkRecurringTransactions} />
                </div>
            )}
            <InvestmentInputModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAsset(null); }} onSave={handleSaveAsset} editingAsset={editingAsset} />
        </div>
    );
};




