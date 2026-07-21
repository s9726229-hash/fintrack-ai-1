import React from 'react';
import { Input, Tabs } from '../ui';
import { Calendar, Search } from 'lucide-react';

export type TimeRange = 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR' | 'ALL' | 'CUSTOM';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'MONTH', label: '月' },
    { value: 'QUARTER', label: '季' },
    { value: 'HALF_YEAR', label: '半年' },
    { value: 'YEAR', label: '年度' },
    { value: 'ALL', label: '全部' },
    { value: 'CUSTOM', label: '自定義' },
];

// 時間範圍分頁：這是「切換後改變下方資料內容」的分頁，跟股票投資/資產管理的分頁同一類，
// 放在頁面標題列正下方（第3層），跟其他分頁共用同一顆 Tabs 元件與樣式。
// 選到「自定義」時，起訖日期輸入框緊接在分頁下方，因為這是操作這個分頁選項本身需要的參數，
// 不是額外的篩選條件，所以留在這裡而不是搬到下面的 TransactionFilters（搜尋框那組）。
interface TimeRangeTabsProps {
  timeRange: TimeRange;
  setTimeRange: (val: TimeRange) => void;
  customStart: string;
  setCustomStart: (val: string) => void;
  customEnd: string;
  setCustomEnd: (val: string) => void;
}

export const TimeRangeTabs: React.FC<TimeRangeTabsProps> = ({
  timeRange, setTimeRange,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
}) => {
  return (
    <div className="space-y-2">
        <Tabs options={timeRangeOptions} active={timeRange} onChange={setTimeRange} />
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

// 搜尋框 + 目前時間範圍的實際日期區間標示：這兩個是「在已選定的分頁範圍內再細篩」的功能，
// 屬於第5層（篩選），維持在 KPI 小卡之後、資料列表之前，不跟著分頁移到標題列下方。
interface TransactionFiltersProps {
  filter: string;
  setFilter: (val: string) => void;
  dateRangeLabel: string;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filter, setFilter,
  dateRangeLabel,
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
        <div className="text-[11px] text-[#A69B87] tabular-nums flex items-center gap-1.5">
             <Calendar size={11} className="shrink-0"/> {dateRangeLabel}
        </div>
    </div>
  );
};
