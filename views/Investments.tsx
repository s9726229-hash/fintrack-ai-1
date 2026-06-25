import React, { useState, useMemo, useRef } from 'react';
import { Asset, AssetType, StockSnapshot, StockTransaction, Transaction, MarketRegime } from '../types';
import { TrendingUp, PlusCircle, BrainCircuit, List, Wallet, UploadCloud, ClipboardList, RefreshCw, Landmark, Edit2, Trash2, PieChart, Coins, LineChart } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { InvestmentInputModal } from '../components/investments/InvestmentInputModal';
import { calculateStockPerformance, parseStockTransactionCSV, parseStockInventoryCSV, fetchTechnicalData, fetchMarketRegime } from '../services/stock';
import { getApiKey } from '../services/storage';
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
}

type ActiveTab = 'INVENTORY' | 'HISTORY' | 'DIVIDEND' | 'MONITOR';

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
    onImportTransactions, onImportInventory 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('INVENTORY');
    const [isUpdatingBias, setIsUpdatingBias] = useState(false);
    const [marketRegime, setMarketRegime] = useState<MarketRegime>(MarketRegime.NORMAL);

    React.useEffect(() => {
        fetchMarketRegime().then(setMarketRegime);
    }, []);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inventoryFileInputRef = useRef<HTMLInputElement>(null);
    const hasApiKey = !!getApiKey();
    
    const [filter, setFilter] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

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
        const updatedAssets: Asset[] = [];
        for (const stock of inventory) {
            if (stock.symbol) {
                const techData = await fetchTechnicalData(stock.symbol, inventory, stockTransactions);
                if (techData !== null) {
                    const cleanTechData: Partial<Asset> = {};
                    if (techData.ma20 !== null) cleanTechData.ma20 = techData.ma20;
                    if (techData.ma60 !== null) cleanTechData.ma60 = techData.ma60;
                    if (techData.rsi !== null) cleanTechData.rsi = techData.rsi;
                    if (techData.volumeRatio !== null) cleanTechData.volumeRatio = techData.volumeRatio;
                    cleanTechData.techScore = techData.techScore;
                    cleanTechData.techSignal = techData.techSignal;
                    cleanTechData.biasSlopes = techData.biasSlopes;
                    if (techData.ma20Slope !== null) cleanTechData.ma20Slope = techData.ma20Slope;
                    if (techData.marginChangeRatio !== null) cleanTechData.marginChangeRatio = techData.marginChangeRatio;
                    if (techData.sizeCategory) cleanTechData.sizeCategory = techData.sizeCategory;
                    if (techData.currentPrice !== undefined) cleanTechData.currentPrice = techData.currentPrice;
                    
                    updatedAssets.push({ ...stock, ...cleanTechData, lastUpdated: Date.now() });
                }
            }
        }
        if (updatedAssets.length > 0 && onUpdateMultiple) {
            onUpdateMultiple(updatedAssets);
        }
        setIsUpdatingBias(false);
    };
    const handleTransactionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const t = e.target?.result as string; const { transactions: p, error } = parseStockTransactionCSV(t); if (error) { alert(`CSV 解析失敗：\n${error}`); return; } if (p.length > 0) onImportTransactions(p); else alert('CSV 中找不到有效交易。'); }; r.readAsText(f, 'big5'); e.target.value = ''; };
    const handleInventoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const t = e.target?.result as string; const { assets: p, error } = parseStockInventoryCSV(t); if (error) { alert(`庫存 CSV 解析失敗：\n${error}`); return; } if (p.length > 0) onImportInventory(p); else alert('CSV 中找不到有效庫存。'); }; r.readAsText(f, 'big5'); e.target.value = ''; };
    
    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="text-violet-400"/> 股票投資</h2>
                        {marketRegime === MarketRegime.NORMAL && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">🟢 正常模式</span>}
                        {marketRegime === MarketRegime.CONSERVATIVE && <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">🟡 保守模式</span>}
                        {marketRegime === MarketRegime.DEFENSIVE && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">🔴 防禦模式</span>}
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
                    <button onClick={() => setActiveTab('MONITOR')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'MONITOR' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}><div className="flex items-center gap-1.5"><LineChart size={14}/> 技術監控</div></button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'HISTORY' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>交易紀錄</button>
                    <button onClick={() => setActiveTab('DIVIDEND')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'DIVIDEND' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>股息分析</button>
                </div>
                <div className="relative flex items-center gap-2">
                    <Button onClick={() => onUpdateDividends(null)} variant="secondary" disabled={isEnriching || !hasApiKey} loading={enrichStatus.dividend.isUpdating} className="h-8 text-xs bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"><Landmark size={14}/>{enrichStatus.dividend.isUpdating ? `分析中...(${enrichStatus.dividend.progress.current}/${enrichStatus.dividend.progress.total})` : 'AI 分析股息'}</Button>
                    <Button onClick={handleUpdateBias} disabled={isEnriching || isUpdatingBias} loading={isUpdatingBias} className="h-8 text-xs bg-sky-500/10 text-sky-300 border-sky-500/20 hover:bg-sky-500/20"><TrendingUp size={14}/>{isUpdatingBias ? '分析中...' : '分析技術面'}</Button>
                    {isAnyStockStale && !isEnriching && (<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>)}
                </div>
            </div>

            {activeTab === 'INVENTORY' && (
                <div className="space-y-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl max-h-[70vh] flex flex-col">
                        <div className="p-4 border-b border-slate-700"><h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><List size={16} className="text-violet-400" /> 庫存明細</h3></div>
                        <div className="flex-1 overflow-y-auto"><table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-900 z-10"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium">股票</th>
                                <th className="p-3 font-medium text-right">持股</th>
                                <th className="p-3 font-medium text-right">價格</th>
                                <th className="p-3 font-medium text-right">技術面 (20MA)</th>
                                <th className="p-3 font-medium text-right">建議賣出 (+30%)</th>
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
                                    <td className="p-3 text-right">
                                        {pos.ma20 && pos.currentPrice ? (() => {
                                            const bias = ((pos.currentPrice - pos.ma20) / pos.ma20) * 100;
                                            const isPos = bias > 0;
                                            let badgeClass = ''; let badgeText = '';
                                            if (bias >= 30) { badgeClass = 'bg-rose-600/30 text-rose-400 border border-rose-500/50'; badgeText = '強力賣出'; }
                                            else if (bias >= 20) { badgeClass = 'bg-red-500/20 text-red-400 border border-red-500/30'; badgeText = '建議賣出'; }
                                            else if (bias >= 5) { badgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30'; badgeText = '偏多持有'; }
                                            else if (bias >= -5) { badgeClass = 'bg-slate-500/20 text-slate-300 border border-slate-500/30'; badgeText = '觀望'; }
                                            else if (bias >= -10) { badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; badgeText = '分批低接'; }
                                            else { badgeClass = 'bg-green-600/30 text-green-400 border border-green-500/50'; badgeText = '強力買進'; }
                                            
                                            return (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${badgeClass}`}>{badgeText}</span>
                                                        <span className={`font-mono font-bold ${isPos ? 'text-red-400' : 'text-emerald-400'}`}>{isPos ? '+' : ''}{bias.toFixed(2)}%</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-mono">20MA: {pos.ma20.toFixed(2)}</span>
                                                </div>
                                            );
                                        })() : <span className="text-slate-600 text-xs">-</span>}
                                    </td>
                                    <td className="p-3 text-right">
                                        {pos.ma20 ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-mono font-bold text-rose-400">{(pos.ma20 * 1.3).toFixed(2)}</span>
                                                <span className="text-[10px] text-slate-500">目標價</span>
                                            </div>
                                        ) : <span className="text-slate-600 text-xs">-</span>}
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
            {activeTab === 'MONITOR' && (() => {
                const etfInventory = inventory.filter(pos => pos.stockCategory === 'ETF' || pos.symbol?.startsWith('00') || pos.symbol?.toLowerCase().includes('etf'));
                const stockInventory = inventory.filter(pos => !(pos.stockCategory === 'ETF' || pos.symbol?.startsWith('00') || pos.symbol?.toLowerCase().includes('etf')));
                
                // Get latest updated time
                const lastUpdatedTime = inventory.length > 0 && inventory[0].lastUpdated 
                    ? new Date(inventory[0].lastUpdated).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '尚無資料';

                const renderTechRow = (pos: Asset) => {
                    const bias20 = pos.ma20 && pos.currentPrice ? ((pos.currentPrice - pos.ma20) / pos.ma20) * 100 : null;
                    
                    let signalBadge = <span className="text-slate-600 text-xs font-bold">👀 觀察中</span>;
                    if (pos.techSignal === 'STRONG_BUY') signalBadge = <span className="bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">🚀 強力買進</span>;
                    else if (pos.techSignal === 'BUY') signalBadge = <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-bold">🟢 買進訊號</span>;
                    else if (pos.techSignal === 'PARTIAL_SELL') signalBadge = <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-xs font-bold">🟡 部分停利</span>;
                    else if (pos.techSignal === 'FORCE_SELL') signalBadge = <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-bold">🔴 強制停利</span>;
                    else if (pos.techSignal === 'STOP_LOSS') signalBadge = <span className="bg-rose-700/30 text-rose-400 border border-rose-500/50 px-2 py-1 rounded text-xs font-bold">⚠️ 停損警示</span>;
                    else if (pos.techSignal === 'ADDITIONAL_BUY') signalBadge = <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-bold">💰 加碼訊號</span>;
                    else if (pos.techSignal === 'STRONG_ADDITIONAL_BUY') signalBadge = <span className="bg-green-600/30 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">🔥 強力加碼</span>;
                    else if (pos.techSignal === 'TREND_ADD') signalBadge = <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs font-bold">🔵 順勢加碼</span>;
                    else if (pos.techSignal === 'FINAL_ADD') signalBadge = <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded text-xs font-bold">🔵🔵 最後加碼</span>;
                    else if (pos.techSignal === 'STOP_LOSS_ALERT') signalBadge = <span className="bg-rose-700 text-white border border-rose-500 px-2 py-1 rounded text-xs font-bold shadow-lg shadow-rose-900/50">⚠️ 停損警示</span>;
                    else if (pos.techSignal === 'SECOND_PARTIAL_SELL') signalBadge = <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded text-xs font-bold">🟠 再次減碼</span>;

                    const slopeColor = pos.biasSlopes && pos.biasSlopes[0] !== undefined 
                        ? (pos.biasSlopes[0] > 0 ? 'text-red-400' : 'text-emerald-400') 
                        : 'text-slate-500';

                    return (<tr key={pos.id} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800 transition-colors">
                        <td className="p-3">
                            <p className="font-bold text-white truncate">{pos.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-xs text-slate-500 font-mono">{pos.symbol}</p>
                                {pos.sizeCategory === 'LARGE_CAP' && <span className="text-[9px] px-1 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 font-bold tracking-wider">大型股</span>}
                                {pos.sizeCategory === 'SMALL_CAP' && <span className="text-[9px] px-1 bg-sky-500/20 text-sky-400 rounded border border-sky-500/30 font-bold tracking-wider">小型股</span>}
                                {pos.sizeCategory === 'ETF' && <span className="text-[9px] px-1 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30 font-bold tracking-wider">ETF</span>}
                            </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">{pos.currentPrice?.toFixed(2) || '-'}</td>
                        <td className="p-3 text-right font-mono text-slate-400">{pos.ma20?.toFixed(2) || '-'}</td>
                        <td className="p-3 text-right font-mono">
                            {bias20 !== null ? <span className={bias20 > 0 ? 'text-red-400' : 'text-emerald-400'}>{bias20 > 0 ? '+' : ''}{bias20.toFixed(2)}%</span> : '-'}
                            {pos.biasSlopes && pos.biasSlopes[0] !== undefined && (
                                <p className={`text-[10px] mt-0.5 ${slopeColor}`}>Slope: {pos.biasSlopes[0] > 0 ? '↗' : '↘'} {Math.abs(pos.biasSlopes[0]).toFixed(2)}</p>
                            )}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">{pos.rsi?.toFixed(1) || '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-violet-400">{(pos.techScore !== undefined && pos.techScore !== null && pos.techScore > 0) ? pos.techScore : <span className="text-slate-500">-</span>}</td>
                        <td className="p-3 text-center">{signalBadge}</td>
                    </tr>);
                };

                return (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-end">
                        <span className="text-xs text-slate-500 font-mono">最後分析時間：{lastUpdatedTime}</span>
                    </div>
                    {/* 個股監控 */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><LineChart size={16} className="text-sky-400" /> 📊 個股技術監控</h3>
                            <span className="text-xs text-slate-500">轉折策略與高乖離預警</span>
                        </div>
                        <div className="overflow-x-auto"><table className="w-full text-left">
                            <thead className="bg-slate-900/50"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium w-40">股票</th>
                                <th className="p-3 font-medium text-right">收盤價</th>
                                <th className="p-3 font-medium text-right">20MA</th>
                                <th className="p-3 font-medium text-right">Bias20</th>
                                <th className="p-3 font-medium text-right">RSI(14)</th>
                                <th className="p-3 font-medium text-center">評分</th>
                                <th className="p-3 font-medium text-center">訊號</th>
                            </tr></thead>
                            <tbody>{stockInventory.length > 0 ? stockInventory.map(renderTechRow) : (<tr><td colSpan={7} className="text-center py-6 text-slate-500 text-sm">無個股資料</td></tr>)}</tbody>
                        </table></div>
                    </div>
                    {/* ETF 監控 */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><LineChart size={16} className="text-emerald-400" /> 📈 ETF 技術監控</h3>
                            <span className="text-xs text-emerald-500/70">長期投資邏輯：越跌越買、分批減碼</span>
                        </div>
                        <div className="overflow-x-auto"><table className="w-full text-left">
                            <thead className="bg-slate-900/50"><tr className="text-xs text-slate-400 uppercase">
                                <th className="p-3 font-medium w-40">ETF</th>
                                <th className="p-3 font-medium text-right">收盤價</th>
                                <th className="p-3 font-medium text-right">20MA</th>
                                <th className="p-3 font-medium text-right">Bias20</th>
                                <th className="p-3 font-medium text-right">RSI(14)</th>
                                <th className="p-3 font-medium text-center">評分</th>
                                <th className="p-3 font-medium text-center">訊號</th>
                            </tr></thead>
                            <tbody>{etfInventory.length > 0 ? etfInventory.map(renderTechRow) : (<tr><td colSpan={7} className="text-center py-6 text-slate-500 text-sm">無 ETF 資料</td></tr>)}</tbody>
                        </table></div>
                    </div>
                </div>
                );
            })()}
            
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
                    <TransactionAnalysisView transactions={filteredStockTransactions} stockNameMap={stockNameMap} />
                </div>
            )}
            <InvestmentInputModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAsset(null); }} onSave={handleSaveAsset} editingAsset={editingAsset} />
        </div>
    );
};