import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Asset, AssetType, StockSnapshot, StockTransaction, Transaction, DividendEvent } from '../types';
import { TrendingUp, PlusCircle, BrainCircuit, List, Wallet, UploadCloud, ClipboardList, RefreshCw, Landmark, Edit2, Trash2, PieChart, Coins, CheckSquare } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { InvestmentInputModal } from '../components/investments/InvestmentInputModal';
import { calculateStockPerformance, parseStockTransactionCSV, parseStockInventoryCSV, lookupStockName, getSharesHeldAtDate } from '../services/stock';
import { getApiKey } from '../services/storage';
import { TransactionAnalysisView } from '../components/investments/TransactionAnalysisView';
import { TransactionFilters, TimeRange } from '../components/transactions/TransactionFilters';

interface InvestmentsProps {
    assets: Asset[];
    stockHistory: StockSnapshot[];
    stockTransactions: StockTransaction[];
    transactions: Transaction[]; // For dividend calculation
    dividendEvents: Record<string, DividendEvent[]>; // symbol -> 本年度除息事件（獨立於庫存，全數賣出後仍保留）
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
    onAddDividendTransactions?: (transactions: Transaction[]) => void;
    onMarkDividendEventsRecorded?: (updates: { symbol: string; exDate: string }[]) => void;
    isActiveView?: boolean;
}

type ActiveTab = 'INVENTORY' | 'HISTORY' | 'DIVIDEND';

const formatTimeAgo = (timestamp: number | undefined): { text: string; color: string } => {
    if (!timestamp) return { text: 'N/A', color: 'text-slate-400' };
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return { text: '幾秒前', color: 'text-slate-400' };
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return { text: `${minutes}分鐘前`, color: 'text-slate-400' };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { text: `${hours}小時前`, color: 'text-slate-400' };
    const days = Math.floor(hours / 24);
    return { text: `${days}天前`, color: 'text-red-400' };
};

export const Investments: React.FC<InvestmentsProps> = ({
    assets, stockHistory, stockTransactions, transactions, dividendEvents,
    onAdd, onUpdate, onDelete,
    enrichStatus, onUpdatePrices, onUpdateDividends,
    onImportTransactions, onImportInventory, onToggleRecurringTransaction, onBulkMarkRecurringTransactions,
    onAddDividendTransactions, onMarkDividendEventsRecorded
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('INVENTORY');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const inventoryFileInputRef = useRef<HTMLInputElement>(null);
    const hasApiKey = !!getApiKey();
    
    const [filter, setFilter] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');

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

    const baseStockNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        stockTransactions.forEach(tx => {
            if (tx.symbol && tx.name) map[tx.symbol] = tx.name;
        });
        inventory.forEach(asset => {
            if (asset.symbol) map[asset.symbol] = asset.name || asset.symbol;
        });
        return map;
    }, [inventory, stockTransactions]);

    // 交易紀錄裡有些股票已全數賣出（不在庫存）且該筆交易本身沒存中文名（如舊版 CSV 匯入），
    // 這時 baseStockNameMap 查不到名稱，改向 FinMind 股票基本資料查詢作為備援
    const [fallbackNameMap, setFallbackNameMap] = useState<Record<string, string>>({});
    useEffect(() => {
        const missingSymbols = Array.from(new Set(stockTransactions.map(t => t.symbol)))
            .filter(sym => sym && !baseStockNameMap[sym] && !fallbackNameMap[sym]);
        if (missingSymbols.length === 0) return;
        let cancelled = false;
        (async () => {
            const updates: Record<string, string> = {};
            for (const sym of missingSymbols) {
                const name = await lookupStockName(sym);
                if (name) updates[sym] = name;
            }
            if (!cancelled && Object.keys(updates).length > 0) {
                setFallbackNameMap(prev => ({ ...prev, ...updates }));
            }
        })();
        return () => { cancelled = true; };
    }, [stockTransactions, baseStockNameMap, fallbackNameMap]);

    const stockNameMap = useMemo(
        () => ({ ...fallbackNameMap, ...baseStockNameMap }),
        [fallbackNameMap, baseStockNameMap]
    );

    // 本年度所有股息事件（獨立 store，涵蓋目前庫存 + 今年已出清的股票；AI 估算備援的股票沒有事件清單所以不會出現）
    const allDividendEvents = useMemo(() => {
        const events: { key: string; symbol: string; name: string; exDate: string; paymentDate?: string; dividendPerShare: number; shares: number; amount: number; recorded: boolean }[] = [];
        Object.entries(dividendEvents).forEach(([symbol, symbolEvents]) => {
            symbolEvents.forEach(ev => {
                const shares = getSharesHeldAtDate(symbol, ev.exDate, stockTransactions);
                if (shares <= 0) return;
                events.push({
                    key: `${symbol}-${ev.exDate}`,
                    symbol,
                    name: stockNameMap[symbol] || symbol,
                    exDate: ev.exDate,
                    paymentDate: ev.paymentDate,
                    dividendPerShare: ev.dividendPerShare,
                    shares,
                    amount: Math.round(shares * ev.dividendPerShare),
                    recorded: !!ev.recorded,
                });
            });
        });
        return events.sort((a, b) => a.exDate.localeCompare(b.exDate));
    }, [dividendEvents, stockTransactions, stockNameMap]);

    // 尚未入帳的部分，供上方勾選確認、一鍵產生交易用
    const pendingDividendEvents = useMemo(
        () => allDividendEvents.filter(e => !e.recorded),
        [allDividendEvents]
    );

    // 依除息月份分組，讓已入帳的股息也能持續留在畫面上快速檢視，而不是產生交易後就整個消失
    const dividendEventsByMonth = useMemo(() => {
        const groups = new Map<string, typeof allDividendEvents>();
        allDividendEvents.forEach(e => {
            const month = e.exDate.slice(0, 7); // YYYY-MM
            if (!groups.has(month)) groups.set(month, []);
            groups.get(month)!.push(e);
        });
        return Array.from(groups.entries())
            .sort((a, b) => b[0].localeCompare(a[0])) // 最新月份在前
            .map(([month, events]) => ({
                month,
                events,
                total: events.reduce((s, e) => s + e.amount, 0),
            }));
    }, [allDividendEvents]);

    const [uncheckedEventKeys, setUncheckedEventKeys] = useState<Set<string>>(new Set());
    const toggleEventKey = (key: string) => {
        setUncheckedEventKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleGenerateDividendTransactions = () => {
        const selected = pendingDividendEvents.filter(e => !uncheckedEventKeys.has(e.key));
        if (selected.length === 0) return;

        const newTransactions: Transaction[] = selected.map(e => ({
            id: crypto.randomUUID(),
            date: e.paymentDate || e.exDate,
            amount: e.amount,
            category: '股息',
            item: `${e.name} 股息`,
            type: 'DIVIDEND',
            source: 'MANUAL',
        }));
        onAddDividendTransactions?.(newTransactions);
        onMarkDividendEventsRecorded?.(selected.map(e => ({ symbol: e.symbol, exDate: e.exDate })));
        setUncheckedEventKeys(new Set());
    };

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

    const handleTransactionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const t = e.target?.result as string; const { transactions: p, error } = parseStockTransactionCSV(t); if (error) { alert(`CSV 解析失敗：\n${error}`); return; } if (p.length > 0) onImportTransactions(p); else alert('CSV 中找不到有效交易。'); }; r.readAsText(f, 'big5'); e.target.value = ''; };
    const handleInventoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const t = e.target?.result as string; const { assets: p, error } = parseStockInventoryCSV(t); if (error) { alert(`庫存 CSV 解析失敗：\n${error}`); return; } if (p.length > 0) onImportInventory(p); else alert('CSV 中找不到有效庫存。'); }; r.readAsText(f, 'big5'); e.target.value = ''; };
    
    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[19px] font-semibold text-[#3D3428] flex items-center gap-2"><TrendingUp className="text-[#C4523A]"/> 股票投資</h2>
                    </div>
                    <p className="text-xs text-[#A69B87] mt-1">追蹤庫存市值、未實現損益與歷史趨勢</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="file" ref={inventoryFileInputRef} onChange={handleInventoryFileChange} accept=".csv" className="hidden" />
                    <Button theme="warm" variant="secondary" onClick={() => inventoryFileInputRef.current?.click()}><ClipboardList size={16}/> 匯入庫存</Button>
                    <input type="file" ref={fileInputRef} onChange={handleTransactionFileChange} accept=".csv" className="hidden" />
                    <Button theme="warm" variant="secondary" onClick={() => fileInputRef.current?.click()}><UploadCloud size={16}/> 匯入交易</Button>
                    <Button theme="warm" onClick={() => handleOpenModal()}><PlusCircle size={16}/> 新增持股</Button>
                </div>
            </div>

            <div className="flex items-center justify-between border-b border-[#EDE4D6] flex-wrap gap-y-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('INVENTORY')} className={`px-1 py-3 text-sm border-b-2 transition-all ${activeTab === 'INVENTORY' ? 'text-[#C4523A] border-[#C4523A] font-bold' : 'text-[#A69B87] border-transparent hover:text-[#3D3428] font-medium'}`}>庫存總覽</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-1 py-3 text-sm border-b-2 transition-all ${activeTab === 'HISTORY' ? 'text-[#C4523A] border-[#C4523A] font-bold' : 'text-[#A69B87] border-transparent hover:text-[#3D3428] font-medium'}`}>交易紀錄</button>
                    <button onClick={() => setActiveTab('DIVIDEND')} className={`px-1 py-3 text-sm border-b-2 transition-all ${activeTab === 'DIVIDEND' ? 'text-[#C4523A] border-[#C4523A] font-bold' : 'text-[#A69B87] border-transparent hover:text-[#3D3428] font-medium'}`}>股息分析</button>
                </div>
                <div className="relative flex items-center gap-2">
                    {activeTab === 'INVENTORY' && (
                        <Button onClick={() => onUpdatePrices(null)} theme="warm" variant="secondary" disabled={isEnriching || inventory.length === 0} loading={enrichStatus.price.isUpdating} className="h-8 text-xs">
                            {!enrichStatus.price.isUpdating && <RefreshCw size={14}/>}
                            {enrichStatus.price.isUpdating ? `更新中...(${enrichStatus.price.progress.current}/${enrichStatus.price.progress.total})` : '更新全部現價'}
                        </Button>
                    )}
                    {activeTab === 'DIVIDEND' && (
                        <Button onClick={() => onUpdateDividends(null)} variant="secondary" disabled={isEnriching || !hasApiKey} loading={enrichStatus.dividend.isUpdating} title={!hasApiKey ? '需先在「系統設定」輸入 API 金鑰才能分析股息' : undefined} className="h-8 text-xs bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20">
                            {!enrichStatus.dividend.isUpdating && <Landmark size={14}/>}
                            {enrichStatus.dividend.isUpdating ? `分析中...(${enrichStatus.dividend.progress.current}/${enrichStatus.dividend.progress.total})` : 'AI 分析股息'}
                        </Button>
                    )}
                    {isAnyStockStale && !isEnriching && (<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>)}
                </div>
            </div>

            {activeTab === 'INVENTORY' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <Card theme="warm" className="p-3 md:p-6"><div className="text-[#A69B87] text-[10px] md:text-xs font-bold uppercase mb-1 truncate">庫存總市值</div><div className="text-sm md:text-2xl font-bold text-[#3D3428] tabular-nums truncate">${stats.totalMarketValue.toLocaleString(undefined, {maximumFractionDigits:0})}</div></Card>
                        <Card theme="warm" className="p-3 md:p-6"><div className="text-[#A69B87] text-[10px] md:text-xs font-bold uppercase mb-1 truncate">未實現總損益</div><div className={`text-sm md:text-2xl font-bold tabular-nums truncate ${stats.totalPL > 0 ? 'text-[#C4523A]' : stats.totalPL < 0 ? 'text-[#6B9080]' : 'text-[#3D3428]'}`}>{stats.totalPL > 0 ? '+' : ''}{stats.totalPL < 0 ? '-' : ''}${Math.abs(stats.totalPL).toLocaleString(undefined, {maximumFractionDigits:0})}</div></Card>
                        <Card theme="warm" className="p-3 md:p-6"><div className="text-[#A69B87] text-[10px] md:text-xs font-bold uppercase mb-1 truncate">總報酬率</div><div className={`text-sm md:text-2xl font-bold tabular-nums truncate ${stats.totalPL > 0 ? 'text-[#C4523A]' : stats.totalPL < 0 ? 'text-[#6B9080]' : 'text-[#3D3428]'}`}>{stats.totalPL > 0 ? '+' : ''}{stats.totalPLPercent.toFixed(2)}%</div></Card>
                    </div>
                    <div className="bg-white border border-[#EDE4D6] rounded-2xl max-h-[70vh] flex flex-col">
                        <div className="p-4 border-b border-[#EDE4D6]"><h3 className="text-sm font-bold text-[#3D3428] flex items-center gap-2"><List size={16} className="text-[#C4523A]" /> 庫存明細</h3></div>
                        <div className="flex-1 overflow-y-auto">
                            {/* 桌面版：表格 */}
                            <table className="w-full text-left hidden md:table">
                            <thead className="sticky top-0 bg-[#FBF7F0] z-10"><tr className="text-xs text-[#8A7A63] uppercase">
                                <th className="p-3 font-medium">股票</th>
                                <th className="p-3 font-medium text-right">持股</th>
                                <th className="p-3 font-medium text-right">價格</th>
                                <th className="p-3 font-medium text-right">損益</th>
                                <th className="p-3 font-medium text-center">操作</th>
                            </tr></thead>
                            <tbody>{inventory.length > 0 ? inventory.map(pos => {
                                const perf = calculateStockPerformance(pos, transactions);
                                const priceDiff = (pos.currentPrice || 0) - (pos.avgCost || 0);
                                const priceColor = priceDiff > 0 ? 'text-[#C4523A]' : priceDiff < 0 ? 'text-[#6B9080]' : 'text-[#3D3428]';
                                const plColor = perf.netProfit > 0 ? 'text-[#C4523A]' : perf.netProfit < 0 ? 'text-[#6B9080]' : 'text-[#3D3428]';
                                const timeAgo = formatTimeAgo(pos.lastUpdated);
                                return (<tr key={pos.id} className="border-b border-[#F3ECDF] last:border-b-0 hover:bg-[#FBF7F0] transition-colors">
                                    <td className="p-3"><p className="font-bold text-[#3D3428] truncate">{pos.name}</p><p className="text-xs text-[#A69B87] tabular-nums">{pos.symbol}</p></td>
                                    <td className="p-3 text-right tabular-nums text-[#3D3428] font-medium">{pos.shares?.toLocaleString()}股</td>
                                    <td className="p-3 text-right">
                                        <p className={`text-lg font-bold tabular-nums ${priceColor}`}>{pos.currentPrice?.toFixed(2) ?? '-'}</p>
                                        <div className="flex items-center justify-end gap-1.5"><p className="text-[11px] text-[#A69B87]">{timeAgo.text}</p><p className="text-xs text-[#A69B87] tabular-nums">均價: {pos.avgCost?.toFixed(2) ?? '-'}</p></div>
                                    </td>

                                    <td className="p-3 text-right"><p className="font-bold text-[#3D3428] tabular-nums">${perf.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className={`text-xs tabular-nums ${plColor}`}>{perf.netProfit.toLocaleString(undefined, { signDisplay: 'always', maximumFractionDigits: 0 })} ({perf.roi.toFixed(1)}%)</p></td>
                                    <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onUpdatePrices([pos.id])} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#FBF7F0] hover:text-[#3D3428]" title="更新現價" aria-label={`更新 ${pos.name} 現價`}><RefreshCw size={14}/></button>
                                        <button onClick={() => handleOpenModal(pos)} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#C4523A]" title="編輯" aria-label={`編輯 ${pos.name}`}><Edit2 size={14}/></button>
                                        <button onClick={() => onDelete(pos.id)} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#B45B45] ml-2" title="刪除" aria-label={`刪除 ${pos.name}`}><Trash2 size={14}/></button>
                                    </div></td>
                                </tr>);
                            }) : (<tr><td colSpan={5} className="text-center py-10 text-[#A69B87] text-sm">尚無庫存資料</td></tr>)}</tbody>
                            </table>

                            {/* 手機版：緊湊列表 */}
                            <div className="md:hidden divide-y divide-[#F3ECDF]">
                                {inventory.length > 0 ? inventory.map(pos => {
                                    const perf = calculateStockPerformance(pos, transactions);
                                    const plColor = perf.netProfit > 0 ? 'text-[#C4523A]' : perf.netProfit < 0 ? 'text-[#6B9080]' : 'text-[#3D3428]';
                                    return (
                                        <div key={pos.id} className="flex items-center gap-2 py-[6px] px-3 min-h-[32px]">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1 leading-[14px]">
                                                    <span className="text-[11.5px] font-bold text-[#3D3428] truncate">{pos.name}</span>
                                                </div>
                                                <span className="text-[9px] text-[#A69B87] leading-[11px] block tabular-nums">{pos.symbol} · {pos.shares?.toLocaleString()}股</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="tabular-nums font-bold text-[13px] leading-none text-[#3D3428]">${perf.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                <div className={`text-[9px] tabular-nums mt-0.5 ${plColor}`}>{perf.netProfit.toLocaleString(undefined, { signDisplay: 'always', maximumFractionDigits: 0 })} ({perf.roi.toFixed(1)}%)</div>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <button onClick={() => onUpdatePrices([pos.id])} className="p-1.5 rounded-lg text-[#A69B87] active:bg-[#FBF7F0] active:text-[#3D3428]" title="更新現價" aria-label={`更新 ${pos.name} 現價`}><RefreshCw size={14}/></button>
                                                <button onClick={() => handleOpenModal(pos)} className="p-1.5 rounded-lg text-[#A69B87] active:bg-[#F6E4DE] active:text-[#C4523A]" title="編輯" aria-label={`編輯 ${pos.name}`}><Edit2 size={14}/></button>
                                                <button onClick={() => onDelete(pos.id)} className="p-1.5 rounded-lg text-[#A69B87] active:bg-[#F6E4DE] active:text-[#B45B45]" title="刪除" aria-label={`刪除 ${pos.name}`}><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    );
                                }) : (<div className="text-center py-10 text-[#A69B87] text-sm">尚無庫存資料</div>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'DIVIDEND' && (
                <div className="space-y-6 animate-fade-in">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Card theme="warm"><div className="text-[#A69B87] text-xs font-bold uppercase mb-1">本年已領股息</div><div className="text-3xl font-bold text-[#C4523A] font-mono">+${dividendStats.realizedDividends.toLocaleString()}</div></Card>
                       <Card theme="warm"><div className="text-[#A69B87] text-xs font-bold uppercase mb-1">預估年收股息</div><div className="text-3xl font-bold text-amber-600 font-mono">+${Math.round(dividendStats.estimatedAnnualDividend).toLocaleString()}</div></Card>
                   </div>

                   {pendingDividendEvents.length > 0 && (
                        <div className="bg-[#FFFDF7] border border-amber-300 rounded-xl shadow-[0_1px_2px_rgba(60,50,30,0.05)] overflow-hidden">
                            <div className="p-4 border-b border-[#EDE4D6] flex items-center justify-between flex-wrap gap-2">
                                <h3 className="text-sm font-bold text-[#3D3428] flex items-center gap-2"><CheckSquare size={16} className="text-amber-600"/> 本年度未入帳股息（依 FinMind 實際配息資料偵測）</h3>
                                <Button
                                    theme="warm"
                                    onClick={handleGenerateDividendTransactions}
                                    disabled={enrichStatus.dividend.isUpdating || pendingDividendEvents.every(e => uncheckedEventKeys.has(e.key))}
                                    title={enrichStatus.dividend.isUpdating ? '股息資料掃描中，請稍候再產生交易' : undefined}
                                    className="h-8 text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                >
                                    {enrichStatus.dividend.isUpdating ? '掃描中，請稍候...' : `產生 ${pendingDividendEvents.filter(e => !uncheckedEventKeys.has(e.key)).length} 筆股息交易（共 $${pendingDividendEvents.filter(e => !uncheckedEventKeys.has(e.key)).reduce((s, e) => s + e.amount, 0).toLocaleString()}）`}
                                </Button>
                            </div>
                            <div className="divide-y divide-[#EDE4D6] max-h-72 overflow-y-auto">
                                {pendingDividendEvents.map(e => (
                                    <label key={e.key} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#FBF7F0]">
                                        <input
                                            type="checkbox"
                                            checked={!uncheckedEventKeys.has(e.key)}
                                            onChange={() => toggleEventKey(e.key)}
                                            className="w-4 h-4 accent-amber-600 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-[#3D3428] truncate">{e.name} <span className="text-xs text-[#A69B87] font-mono">{e.symbol}</span></p>
                                            <p className="text-xs text-[#A69B87] font-mono">除息 {e.exDate}{e.paymentDate ? ` · 發放 ${e.paymentDate}` : ''} · {e.shares.toLocaleString()}股 × ${e.dividendPerShare}</p>
                                        </div>
                                        <p className="font-mono font-bold text-[#C4523A] shrink-0">+${e.amount.toLocaleString()}</p>
                                    </label>
                                ))}
                            </div>
                        </div>
                   )}

                   {allDividendEvents.length === 0 && (
                        <div className="bg-[#FFFDF7] border border-[#EDE4D6] rounded-xl shadow-[0_1px_2px_rgba(60,50,30,0.05)] p-8 text-center space-y-3">
                            <Coins size={32} className="mx-auto text-[#C4A98A]"/>
                            <p className="text-sm font-bold text-[#3D3428]">尚未掃描股息資料</p>
                            {hasApiKey ? (
                                <p className="text-xs text-[#A69B87] leading-relaxed">按右上方「AI 分析股息」，系統會依 FinMind 實際配息資料，<br className="hidden md:block"/>找出你持股的本年度除息事件並協助入帳。</p>
                            ) : (
                                <p className="text-xs text-[#A69B87] leading-relaxed">「AI 分析股息」需要 API 金鑰才能使用，<br className="hidden md:block"/>請先前往「系統設定」輸入金鑰後再回來掃描。</p>
                            )}
                        </div>
                   )}

                   {dividendEventsByMonth.length > 0 && (
                        <div className="bg-[#FFFDF7] border border-[#EDE4D6] rounded-xl shadow-[0_1px_2px_rgba(60,50,30,0.05)] overflow-hidden">
                            <div className="p-4 border-b border-[#EDE4D6]"><h3 className="text-sm font-bold text-[#3D3428] flex items-center gap-2"><Coins size={16} className="text-[#C4523A]"/> 股息紀錄（依除息月份）</h3></div>
                            <div className="max-h-[32rem] overflow-y-auto divide-y divide-[#EDE4D6]">
                                {dividendEventsByMonth.map(group => (
                                    <div key={group.month}>
                                        <div className="px-4 py-2 bg-[#FBF7F0] flex items-center justify-between sticky top-0">
                                            <span className="text-xs font-bold text-[#3D3428]">{group.month.replace('-', '年')}月</span>
                                            <span className="text-xs font-mono font-bold text-[#C4523A]">+${group.total.toLocaleString()}</span>
                                        </div>
                                        {group.events.map(e => (
                                            <div key={e.key} className="flex items-center gap-3 px-4 py-2.5 border-t border-[#EDE4D6]">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-[#3D3428] truncate">{e.name} <span className="text-xs text-[#A69B87] font-mono">{e.symbol}</span></p>
                                                    <p className="text-xs text-[#A69B87] font-mono">除息 {e.exDate}{e.paymentDate ? ` · 發放 ${e.paymentDate}` : ''} · {e.shares.toLocaleString()}股 × ${e.dividendPerShare}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${e.recorded ? 'bg-[#EAF1EC] text-[#6B9080]' : 'bg-amber-50 text-amber-700'}`}>
                                                    {e.recorded ? '已入帳' : '待入帳'}
                                                </span>
                                                <p className="font-mono font-bold text-[#C4523A] shrink-0 w-20 text-right">+${e.amount.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                   )}
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




