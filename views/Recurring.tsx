

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Modal, Input, Select } from '../components/ui';
import { RecurringItem } from '../types';
import { 
  RefreshCw, CheckCircle2, Wallet, Flame, 
  PiggyBank, Sparkles, Calendar, Trash2, Settings2, CalendarClock, Plus,
  Clock
} from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { formatMoney } from '../services/format';

interface RecurringProps {
  items: RecurringItem[];
  executedLog: Record<string, string[]>;
  onAdd: (item: RecurringItem) => void;
  onExecute: (item: RecurringItem, date: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  'netflix': '娛樂', 'spotify': '娛樂', 'youtube': '娛樂', 'disney': '娛樂', 'game': '娛樂', 'steam': '娛樂',
  '房租': '居住', '水電': '居住', '瓦斯': '居住', '管理費': '居住', '房貸': '居住',
  '健身': '醫療', '保險': '醫療', '健保': '醫療',
  '手機': '帳單', '網路': '帳單', '電信': '帳單', '信用卡': '帳單',
  '薪水': '薪資', '薪資': '薪資', '獎金': '獎金',
  '股息': '股息', '配息': '股息',
  '捷運': '交通', '月票': '交通', '車貸': '交通',
  '老婆': '家庭', '家用': '家庭', '雜費': '家庭', '孝親': '家庭', '小孩': '家庭', '學費': '教育'
};

export const Recurring: React.FC<RecurringProps> = ({ items, executedLog, onAdd, onExecute, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<RecurringItem>>({
    type: 'EXPENSE',
    frequency: 'MONTHLY',
    dayOfMonth: 1,
    monthOfYear: 1
  });



  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    items.forEach(item => {
      const monthlyAmount = item.frequency === 'YEARLY' ? Math.round(item.amount / 12) : item.amount;
      if (item.type === 'INCOME') income += monthlyAmount;
      else expense += monthlyAmount;
    });
    return { 
      income, 
      expense, 
      balance: income - expense, 
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0 
    };
  }, [items]);

  const healthAdvice = useMemo(() => {
    const { balance, savingsRate } = stats;
    if (balance < 0) {
      return { level: 'danger' as const, text: '固定支出已經超過固定收入，每月入不敷出。建議優先檢視非必要的訂閱或固定扣款項目，或設法增加收入來源。' };
    }
    if (savingsRate < 10) {
      return { level: 'warning' as const, text: '儲蓄率偏低，扣除固定支出後可運用的資金有限，一旦有臨時開銷容易吃緊。建議檢視是否有可以刪減的固定項目。' };
    }
    if (savingsRate < 20) {
      return { level: 'ok' as const, text: '財務狀況穩定，固定收支結構還算健康，仍有進一步優化儲蓄率的空間。' };
    }
    return { level: 'good' as const, text: '儲蓄率表現健康，固定收支結構良好，可以考慮把多餘的結餘配置到投資或緊急預備金。' };
  }, [stats]);

  const healthAdviceColor = {
    danger: 'text-red-600',
    warning: 'text-amber-600',
    ok: 'text-[#3D3428]',
    good: 'text-[#6B9080]',
  }[healthAdvice.level];

  const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
  const currentMonth = new Date().getMonth() + 1;

  const isExecuted = (id: string) => {
    return executedLog[id]?.includes(currentMonthKey);
  };

  const handleOpenModal = () => {
    setFormData({ 
        type: 'EXPENSE', 
        frequency: 'MONTHLY', 
        dayOfMonth: 1, 
        monthOfYear: currentMonth,
        category: '家庭' 
    });
    setIsModalOpen(true);
  };

  const handleNameBlur = () => {
    if (formData.name) {
      const lowerName = formData.name.toLowerCase();
      for (const key in CATEGORY_KEYWORDS) {
        if (lowerName.includes(key)) {
          setFormData(prev => ({ ...prev, category: CATEGORY_KEYWORDS[key] }));
          break;
        }
      }
    }
  };

  const handleSubmit = () => {
    if(!formData.name || !formData.amount) return;
    onAdd({
        id: crypto.randomUUID(),
        name: formData.name,
        amount: Number(formData.amount),
        category: formData.category || '其他',
        type: formData.type as 'EXPENSE' | 'INCOME',
        frequency: (formData.frequency as 'MONTHLY' | 'YEARLY') || 'MONTHLY',
        dayOfMonth: Number(formData.dayOfMonth) || 1,
        monthOfYear: formData.frequency === 'YEARLY' ? (Number(formData.monthOfYear) || 1) : undefined
    });
    setIsModalOpen(false);
  };



  return (
    <div className="space-y-6 animate-fade-in md:p-6">
       
       <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-[19px] font-semibold text-[#3D3428] flex items-center gap-2">
                <CalendarClock className="text-[#C4523A]"/> 固定收支
            </h2>
            <p className="text-xs text-[#A69B87] mt-1">管理訂閱服務、房租與定期扣款項目</p>
         </div>
         <Button theme="warm" onClick={handleOpenModal} title="新增固定項目" className="px-4">
            <Plus size={16}/>
            <span className="hidden md:inline">新增固定項目</span>
         </Button>
       </div>

       <div className="grid grid-cols-2 gap-3 md:gap-6">
          <div className="bg-white border border-[#EDE4D6] rounded-2xl p-2.5 md:p-4 flex items-center justify-between relative overflow-hidden group">
             <div className="absolute right-0 top-0 w-16 h-16 bg-[#FBEAEA] rounded-full blur-2xl group-hover:bg-[#F6DADA] transition-colors"></div>
             <div className="min-w-0">
                <p className="text-[#A69B87] text-[10px] md:text-sm font-medium mb-1 truncate">每月固定總收入</p>
                <h3 className="text-[15px] md:text-3xl font-bold text-[#C4523A] tabular-nums tracking-tight whitespace-nowrap">
                   ${stats.income.toLocaleString()}
                </h3>
             </div>
             <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[#FBEAEA] items-center justify-center text-[#C4523A] border border-[#C4523A]/20 shrink-0">
                <Wallet size={20} />
             </div>
          </div>

          <div className="bg-white border border-[#EDE4D6] rounded-2xl p-2.5 md:p-4 flex items-center justify-between relative overflow-hidden group">
             <div className="absolute right-0 top-0 w-16 h-16 bg-[#EAF1EC] rounded-full blur-2xl group-hover:bg-[#DCEAE3] transition-colors"></div>
             <div className="min-w-0">
                <p className="text-[#A69B87] text-[10px] md:text-sm font-medium mb-1 truncate">每月固定總支出</p>
                <h3 className="text-[15px] md:text-3xl font-bold text-[#6B9080] tabular-nums tracking-tight whitespace-nowrap">
                   ${stats.expense.toLocaleString()}
                </h3>
             </div>
             <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[#EAF1EC] items-center justify-center text-[#6B9080] border border-[#6B9080]/20 shrink-0">
                <Flame size={20} />
             </div>
          </div>
       </div>

       <div className="bg-white border border-[#EDE4D6] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="flex-1 space-y-1 z-10 w-full">
             <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-[#C4523A] animate-pulse"/>
                <h3 className="font-bold text-[#3D3428] text-lg">財務狀況健康簡單診斷</h3>
             </div>
             <div className="flex gap-6 text-sm">
                <div>
                   <span className="text-[#A69B87] block text-xs">預估每月結餘</span>
                   <span className={`text-lg font-bold tabular-nums ${stats.balance >= 0 ? 'text-[#C4523A]' : 'text-[#6B9080]'}`}>
                      {formatMoney(stats.balance)}
                   </span>
                </div>
                <div>
                   <span className="text-[#A69B87] block text-xs">儲蓄率</span>
                   <span className={`text-lg font-bold tabular-nums ${stats.savingsRate > 20 ? 'text-[#6B9080]' : 'text-amber-600'}`}>
                      {stats.savingsRate.toFixed(1)}%
                   </span>
                </div>
             </div>
             <p className={`text-xs leading-relaxed mt-3 pt-3 border-t border-[#EDE4D6] ${healthAdviceColor}`}>
                {healthAdvice.text}
             </p>
          </div>
          <div className="absolute left-0 bottom-0 right-0 h-1 bg-gradient-to-r from-[#6B9080] via-[#C4523A] to-[#C4523A] opacity-50"></div>
       </div>

       <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {items.map(item => {
             const executed = isExecuted(item.id);
             const isYearlyDue = item.frequency === 'YEARLY' && item.monthOfYear === currentMonth;
             const dateLabel = item.frequency === 'YEARLY'
                ? `每年 ${item.monthOfYear} 月 ${item.dayOfMonth} 號`
                : `每月 ${item.dayOfMonth} 號`;

             // Calculate visual status
             const isOverdue = !executed && new Date().getDate() >= item.dayOfMonth;

             return (
               <div key={item.id} className={`bg-white border border-[#EDE4D6] rounded-2xl overflow-hidden flex flex-col transition-all hover:border-[#C4A98A] ${executed ? 'opacity-80' : 'border-l-4 border-l-[#C4523A]'}`}>
                  <div className="p-3 md:p-5 flex-1 relative">
                     <div className="flex justify-between items-start mb-2 md:mb-3">
                        <div className="flex gap-1 md:gap-2 min-w-0">
                            <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold bg-[#FBF7F0] text-[#8A7A63] border border-[#EDE4D6] truncate">
                                {item.category}
                            </span>
                            {item.frequency === 'YEARLY' && (
                                <span className={`hidden sm:inline px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${isYearlyDue ? 'bg-amber-500/20 text-amber-700 border-amber-500/50' : 'bg-[#FBF7F0] text-[#A69B87] border-[#EDE4D6]'}`}>
                                    {isYearlyDue ? '本月到期' : '年繳'}
                                </span>
                            )}
                        </div>
                        <button
                           onClick={() => onDelete(item.id)}
                           className="p-1 md:p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#B45B45] transition-all shrink-0"
                        >
                           <Trash2 size={15} className="md:hidden"/>
                           <Trash2 size={18} className="hidden md:block"/>
                        </button>
                     </div>

                     <h3 className="text-sm md:text-xl font-bold text-[#3D3428] mb-0.5 md:mb-1 truncate" title={item.name}>{item.name}</h3>

                     <div className="hidden md:flex items-center gap-2 text-[#A69B87] text-xs mb-4">
                        <Calendar size={12}/> {dateLabel}
                     </div>

                     <div className={`text-base md:text-2xl font-bold tabular-nums truncate ${item.type === 'INCOME' ? 'text-[#C4523A]' : 'text-[#6B9080]'}`}>
                        ${item.amount.toLocaleString()}
                     </div>
                  </div>

                  {/* Status Bar */}
                  <div className={`p-1.5 md:p-2.5 border-t border-[#EDE4D6] flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-xs font-bold text-center ${executed ? 'bg-[#EAF1EC] text-[#6B9080]' : 'bg-[#FBF7F0] text-[#A69B87]'}`}>
                     {executed ? (
                         <>
                            <CheckCircle2 size={12} className="shrink-0"/>
                            <span className="truncate md:hidden">已入帳</span>
                            <span className="hidden md:inline truncate">本月已自動入帳</span>
                         </>
                     ) : (
                         <>
                            <Clock size={12} className="shrink-0"/>
                            <span className="truncate md:hidden">{isOverdue ? '待排程' : '待入帳'}</span>
                            <span className="hidden md:inline truncate">{isOverdue ? '等待系統排程...' : '等待到期自動入帳'}</span>
                         </>
                     )}
                  </div>
               </div>
             );
          })}

          {items.length === 0 && (
             <div onClick={handleOpenModal} className="col-span-full border-2 border-dashed border-[#EDE4D6] rounded-2xl h-40 flex flex-col items-center justify-center text-[#A69B87] hover:text-[#C4523A] hover:border-[#C4523A]/50 hover:bg-[#FBF7F0] cursor-pointer transition-all gap-2">
                <RefreshCw size={24} className="mb-2"/>
                <p>尚無固定項目，點擊新增</p>
             </div>
          )}
       </div>

       <Modal theme="warm" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新增固定項目">
          <div className="space-y-6">
             <div>
                <label className="block text-sm text-[#A69B87] mb-2 font-medium">項目名稱 (Name)</label>
                <Input
                    theme="warm"
                    placeholder="例如：Netflix、房貸、年繳保費..."
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    onBlur={handleNameBlur}
                    className="text-lg"
                />
             </div>

             <div>
                <label className="block text-sm text-[#A69B87] mb-2 font-medium">收支類型 (Type)</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group ${
                            formData.type === 'EXPENSE'
                            ? 'bg-[#EAF1EC] border-[#6B9080] text-[#3D3428] shadow-[0_0_10px_rgba(107,144,128,0.2)]'
                            : 'bg-[#FBF7F0] border-[#EDE4D6] text-[#A69B87] hover:bg-white hover:border-[#C4A98A]'
                        }`}
                    >
                        <Flame size={28} className={`mb-2 ${formData.type === 'EXPENSE' ? 'text-[#6B9080]' : 'text-[#A69B87]'} group-hover:scale-110 transition-transform`} />
                        <span className="text-sm font-bold">固定支出 (Expense)</span>
                    </button>
                    <button
                        onClick={() => setFormData({...formData, type: 'INCOME'})}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group ${
                            formData.type === 'INCOME'
                            ? 'bg-[#FBEAEA] border-[#C4523A] text-[#3D3428] shadow-[0_0_10px_rgba(196,82,58,0.2)]'
                            : 'bg-[#FBF7F0] border-[#EDE4D6] text-[#A69B87] hover:bg-white hover:border-[#C4A98A]'
                        }`}
                    >
                        <Wallet size={28} className={`mb-2 ${formData.type === 'INCOME' ? 'text-[#C4523A]' : 'text-[#A69B87]'} group-hover:scale-110 transition-transform`} />
                        <span className="text-sm font-bold">固定收入 (Income)</span>
                    </button>
                </div>
             </div>

             <div className="relative border border-[#EDE4D6] rounded-xl p-4 bg-[#FBF7F0]">
                 <div className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold text-[#C4523A] flex items-center gap-1">
                    <Settings2 size={12}/> 設定細節
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="block text-[10px] text-[#A69B87] mb-1 uppercase">頻率</label>
                        <Select
                            theme="warm"
                            value={formData.frequency}
                            onChange={e => setFormData({...formData, frequency: e.target.value as 'MONTHLY' | 'YEARLY'})}
                            className="h-12"
                        >
                            <option value="MONTHLY">每月 (Monthly)</option>
                            <option value="YEARLY">每年 (Yearly)</option>
                        </Select>
                     </div>
                     <div>
                        <label className="block text-[10px] text-[#A69B87] mb-1 uppercase">金額</label>
                        <Input
                            theme="warm"
                            type="number"
                            value={formData.amount || ''}
                            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                            className="text-xl h-12"
                            placeholder="0"
                        />
                     </div>
                 </div>

                 <div className="pt-3 border-t border-[#EDE4D6]">
                    <label className="block text-[10px] text-[#A69B87] mb-2 uppercase flex items-center gap-2">
                        <CalendarClock size={12}/> 扣款/入帳日
                    </label>
                    <div className="flex gap-2">
                        {formData.frequency === 'YEARLY' && (
                            <div className="w-1/2">
                                <Select
                                    theme="warm"
                                    value={formData.monthOfYear}
                                    onChange={e => setFormData({...formData, monthOfYear: parseFloat(e.target.value)})}
                                >
                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m} 月</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        <div className="relative flex-1">
                            <Input
                                theme="warm"
                                type="number"
                                placeholder="1-31"
                                value={formData.dayOfMonth || ''}
                                onChange={e => setFormData({...formData, dayOfMonth: parseFloat(e.target.value)})}
                                className="pr-8"
                            />
                            <span className="absolute right-3 top-2.5 text-[#A69B87] text-xs font-bold">日</span>
                        </div>
                    </div>
                 </div>
             </div>

             <div>
               <label className="block text-sm text-[#A69B87] mb-2 font-medium">類別 (Category)</label>
               <Select
                  theme="warm"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="h-12 text-lg"
               >
                  <option value="">請選擇類別</option>
                  {(formData.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                     <option key={c} value={c}>{c}</option>
                  ))}
               </Select>
             </div>

             <Button theme="warm" className="w-full py-3.5 text-lg font-bold mt-2" onClick={handleSubmit}>
                確認新增
             </Button>
          </div>
       </Modal>
    </div>
  );
};
