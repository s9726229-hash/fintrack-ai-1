import React, { useState, useEffect, useMemo } from 'react';
import { StockTransaction } from '../../types';
import { ReceiptText, Repeat, Search, X, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { detectRecurringCandidates } from '../../services/stock';

interface TransactionHistoryListProps {
    transactions: StockTransaction[];
    stockNameMap: Record<string, string>;
    onToggleRecurring?: (id: string) => void;
    onBulkMarkRecurring?: (ids: string[]) => void;
}

const PAGE_SIZE = 50;

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({ transactions, stockNameMap, onToggleRecurring, onBulkMarkRecurring }) => {
    const [candidates, setCandidates] = useState<StockTransaction[] | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searched, setSearched] = useState(false);
    const [alreadyMarkedCount, setAlreadyMarkedCount] = useState(0);
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [transactions]);

    const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
    const pagedTransactions = useMemo(
        () => transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [transactions, page]
    );

    const runDetection = () => {
        const found = detectRecurringCandidates(transactions.filter(t => !t.isRecurring));
        setCandidates(found);
        setSelectedIds(new Set(found.map(t => t.id)));
        setAlreadyMarkedCount(transactions.filter(t => t.isRecurring).length);
        setSearched(true);
    };

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const applySelected = () => {
        onBulkMarkRecurring?.(Array.from(selectedIds));
        setCandidates(null);
        setSearched(false);
    };

    const dismiss = () => { setCandidates(null); setSearched(false); };

    return (
        <div className="bg-[#FFFDF7] border border-[#EDE4D6] rounded-xl shadow-[0_1px_2px_rgba(60,50,30,0.05)] max-h-[70vh] flex flex-col animate-fade-in">
            <div className="p-4 border-b border-[#EDE4D6] flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-[#3D3428] flex items-center gap-2">
                    <ReceiptText size={16} className="text-amber-500" />
                    歷史交易明細
                </h3>
                {onBulkMarkRecurring && (
                    <button
                        onClick={runDetection}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all text-xs font-bold"
                        title="依「同標的、約每月一次、扣款日相近、金額相近」規律，找出疑似定期定額的買進交易供你確認"
                    >
                        <Search size={13}/> 偵測定期定額
                    </button>
                )}
            </div>

            {searched && (
                <div className="px-4 py-3 border-b border-[#EDE4D6] bg-[#FBF7F0]">
                    {candidates && candidates.length > 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#3D3428]">
                                    偵測到 <span className="font-bold text-sky-700">{candidates.length}</span> 筆疑似定期定額交易，請確認後套用標記：
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelectedIds(new Set(candidates.map(t => t.id)))} className="text-xs text-[#A69B87] hover:text-[#3D3428]">全選</button>
                                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-[#A69B87] hover:text-[#3D3428]">取消全選</button>
                                </div>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                {candidates.map(tx => (
                                    <label key={tx.id} className="flex items-center gap-2 text-xs text-[#3D3428] cursor-pointer hover:bg-[#FBF7F0] px-2 py-1 rounded">
                                        <input type="checkbox" checked={selectedIds.has(tx.id)} onChange={() => toggleSelected(tx.id)} className="accent-sky-600" />
                                        <span className="font-mono text-[#A69B87]">{tx.date}</span>
                                        <span className="font-bold text-[#3D3428]">{stockNameMap[tx.symbol] || tx.symbol}</span>
                                        <span className="text-[#A69B87] font-mono">{tx.symbol}</span>
                                        <span className="ml-auto font-mono">${Math.abs(tx.amount).toLocaleString()}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={applySelected}
                                    disabled={selectedIds.size === 0}
                                    className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200 transition-all text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    套用標記（{selectedIds.size}）
                                </button>
                                <button onClick={dismiss} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#A69B87] hover:text-[#3D3428] text-xs">
                                    <X size={12}/> 關閉
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#A69B87]">
                                在未標記的交易中，未偵測到符合規律（同標的、約每月一次、金額相近）的新候選。
                                {alreadyMarkedCount > 0 && <>目前已有 <span className="font-bold text-[#8A7A63]">{alreadyMarkedCount}</span> 筆交易標記為定期定額，本次偵測不重複列入。</>}
                            </span>
                            <button onClick={dismiss} className="text-[#A69B87] hover:text-[#3D3428]"><X size={14}/></button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {/* 統一標記：不分桌面/手機 */}
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#FBF7F0]/95 backdrop-blur-sm px-3 py-2 border-b border-[#EDE4D6] text-xs text-[#A69B87] uppercase tracking-wider font-medium">
                    <div className="flex-1 pl-10">股票</div>
                    <div className="w-24 flex-shrink-0 text-right pr-2">金額</div>
                    <div className="w-16 flex-shrink-0 text-center" title="標記為定期定額可與一般交易做視覺區分；此標記會保留在備份資料中，匯入 DSS Lab 後其回測分析會排除這類非訊號驅動的交易">定期</div>
                </div>
                <div className="divide-y divide-[#EDE4D6]">
                    {pagedTransactions.length > 0 ? pagedTransactions.map(tx => {
                        const profitColor = tx.realizedProfit && tx.realizedProfit >= 0 ? 'text-[#C4523A]' : 'text-[#6B9080]';
                        const costBasis = tx.amount - (tx.realizedProfit || 0);
                        const roi = costBasis > 0 ? ((tx.realizedProfit || 0) / costBasis) * 100 : 0;
                        const isBuy = tx.side === 'BUY';
                        return (
                            <div key={tx.id} className={`flex items-center gap-2 p-3 hover:bg-[#FBF7F0] transition-colors ${tx.isRecurring ? 'bg-sky-50/60' : ''}`}>
                                <div className={`p-2 rounded-full shrink-0 ${isBuy ? 'bg-[#FBEAEA] text-[#C4523A]' : 'bg-[#EAF1EC] text-[#6B9080]'}`}>
                                    {isBuy ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-bold text-[#3D3428] text-sm truncate">{stockNameMap[tx.symbol] || tx.symbol}</span>
                                        {tx.isRecurring && <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">定期</span>}
                                    </div>
                                    <div className="text-[11px] text-[#A69B87] truncate tabular-nums">
                                        {tx.symbol} · {tx.shares.toLocaleString()}股 × ${tx.price.toFixed(2)} · {tx.date.slice(5)}
                                    </div>
                                </div>
                                <div className="w-24 flex-shrink-0 text-right">
                                    <div className="text-sm font-bold tabular-nums whitespace-nowrap text-[#3D3428]">${Math.abs(tx.amount).toLocaleString()}</div>
                                    {tx.side === 'SELL' ? (
                                        <div className={`text-[11px] tabular-nums mt-0.5 ${profitColor}`}>
                                            {tx.realizedProfit?.toLocaleString(undefined, { signDisplay: 'always' })} ({roi > 0 ? '+' : ''}{roi.toFixed(1)}%)
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-[#C4A98A] mt-0.5">-</div>
                                    )}
                                </div>
                                <div className="w-16 flex-shrink-0 flex justify-center">
                                    {onToggleRecurring && (
                                        <button
                                            onClick={() => onToggleRecurring(tx.id)}
                                            title={tx.isRecurring ? '取消定期定額標記' : '標記為定期定額'}
                                            className={`p-2 rounded-lg ${
                                                tx.isRecurring
                                                ? 'bg-sky-100 text-sky-700'
                                                : 'text-[#A69B87] hover:bg-[#FBF7F0] hover:text-sky-700'
                                            }`}
                                        >
                                            <Repeat size={15}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-10 text-[#A69B87] text-sm">尚無交易紀錄</div>
                    )}
                </div>
            </div>
            {transactions.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#EDE4D6] text-xs text-[#A69B87]">
                    <span>
                        共 {transactions.length} 筆，第 {page} / {totalPages} 頁
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-1.5 rounded-lg border border-[#EDE4D6] text-[#A69B87] hover:text-[#3D3428] hover:border-[#C4A98A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14}/>
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-1.5 rounded-lg border border-[#EDE4D6] text-[#A69B87] hover:text-[#3D3428] hover:border-[#C4A98A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
