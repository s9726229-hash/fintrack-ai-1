
import React from 'react';
import { Card } from '../ui';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney } from '../../services/format';

interface TransactionStatsProps {
  income: number;
  expense: number;
  balance: number;
}

export const TransactionStats: React.FC<TransactionStatsProps> = ({ income, expense, balance }) => {
  return (
    <>
      {/* Mobile: Compact Dashboard */}
      <div className="md:hidden flex items-center justify-between bg-white rounded-xl p-3 border border-[#EDE4D6] mb-3">
         <div className="flex flex-col">
             <span className="text-[10px] text-[#A69B87] uppercase font-bold tracking-wider">Balance (結餘)</span>
             <span className={`text-2xl font-bold tabular-nums ${balance >= 0 ? 'text-[#3D3428]' : 'text-[#6B9080]'}`}>
                 {formatMoney(balance)}
             </span>
         </div>
         <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 text-xs">
                <span className="text-[#C4523A] font-medium tabular-nums">+${income.toLocaleString()}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C4523A]"></span>
             </div>
             <div className="flex items-center gap-2 text-xs">
                <span className="text-[#6B9080] font-medium tabular-nums">-${expense.toLocaleString()}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B9080]"></span>
             </div>
         </div>
      </div>

      {/* Desktop: Expanded Cards */}
      <div className="hidden md:grid grid-cols-3 gap-4 mb-4">
          <Card theme="warm" className="p-4">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[#A69B87] text-xs font-bold uppercase">總結餘 (Balance)</span>
                  <Wallet size={16} className="text-[#C4523A]"/>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${balance >= 0 ? 'text-[#3D3428]' : 'text-[#6B9080]'}`}>
                  {formatMoney(balance)}
              </div>
          </Card>
          <Card theme="warm" className="p-4">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[#C4523A]/80 text-xs font-bold uppercase">總收入 (Income)</span>
                  <TrendingUp size={16} className="text-[#C4523A]"/>
              </div>
              <div className="text-2xl font-bold text-[#C4523A] tabular-nums">
                  +${income.toLocaleString()}
              </div>
          </Card>
          <Card theme="warm" className="p-4">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[#6B9080]/80 text-xs font-bold uppercase">總支出 (Expense)</span>
                  <TrendingDown size={16} className="text-[#6B9080]"/>
              </div>
              <div className="text-2xl font-bold text-[#6B9080] tabular-nums">
                  -${expense.toLocaleString()}
              </div>
          </Card>
      </div>
    </>
  );
};
