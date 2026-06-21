import React from 'react';
import { StockTransaction } from '../../types';
import { ReceiptText, Edit2, Trash2 } from 'lucide-react';

interface TransactionHistoryListProps {
    transactions: StockTransaction[];
    stockNameMap: Record<string, string>;
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({ transactions, stockNameMap }) => {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl max-h-[70vh] flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <ReceiptText size={16} className="text-amber-400" />
                    歷史交易明細
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
                        <tr className="text-xs text-slate-400 uppercase">
                            <th className="p-3 font-medium">股票</th>
                            <th className="p-3 font-medium text-right">買賣/股數</th>
                            <th className="p-3 font-medium text-right">成交價</th>
                            <th className="p-3 font-medium text-right">總金額</th>
                            <th className="p-3 font-medium text-right">損益 / 報酬率</th>
                            <th className="p-3 font-medium text-right">日期</th>
                            <th className="p-3 font-medium text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length > 0 ? transactions.map(tx => {
                            const profitColor = tx.realizedProfit && tx.realizedProfit >= 0 ? 'text-red-400' : 'text-emerald-400';
                            return (
                                <tr key={tx.id} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800 transition-colors">
                                    <td className="p-3">
                                        <p className="font-bold text-white truncate">{stockNameMap[tx.symbol] || tx.symbol}</p>
                                        <p className="text-xs text-slate-500 font-mono">{tx.symbol}</p>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                            tx.side === 'BUY' 
                                            ? 'bg-red-500/10 text-rose-400 border-red-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            {tx.side === 'BUY' ? '買入' : '賣出'}
                                        </span>
                                        <p className="text-xs text-slate-400 font-mono mt-1">{tx.shares.toLocaleString()} 股</p>
                                    </td>
                                    <td className="p-3 text-right font-mono text-slate-300">${tx.price.toLocaleString()}</td>
                                    <td className="p-3 text-right">
                                        <p className="font-mono font-bold text-white">${Math.abs(tx.amount).toLocaleString()}</p>
                                        {tx.fees > 0 && <p className="text-[10px] text-slate-500 font-mono mt-0.5">(含稅費: ${tx.fees.toLocaleString()})</p>}
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
                                                        <span className={`text-[10px] px-1 py-0.5 mt-0.5 rounded font-bold ${profitColor} ${tx.realizedProfit && tx.realizedProfit >= 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                                            {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right text-xs font-mono text-slate-500">{tx.date}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1" title="此為歷史紀錄，不可在此編輯">
                                            <button disabled className="p-2 rounded-lg text-slate-600 cursor-not-allowed"><Edit2 size={14}/></button>
                                            <button disabled className="p-2 rounded-lg text-slate-600 cursor-not-allowed"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-500 text-sm">尚無交易紀錄</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};