import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button } from '../components/ui';
import { Asset, Transaction, AssetType, RecurringItem, BudgetConfig, ViewState, StockSnapshot, StockTransaction } from '../types';
import { 
    Sparkles, TrendingUp, AlertTriangle, Wallet, CreditCard, 
    BarChart3, Target, Flag, Bell, ArrowRight, PieChart as PieIcon, LineChart as LineIcon
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '../constants';
import { getHistory } from '../services/storage';
import { calculateStockPerformance } from '../services/stock';
import { InvestmentStats } from '../components/investments/InvestmentStats';

interface DashboardProps {
  assets: Asset[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  budgets: BudgetConfig[];
  stockHistory: StockSnapshot[];
  stockTransactions: StockTransaction[];
  onChangeView: (view: ViewState) => void;
  onAddTransaction: (t: Transaction) => void;
  onNavigateToTransactions: (filter: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  assets, 
  transactions, 
  recurring, 
  budgets,
  stockHistory,
  stockTransactions, 
  onChangeView, 
  onAddTransaction,
  onNavigateToTransactions 
}) => {
  const [netWorth, setNetWorth] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  
  const [activeMainChart, setActiveMainChart] = useState<'TREND' | 'CASH_FLOW'>('TREND');
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Quick Add State
  const [quickItem, setQuickItem] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  const calculateEstimatedMonthlyPayment = (debt: Asset) => {
      if (debt.type !== AssetType.DEBT || !debt.interestRate || !debt.termYears || !debt.amount) return 0;
      const graceYears = debt.interestOnlyPeriod || 0;
      const remainingYears = debt.termYears - graceYears;
      if (remainingYears <= 0) return 0;
      const p = debt.amount;
      const r = debt.interestRate / 100 / 12;
      const n = remainingYears * 12;
      if (r === 0) return p / n;
      return p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  };

  useEffect(() => {
    let assetsVal = 0;
    let liabilitiesVal = 0;

    assets.forEach(a => {
      const val = a.amount;
      if (a.type === AssetType.DEBT) {
        liabilitiesVal += val;
      } else {
        assetsVal += val;
      }
    });

    setNetWorth(assetsVal - liabilitiesVal);
    setTotalAssets(assetsVal);
    setTotalDebt(liabilitiesVal);
  }, [assets]);

  useEffect(() => {
    const history = getHistory();
    const dailyMap = new Map<string, any>();
    history.forEach(h => {
        const dist = h.assetDistribution || {};
        const debt = dist[AssetType.DEBT] || 0;
        let tAssets = h.totalAssets;
        if (tAssets === 0 && h.netWorth !== 0) {
             const cash = (dist[AssetType.CASH] || 0) + (dist[AssetType.OTHER] || 0);
             const invest = (dist[AssetType.STOCK] || 0) + (dist[AssetType.FUND] || 0) + (dist[AssetType.CRYPTO] || 0) + (dist[AssetType.REAL_ESTATE] || 0);
             tAssets = cash + invest;
        }
        dailyMap.set(h.date, {
            date: h.date.substring(5),
            fullDate: h.date,
            totalAssets: Math.round(tAssets),
            totalDebt: Math.round(debt),
            netWorth: Math.round(h.netWorth)
        });
    });

    let processed = Array.from(dailyMap.values()).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()).slice(-180);
    const todayFullDate = new Date().toISOString().split('T')[0];
    const todayIndex = processed.findIndex(p => p.fullDate === todayFullDate);
    if (todayIndex !== -1) {
        processed[todayIndex].totalAssets = Math.round(totalAssets);
        processed[todayIndex].totalDebt = Math.round(totalDebt);
        processed[todayIndex].netWorth = Math.round(netWorth);
    } else {
        processed.push({
            date: todayFullDate.substring(5),
            fullDate: todayFullDate,
            totalAssets: Math.round(totalAssets),
            totalDebt: Math.round(totalDebt),
            netWorth: Math.round(netWorth)
        });
    }
    setHistoryData([...processed]);
  }, [totalAssets, totalDebt, netWorth]);

  const dataByType = Object.values(AssetType).map(type => {
    if (type === AssetType.DEBT) return { name: ASSET_TYPE_LABELS[type], typeCode: type, value: 0 };
    const value = assets.filter(a => a.type === type).reduce((sum, a) => sum + a.amount, 0);
    return { name: ASSET_TYPE_LABELS[type] || type, typeCode: type, value };
  }).filter(d => d.value > 0);

  const inventory = useMemo(() => assets.filter(a => a.type === AssetType.STOCK), [assets]);
  const isAnyStockStale = useMemo(() => {
      const STALE_THRESHOLD = 14 * 24 * 60 * 60 * 1000;
      return inventory.some(stock => !stock.lastUpdated || (Date.now() - stock.lastUpdated) > STALE_THRESHOLD);
  }, [inventory]);

  const handleQuickAdd = () => {
      if (!quickItem || !quickAmount) return;
      const amountNum = Number(quickAmount);
      if (isNaN(amountNum) || amountNum <= 0) return;
      
      onAddTransaction({
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          amount: amountNum,
          category: '其他',
          item: quickItem,
          type: 'EXPENSE',
          source: 'MANUAL'
      });
      setQuickItem('');
      setQuickAmount('');
  };

  const hasRecordedToday = transactions.some(t => t.date === new Date().toISOString().split('T')[0]);

  // Derived Data for Charts & Radars
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Monthly Cash Flow Data
  const cashFlowData = useMemo(() => {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const dayTxs = transactions.filter(t => t.date === dateStr);
          const income = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
          return {
              date: String(i + 1), // Day of month
              net: income - expense,
              income,
              expense
          };
      });
  }, [transactions, currentMonth, currentYear]);

  // 2. Financial Milestone Countdown
  const nearestMilestone = useMemo<{ name: string, date: Date, monthsLeft: number, estimatedPayment: number } | null>(() => {
      const debtAssets = assets.filter(a => a.type === AssetType.DEBT && a.startDate && a.interestOnlyPeriod);
      let nearest: { name: string, date: Date, monthsLeft: number, estimatedPayment: number } | null = null;
      
      debtAssets.forEach(debt => {
          const start = new Date(debt.startDate!);
          const graceEnd = new Date(start.setFullYear(start.getFullYear() + debt.interestOnlyPeriod!));
          if (graceEnd > now) {
              const monthsLeft = (graceEnd.getFullYear() - now.getFullYear()) * 12 + (graceEnd.getMonth() - now.getMonth());
              const est = calculateEstimatedMonthlyPayment(debt);
              if (!nearest || monthsLeft < nearest.monthsLeft) {
                  nearest = { name: debt.name, date: graceEnd, monthsLeft, estimatedPayment: Math.round(est) };
              }
          }
      });
      return nearest;
  }, [assets, now]);

  // 3. Budget Danger Zone Radar
  const dangerBudgets = useMemo(() => {
      const currentMonthTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      });

      return budgets?.map(b => {
          const spent = currentMonthTransactions
              .filter(t => t.category === b.category && t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0);
          return { ...b, spent, percentage: b.limit > 0 ? (spent / b.limit) * 100 : 0 };
      }).filter(b => b.percentage >= 100) || [];
  }, [budgets, transactions, currentMonth, currentYear]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* 1. Daily Reminder / Inline Quick Add */}
      {!hasRecordedToday && (
         <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 rounded-full text-amber-500 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-amber-400 font-bold text-sm">今日尚未記帳</h3>
                <p className="text-slate-400 text-xs mt-0.5">順手記下一筆，讓財務更清晰。</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                    type="text" 
                    placeholder="項目 (如: 晚餐)" 
                    value={quickItem} 
                    onChange={e => setQuickItem(e.target.value)} 
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 w-full md:w-32 placeholder:text-slate-500" 
                    onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                />
                <input 
                    type="number" 
                    placeholder="金額" 
                    value={quickAmount} 
                    onChange={e => setQuickAmount(e.target.value)} 
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 w-full md:w-24 placeholder:text-slate-500" 
                    onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                />
                <Button 
                    variant="primary" 
                    onClick={handleQuickAdd} 
                    disabled={!quickItem || !quickAmount} 
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-1.5 text-sm whitespace-nowrap border-none disabled:opacity-50"
                >
                    快速記帳
                </Button>
            </div>
         </div>
      )}

      {/* 2. Key Metrics Cards (Interactive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
            className="bg-gradient-to-br from-primary/20 to-slate-800 border-primary/30 relative overflow-hidden group cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all"
            onClick={() => onChangeView('ASSETS')}
        >
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={100} />
            </div>
            <div className="text-primary-300 text-sm font-medium mb-2 flex items-center gap-2">
                <TrendingUp size={16}/> 淨資產總額 (Net Worth)
            </div>
            <div className="text-4xl font-bold text-white tracking-tight font-mono">
              ${netWorth.toLocaleString()}
            </div>
            <div className="mt-4 text-xs text-slate-400 group-hover:text-primary-300 transition-colors">
               資產 - 負債 (系統即時結算)
            </div>
        </Card>
        
        <Card 
            className="cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-emerald-500/50 transition-all group"
            onClick={() => onChangeView('ASSETS')}
        >
            <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                <Wallet size={16} className="text-emerald-400"/> 總資產 (Assets)
            </div>
            <div className="text-3xl font-bold text-white tracking-tight font-mono">
              ${totalAssets.toLocaleString()}
            </div>
        </Card>

        <Card 
            className="cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-red-500/50 transition-all group"
            onClick={() => {
                window.location.hash = 'debt';
                onChangeView('ASSETS');
            }}
        >
            <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2 group-hover:text-red-400 transition-colors">
                <CreditCard size={16} className="text-red-400"/> 總負債 (Debt)
            </div>
            <div className="text-3xl font-bold text-red-400 tracking-tight font-mono">
              ${totalDebt.toLocaleString()}
            </div>
        </Card>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main View (2/3 width) - Charts Tabs */}
          <div className="lg:col-span-2 flex flex-col gap-6">
              <Card className="border-slate-700/50 bg-slate-900/40 h-[400px] flex flex-col">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">
                            <BarChart3 size={20}/>
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-white">{activeMainChart === 'TREND' ? '總資產與負債長期趨勢' : '本月收支淨現金流趨勢'}</h3>
                            <p className="text-xs text-slate-400">{activeMainChart === 'TREND' ? '歷史資產與負債淨值變化' : '每日收入與支出結算 (Net Cash Flow)'}</p>
                         </div>
                      </div>
                      <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                          <button onClick={() => setActiveMainChart('TREND')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeMainChart === 'TREND' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}>資產趨勢</button>
                          <button onClick={() => setActiveMainChart('CASH_FLOW')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeMainChart === 'CASH_FLOW' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>本月現金流</button>
                      </div>
                  </div>
                  
                  <div className="flex-1 w-full min-h-0">
                      {activeMainChart === 'TREND' ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorDashAssets" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorDashDebt" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickCount={5} dy={10}/>
                                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/10000).toFixed(0)}萬`} width={55}/>
                                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ fontSize: '12px', padding: 0 }} formatter={(val: number) => `NT$ ${val.toLocaleString()}`}/>
                                  <Area type="monotone" dataKey="totalAssets" name="總資產" stroke="#10b981" fill="url(#colorDashAssets)" strokeWidth={2} />
                                  <Area type="monotone" dataKey="totalDebt" name="總負債" stroke="#ef4444" fill="url(#colorDashDebt)" strokeWidth={2} />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : (
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                                  <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} labelFormatter={(label) => `${currentMonth + 1}月${label}日`} formatter={(value: number, name: string) => { const labels: Record<string, string> = { net: '淨現金流', income: '收入', expense: '支出' }; return [`$${value.toLocaleString()}`, labels[name] || name]; }}/>
                                  <ReferenceLine y={0} stroke="#334155" />
                                  <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                      {cashFlowData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      )}
                  </div>
              </Card>

              {/* Bottom Full Width Component logic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Investment Summary */}
                 <Card className="border-slate-700/50 bg-slate-900/40 p-4">
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-white flex items-center gap-2"><LineIcon size={16} className="text-violet-400"/> 投資績效總覽</h3>
                         <Button variant="ghost" onClick={() => onChangeView('INVESTMENTS')} className="text-xs text-slate-400 hover:text-white px-2 py-1 h-auto">管理庫存 <ArrowRight size={12}/></Button>
                     </div>
                     <InvestmentStats inventory={inventory} isDataStale={isAnyStockStale} compact />
                 </Card>

                 {/* Financial Milestone with Payment Estimate */}
                 <Card className="border-slate-700/50 bg-slate-900/40 flex flex-col justify-between group">
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 mb-4">
                              <Target size={18} className="text-amber-400" />
                              <h3 className="font-bold text-white">長期財務焦點倒數</h3>
                          </div>
                      </div>
                      {nearestMilestone ? (
                          <div className="flex flex-col items-center justify-center text-center mt-2">
                              <h4 className="text-lg font-bold text-white mb-2">「{nearestMilestone.name}」本金攤還</h4>
                              <div className="flex items-end gap-2 mb-4">
                                  <span className="text-sm text-slate-400 pb-1">還有</span>
                                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-500">
                                      {nearestMilestone.monthsLeft}
                                  </span>
                                  <span className="text-sm text-slate-400 pb-1">個月</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-lg p-3 border border-slate-700 flex justify-between items-center">
                                  <span className="text-xs text-slate-400">預估每月還款：</span>
                                  <span className="text-lg font-bold text-red-400 font-mono">${nearestMilestone.estimatedPayment.toLocaleString()}</span>
                              </div>
                          </div>
                      ) : (
                          <div className="mt-4 flex flex-col items-center justify-center text-center opacity-50 py-4">
                              <Flag size={40} className="text-slate-600 mb-3" />
                              <p className="text-slate-400 text-sm">目前無設定寬限期之貸款項目</p>
                              <Button variant="ghost" onClick={() => { window.location.hash = 'debt'; onChangeView('ASSETS'); }} className="text-xs mt-2">前往設定</Button>
                          </div>
                      )}
                 </Card>
              </div>
          </div>

          {/* Sidebar (1/3 width) */}
          <div className="flex flex-col gap-6">
              {/* Asset Allocation */}
              <Card className="border-slate-700/50 bg-slate-900/40 h-[300px] flex flex-col relative overflow-hidden">
                  <h3 className="font-bold text-slate-300 mb-2 flex items-center gap-2">
                      <PieIcon size={16} className="text-primary"/> 資產配置佔比
                  </h3>
                  <div className="flex-1 relative -mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={dataByType}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={2}
                              dataKey="value"
                              labelLine={false}
                          >
                              {dataByType.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={ASSET_TYPE_COLORS[entry.typeCode] || '#94a3b8'} stroke="rgba(0,0,0,0)" />
                              ))}
                          </Pie>
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                              itemStyle={{ color: '#fff', fontSize: '12px' }}
                              formatter={(value: number) => `NT$ ${value.toLocaleString()}`}
                          />
                      </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center flex-wrap gap-x-3 gap-y-1 px-2 pointer-events-none pb-2">
                      {dataByType.slice(0, 4).map(d => (
                          <div key={d.typeCode} className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: ASSET_TYPE_COLORS[d.typeCode] }}></span>
                              <span className="text-[10px] text-slate-300">{d.name}</span>
                          </div>
                      ))}
                      </div>
                  </div>
              </Card>

              {/* Budget Danger Radar */}
              <Card className="border-slate-700/50 bg-slate-900/40 flex flex-col flex-1 min-h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <Bell size={18} className="text-red-400" />
                          <h3 className="font-bold text-white">本月超支雷達</h3>
                      </div>
                      <Button variant="ghost" onClick={() => onChangeView('BUDGET')} className="text-xs text-slate-400 hover:text-white px-2 py-1 h-auto">看預算</Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                      {dangerBudgets.length > 0 ? (
                          dangerBudgets.map((budget, idx) => (
                              <div 
                                  key={idx} 
                                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 transition-all flex justify-between items-center group"
                                  onClick={() => onNavigateToTransactions(budget.category)}
                              >
                                  <div>
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="font-bold text-red-400 text-sm">{budget.category}</span>
                                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded uppercase font-bold tracking-wider">Over</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                          已花費 ${budget.spent.toLocaleString()} / 上限 ${budget.limit.toLocaleString()}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-red-400">
                                          {Math.round(budget.percentage)}%
                                      </span>
                                      <ArrowRight size={14} className="text-red-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                                  <Sparkles size={20} className="text-emerald-500" />
                              </div>
                              <p className="text-emerald-400 font-bold text-sm">本月預算控制良好</p>
                              <p className="text-slate-500 text-xs mt-1">沒有分類超出設定的上限</p>
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      </div>
    </div>
  );
};
