import React from 'react';
import { Input } from '../ui';
import { Calendar, Search } from 'lucide-react';

export type TimeRange = 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR' | 'ALL' | 'CUSTOM';

interface TransactionFiltersProps {
  filter: string;
  setFilter: (val: string) => void;
  timeRange: TimeRange;
  setTimeRange: (val: TimeRange) => void;
  dateRangeLabel: string;
  customStart: string;
  setCustomStart: (val: string) => void;
  customEnd: string;
  setCustomEnd: (val: string) => void;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'MONTH', label: '月' },
    { value: 'QUARTER', label: '季' },
    { value: 'HALF_YEAR', label: '半年' },
    { value: 'YEAR', label: '年度' },
    { value: 'ALL', label: '全部' },
    { value: 'CUSTOM', label: '自定義' },
];

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filter, setFilter,
  timeRange, setTimeRange,
  dateRangeLabel,
  customStart, setCustomStart,
  customEnd, setCustomEnd
}) => {
  return (
    <div className="space-y-2">
        <div className="relative w-full group">
              <div className="absolute left-3 top-2.5 text-[#A69B87] group-focus-within:text-[#C4523A] transition-colors">
                <Search size={16}/>
              </div>
              <Input
                 theme="warm"
                 placeholder="搜尋交易項目、分類..."
                 className="pl-9 h-10 text-sm w-full"
                 value={filter}
                 onChange={e => setFilter(e.target.value)}
              />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-wrap">
            <div className="flex items-center gap-4 border-b border-[#EDE4D6]">
              {timeRangeOptions.map((opt) => (
                  <button
                      key={opt.value}
                      onClick={() => setTimeRange(opt.value)}
                      className={`py-2 text-xs border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                          timeRange === opt.value
                          ? 'text-[#C4523A] border-[#C4523A] font-bold'
                          : 'text-[#A69B87] border-transparent hover:text-[#3D3428] font-medium'
                      }`}
                  >
                      {opt.label}
                  </button>
              ))}
            </div>
            <div className="ml-auto text-[10px] text-[#A69B87] tabular-nums whitespace-nowrap flex items-center bg-[#FBF7F0] px-2 py-1 rounded border border-[#EDE4D6]">
                 <Calendar size={10} className="mr-1.5"/> {dateRangeLabel}
            </div>
        </div>

        {/* Custom Date Inputs (Conditional) */}
        {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-[#FBF7F0] p-2 rounded-lg border border-[#EDE4D6] animate-fade-in">
                <Input theme="warm" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 text-xs p-1"/>
                <span className="text-[#A69B87] text-xs">~</span>
                <Input theme="warm" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 text-xs p-1"/>
            </div>
        )}
    </div>
  );
};