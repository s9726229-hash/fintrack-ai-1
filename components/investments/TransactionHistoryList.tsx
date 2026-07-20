import React, { useState, useEffect, useMemo } from 'react';
import { StockTransaction } from '../../types';
import { ReceiptText, Repeat, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
                {/* 桌面版：表格 */}
                <table className="w-full text-left hidden md:table">
                    <thead className="sticky top-0 z-10 bg-[#FBF7F0] border-b border-[#EDE4D6]">
                        <tr className="text-xs text-[#A69B87] uppercase">
                            <th className="p-3 font-medium">股票</th>
                            <th className="p-3 font-medium text-right">買賣/股數</th>
                            <th className="p-3 font-medium text-right">成交價</th>
                            <th className="p-3 font-medium text-right">總金額</th>
                            <th className="p-3 font-medium text-right">損益 / 報酬率</th>
                            <th className="p-3 font-medium text-right">日期</th>
                            <th className="p-3 font-medium text-center" title="標記為定期定額可與一般交易做視覺區分；此標記會保留在備份資料中，匯入 DSS Lab 後其回測分析會排除這類非訊號驅動的交易">定期定額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagedTransactions.length > 0 ? pagedTransactions.map(tx => {
                            const profitColor = tx.realizedProfit && tx.realizedProfit >= 0 ? 'text-[#C4523A]' : 'text-[#6B9080]';
                            return (
                                <tr key={tx.id} className={`border-b border-[#EDE4D6] last:border-b-0 hover:bg-[#FBF7F0] transition-colors ${tx.isRecurring ? 'bg-sky-50/60' : ''}`}>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-[#3D3428] truncate">{stockNameMap[tx.symbol] || tx.symbol}</p>
                                            {tx.isRecurring && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200 whitespace-nowrap">定期定額</span>}
                                        </div>
                                        <p className="text-xs text-[#A69B87] font-mono">{tx.symbol}</p>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                            tx.side === 'BUY'
                                            ? 'bg-[#FBEAEA] text-[#C4523A] border-[#C4523A]/20'
                                            : 'bg-[#EAF1EC] text-[#6B9080] border-[#6B9080]/20'
                                        }`}>
                                            {tx.side === 'BUY' ? '買入' : '賣出'}
                                        </span>
                                        <p className="text-xs text-[#A69B87] font-mono mt-1">{tx.shares.toLocaleString()} 股</p>
                                    </td>
                                    <td className="p-3 text-right font-mono text-[#3D3428]">${tx.price.toLocaleString()}</td>
                                    <td className="p-3 text-right">
                                        <p className="font-mono font-bold text-[#3D3428]">${Math.abs(tx.amount).toLocaleString()}</p>
                                        {tx.fees > 0 && <p className="text-[10px] text-[#A69B87] font-mono mt-0.5">(含稅費: ${tx.fees.toLocaleString()})</p>}
                                    </td>
                                    <td className="p-3 text-right font-mono">
                                        {tx.side === 'SELL' ? (
                                            (() => {
                                                const costBasis = tx.amount - (tx.realizedProfit || 0);
                                                const roi = costBasis > 0 ? ((tx.realizedProfit || 0) / costBasis) * 100 : 0;
                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <span className={profitColor}>
                                                            {tx.realizedProfit?.toLocaleString(undefined, { signDisplay: 'always' })}
                                                        </span>
                                                        <span className={`text-[10px] px-1 py-0.5 mt-0.5 rounded font-bold ${profitColor} ${tx.realizedProfit && tx.realizedProfit >= 0 ? 'bg-[#FBEAEA]' : 'bg-[#EAF1EC]'}`}>
                                                            {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-[#C4A98A]">-</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right text-xs font-mono text-[#A69B87]">{tx.date}</td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => onToggleRecurring?.(tx.id)}
                                            disabled={!onToggleRecurring}
                                            title={tx.isRecurring ? '取消定期定額標記' : '標記為定期定額（匯入 DSS Lab 後回測分析將排除此筆交易）'}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                tx.isRecurring
                                                ? 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200'
                                                : 'text-[#A69B87] border-[#EDE4D6] hover:text-sky-700 hover:border-sky-300'
                                            }`}
                                        >
                                            <Repeat size={12}/> {tx.isRecurring ? '已標記' : '標記'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={7} className="text-center py-10 text-[#A69B87] text-sm">尚無交易紀錄</td></tr>
                        )}
                    </tbody>
                </table>

                {/* 手機版：緊湊列表，避免橫向捲動 */}
                <div className="md:hidden divide-y divide-[#EDE4D6]">
                    {pagedTransactions.length > 0 ? pagedTransactions.map(tx => {
                        const profitColor = tx.realizedProfit && tx.realizedProfit >= 0 ? 'text-[#C4523A]' : 'text-[#6B9080]';
                        const costBasis = tx.amount - (tx.realizedProfit || 0);
                        const roi = costBasis > 0 ? ((tx.realizedProfit || 0) / costBasis) * 100 : 0;
                        return (
                            <div key={tx.id} className={`flex items-center gap-2 py-2 px-3 ${tx.isRecurring ? 'bg-sky-50/60' : ''}`}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                        <span className={`shrink-0 px-1.5 py-0 rounded text-[9px] font-bold ${
                                            tx.side === 'BUY' ? 'bg-[#FBEAEA] text-[#C4523A]' : 'bg-[#EAF1EC] text-[#6B9080]'
                                        }`}>{tx.side === 'BUY' ? '買' : '賣'}</span>
                                        <span className="text-[12px] font-bold text-[#3D3428] truncate">{stockNameMap[tx.symbol] || tx.symbol}</span>
                                        {tx.isRecurring && <span className="shrink-0 px-1 py-0 rounded text-[8px] font-bold bg-sky-100 text-sky-700">定期</span>}
                                    </div>
                                    <div className="text-[9px] text-[#A69B87] tabular-nums truncate mt-0.5">
                                        {tx.symbol} · {tx.shares.toLocaleString()}股 × ${tx.price.toFixed(2)} · {tx.date}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[13px] font-bold tabular-nums text-[#3D3428]">${Math.abs(tx.amount).toLocaleString()}</div>
                                    {tx.side === 'SELL' ? (
                                        <div className={`text-[9px] tabular-nums ${profitColor}`}>
                                            {tx.realizedProfit?.toLocaleString(undefined, { signDisplay: 'always' })} ({roi > 0 ? '+' : ''}{roi.toFixed(1)}%)
                                        </div>
                                    ) : (
                                        <div className="text-[9px] text-[#C4A98A]">-</div>
                                    )}
                                </div>
                                {onToggleRecurring && (
                                    <button
                                        onClick={() => onToggleRecurring(tx.id)}
                                        title={tx.isRecurring ? '取消定期定額標記' : '標記為定期定額'}
                                        className={`p-1.5 rounded-lg shrink-0 ${
                                            tx.isRecurring
                                            ? 'bg-sky-100 text-sky-700'
                                            : 'text-[#A69B87] active:bg-[#FBF7F0] active:text-sky-700'
                                        }`}
                                    >
                                        <Repeat size={13}/>
                                    </button>
                                )}
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
