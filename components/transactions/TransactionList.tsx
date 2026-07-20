
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle2, Search, Pencil, Trash2, Coins } from 'lucide-react';
import { Transaction } from '../../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit }) => {

  const getIcon = (type: Transaction['type']) => {
      switch(type) {
          case 'INCOME':
              return <div className="p-2 md:p-2.5 rounded-full shrink-0 bg-[#FBEAEA] text-[#C4523A]"><ArrowUpCircle size={16}/></div>;
          case 'EXPENSE':
              return <div className="p-2 md:p-2.5 rounded-full shrink-0 bg-[#EAF1EC] text-[#6B9080]"><ArrowDownCircle size={16}/></div>;
          case 'DIVIDEND':
              return <div className="p-2 md:p-2.5 rounded-full shrink-0 bg-amber-500/10 text-amber-600"><Coins size={16}/></div>;
          default:
              return null;
      }
  };

  const getAmountStyle = (type: Transaction['type']) => {
      switch(type) {
          case 'INCOME':
              return 'text-[#C4523A]';
          case 'DIVIDEND':
              return 'text-amber-600';
          case 'EXPENSE':
              return 'text-[#3D3428]';
          default:
              return 'text-[#3D3428]';
      }
  };

  const formatAmount = (t: Transaction) => {
      const prefix = t.type === 'EXPENSE' ? '-' : '+';
      return `${prefix}$${t.amount.toLocaleString()}`;
  };


  return (
    <div className="max-h-[600px] flex flex-col">
      <h3 className="sticky top-0 z-20 bg-[#FBF7F0] py-3 text-xs font-bold text-[#8A7A63] uppercase tracking-wider flex items-center gap-2 border-b border-[#EDE4D6] px-3">
          交易歷史
          <span className="bg-white text-[#A69B87] px-2 py-0.5 rounded-full text-[10px] border border-[#EDE4D6]">{transactions.length}</span>
      </h3>

      {/* Sticky Header Row */}
      <div className="sticky top-[45px] z-10 flex items-center bg-[#FBF7F0]/95 backdrop-blur-sm px-3 py-2 border-b border-[#EDE4D6] text-xs text-[#A69B87] uppercase tracking-wider font-medium">
          <div className="flex-1 pl-[42px] md:pl-[50px]">項目</div>
          <div className="w-16 md:w-28 flex-shrink-0 text-right pr-1 md:pr-4">金額</div>
          <div className="w-[60px] md:w-[88px] flex-shrink-0 text-center">操作</div>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2 px-1 pt-1">
          {transactions.map(t => (
          <div key={t.id} className="bg-white border border-[#EDE4D6] p-2 md:p-3 rounded-xl flex items-center group hover:border-[#C4A98A] transition-all">
              <div className="flex-1 flex items-center gap-2 md:gap-3 min-w-0">
                  {getIcon(t.type)}
                  <div className="min-w-0">
                      <div className="font-bold text-[#3D3428] text-xs md:text-sm flex items-center gap-1.5 truncate">
                          {t.item}
                          {t.invoiceId && <CheckCircle2 size={10} className="text-[#C4523A] shrink-0"/>}
                      </div>
                      <div className="text-[9px] md:text-[10px] text-[#A69B87] truncate tabular-nums">
                          <span className="md:hidden">{t.date.slice(5)}</span>
                          <span className="hidden md:inline">{t.date}</span>
                          {' · '}{t.category}
                      </div>
                  </div>
              </div>

              <div className="w-16 md:w-28 flex-shrink-0 text-right pr-1 md:pr-4">
                  <span className={`text-xs md:text-base font-bold whitespace-nowrap tabular-nums ${getAmountStyle(t.type)}`}>
                    {formatAmount(t)}
                  </span>
              </div>

              <div className="w-[60px] md:w-[88px] flex-shrink-0">
                  <div className="flex items-center justify-center gap-0.5 md:gap-2">
                    <button onClick={() => onEdit(t)} className="p-1.5 md:p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#C4523A] transition-all" title="編輯">
                        <Pencil size={15}/>
                    </button>
                    <button onClick={() => onDelete(t.id)} className="p-1.5 md:p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#B45B45] transition-all" title="刪除">
                        <Trash2 size={15}/>
                    </button>
                  </div>
              </div>
          </div>
          ))}
          {transactions.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed border-[#EDE4D6] rounded-xl">
                  <Search size={32} className="mx-auto text-[#C4A98A] mb-2"/>
                  <p className="text-[#A69B87] text-sm">找不到符合條件的交易紀錄</p>
                  <p className="text-xs text-[#C4A98A] mt-1">請嘗試調整搜尋關鍵字或時間區間</p>
              </div>
          )}
        </div>
    </div>
  );
};