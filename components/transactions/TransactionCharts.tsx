
import React from 'react';
import { Card } from '../ui';
import { 
  CalendarDays, DollarSign, Wallet, MoreHorizontal, Utensils, Bus, ShoppingBag, Home, FileText, Stethoscope, GraduationCap, LineChart, Users
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface TransactionChartsProps {
  dailyTrendData: any[];
  expenseStructure: any[];
  hasExpense: boolean;
}

const CATEGORY_STYLE: Record<string, { color: string, icon: any }> = {
  '餐飲': { color: 'bg-rose-500', icon: Utensils },
  '交通': { color: 'bg-blue-500', icon: Bus },
  '購物': { color: 'bg-amber-500', icon: ShoppingBag },
  '居住': { color: 'bg-cyan-500', icon: Home },
  '帳單': { color: 'bg-slate-500', icon: FileText },
  '醫療': { color: 'bg-emerald-500', icon: Stethoscope },
  '教育': { color: 'bg-indigo-500', icon: GraduationCap },
  '家庭': { color: 'bg-orange-500', icon: Users },
  'default': { color: 'bg-slate-600', icon: MoreHorizontal }
};

export const TransactionCharts: React.FC<TransactionChartsProps> = ({ dailyTrendData, expenseStructure, hasExpense }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-fade-in px-1">
        <Card theme="warm" className="lg:col-span-2 h-[280px] flex flex-col">
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-sm font-bold text-[#3D3428] flex items-center gap-2">
                  <CalendarDays size={16} className="text-[#C4523A]"/> 收支總覽趨勢
               </h3>
            </div>
            <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C4523A" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#C4523A" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6B9080" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6B9080" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3ECDF" vertical={false} opacity={0.8}/>
                      <XAxis dataKey="day" stroke="#A69B87" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis stroke="#A69B87" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #EDE4D6', borderRadius: '8px' }} itemStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="income" stroke="#C4523A" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" stroke="#6B9080" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
        </Card>

        <Card theme="warm" className="h-[280px] overflow-y-auto">
            <h3 className="text-sm font-bold text-[#3D3428] mb-4 flex items-center gap-2">
               <DollarSign size={16} className="text-amber-600"/> 支出結構分析
            </h3>

            {hasExpense ? (
              <div className="space-y-4">
                  <div className="h-3 w-full bg-[#F3ECDF] rounded-full flex overflow-hidden">
                      {expenseStructure.map((item, index) => {
                          const style = CATEGORY_STYLE[item.name] || CATEGORY_STYLE['default'];
                          return (
                              <div
                                  key={index}
                                  className={`${style.color} h-full`}
                                  style={{ width: `${item.percent}%` }}
                              ></div>
                          )
                      })}
                  </div>
                  <div className="space-y-2">
                      {expenseStructure.map((item, index) => {
                          const style = CATEGORY_STYLE[item.name] || CATEGORY_STYLE['default'];
                          const Icon = style.icon;
                          return (
                              <div key={index} className="flex items-center justify-between group">
                                  <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-md ${style.color} bg-opacity-20 flex items-center justify-center text-[#3D3428]/90`}>
                                          <Icon size={12} />
                                      </div>
                                      <div className="text-xs text-[#3D3428]">{item.name} <span className="text-[#A69B87]">({item.percent.toFixed(0)}%)</span></div>
                                  </div>
                                  <div className="text-xs font-bold text-[#3D3428] tabular-nums">
                                      ${item.value.toLocaleString()}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#A69B87] gap-2 pb-10">
                  <Wallet size={24} className="opacity-30"/>
                  <p className="text-xs">區間內尚無支出紀錄</p>
              </div>
            )}
        </Card>
    </div>
  );
};