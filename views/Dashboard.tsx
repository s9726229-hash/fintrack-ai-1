import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Input, Select } from '../components/ui';
import { Asset, Transaction, AssetType, RecurringItem, BudgetConfig, ViewState, StockSnapshot, StockTransaction } from '../types';
import {
    Sparkles, TrendingUp, AlertTriangle, Wallet, CreditCard,
    BarChart3, Target, Flag, Bell, ArrowRight, PieChart as PieIcon, LineChart as LineIcon,
    Calculator, ShieldAlert, Hourglass, Landmark
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '../constants';
import { getHistory } from '../services/storage';
import { formatMoney } from '../services/format';
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
  
  const [activeMainChart, setActiveMainChart] = useState<'WATERFALL' | 'TREND' | 'CASH_FLOW' | 'MONTHLY_INCOME' | 'ANNUAL_INCOME'>('TREND');
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Waterfall Chart Data
  const waterfallData = useMemo(() => {
    const cash = assets.filter(a => a.type === AssetType.CASH).reduce((sum, a) => sum + a.amount, 0);
    const stock = assets.filter(a => a.type === AssetType.STOCK).reduce((sum, a) => sum + a.amount, 0);
    const fund = assets.filter(a => [AssetType.FUND, AssetType.CRYPTO, AssetType.REAL_ESTATE, AssetType.OTHER].includes(a.type)).reduce((sum, a) => sum + a.amount, 0);
    const debt = totalDebt;
    return [
      { name: '現金', transparent: 0, value: cash, fill: '#38bdf8', label: cash },
      { name: '股票', transparent: cash, value: stock, fill: '#818cf8', label: stock },
      { name: '基金/其他', transparent: cash + stock, value: fund, fill: '#a78bfa', label: fund },
      { name: '總資產', transparent: 0, value: totalAssets, fill: '#10b981', label: totalAssets },
      { name: '負債', transparent: totalAssets - debt, value: debt, fill: '#ef4444', label: -debt },
      { name: '淨資產', transparent: 0, value: netWorth, fill: '#3b82f6', label: netWorth }
    ];
  }, [totalAssets, totalDebt, netWorth, assets]);

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

  // 寬限期內每月只繳利息，過寬限期後才是本息攤還——當月應繳金額要依「該月份」是否仍在寬限期計算
  const isInGracePeriod = (debt: Asset, at: Date) => {
      if (!debt.startDate || !debt.interestOnlyPeriod) return false;
      const graceEnd = new Date(debt.startDate);
      graceEnd.setFullYear(graceEnd.getFullYear() + debt.interestOnlyPeriod);
      return at < graceEnd;
  };
  const calculateMonthlyPaymentAt = (debt: Asset, at: Date) => {
      if (debt.type !== AssetType.DEBT || !debt.interestRate || !debt.termYears || !debt.amount) return 0;
      if (isInGracePeriod(debt, at)) return debt.amount * (debt.interestRate / 100 / 12);
      return calculateEstimatedMonthlyPayment(debt);
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
        const cash = (dist[AssetType.CASH] || 0) + (dist[AssetType.OTHER] || 0);
        const stock = dist[AssetType.STOCK] || 0;
        const fund = (dist[AssetType.FUND] || 0) + (dist[AssetType.CRYPTO] || 0) + (dist[AssetType.REAL_ESTATE] || 0);
        
        let tAssets = h.totalAssets;
        if (tAssets === 0 && h.netWorth !== 0) {
             tAssets = cash + stock + fund;
        }
        dailyMap.set(h.date, {
            date: h.date.substring(5),
            fullDate: h.date,
            totalAssets: Math.round(tAssets),
            totalDebt: Math.round(debt),
            netWorth: Math.round(h.netWorth),
            cash: Math.round(cash),
            stock: Math.round(stock),
            fund: Math.round(fund)
        });
    });

    let processed = Array.from(dailyMap.values()).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()).slice(-180);
    const todayFullDate = new Date().toISOString().split('T')[0];
    const todayIndex = processed.findIndex(p => p.fullDate === todayFullDate);
    const currentCash = assets.filter(a => a.type === AssetType.CASH || a.type === AssetType.OTHER).reduce((sum, a) => sum + a.amount, 0);
    const currentStock = assets.filter(a => a.type === AssetType.STOCK).reduce((sum, a) => sum + a.amount, 0);
    const currentFund = assets.filter(a => [AssetType.FUND, AssetType.CRYPTO, AssetType.REAL_ESTATE].includes(a.type)).reduce((sum, a) => sum + a.amount, 0);

    if (todayIndex !== -1) {
        processed[todayIndex].totalAssets = Math.round(totalAssets);
        processed[todayIndex].totalDebt = Math.round(totalDebt);
        processed[todayIndex].netWorth = Math.round(netWorth);
        processed[todayIndex].cash = Math.round(currentCash);
        processed[todayIndex].stock = Math.round(currentStock);
        processed[todayIndex].fund = Math.round(currentFund);
    } else {
        processed.push({
            date: todayFullDate.substring(5),
            fullDate: todayFullDate,
            totalAssets: Math.round(totalAssets),
            totalDebt: Math.round(totalDebt),
            netWorth: Math.round(netWorth),
            cash: Math.round(currentCash),
            stock: Math.round(currentStock),
            fund: Math.round(currentFund)
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
  const expenseCategories = useMemo(() => {
      return Array.from(new Set(transactions.filter(t => t.type === 'EXPENSE').map(t => t.category)));
  }, [transactions]);

  const cashFlowData = useMemo(() => {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          
          const dayTxs = transactions.filter(t => t.date === dateStr);
          const income = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expenseTxs = dayTxs.filter(t => t.type === 'EXPENSE');
          const expense = expenseTxs.reduce((s, t) => s + t.amount, 0);
          const dividend = dayTxs.filter(t => t.type === 'DIVIDEND').reduce((s, t) => s + t.amount, 0);

          const dayStockTxs = stockTransactions?.filter(t => t.date === dateStr && t.side === 'SELL') || [];
          const stockProfit = dayStockTxs.reduce((s, t) => s + (t.realizedProfit || 0), 0);

          const totalStockIncome = dividend + stockProfit;

          const result: any = {
              date: String(i + 1), // Day of month
              net: income + totalStockIncome - expense,
              income,
              expense,
              stockIncome: totalStockIncome
          };

          expenseCategories.forEach(cat => {
              const catTotal = expenseTxs.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
              if (catTotal > 0) result[`exp_${cat}`] = -catTotal;
          });

          return result;
      });
  }, [transactions, stockTransactions, currentMonth, currentYear, expenseCategories]);

  // 1.5 Historical Monthly Net Income
  const historicalMonthlyIncomeData = useMemo(() => {
      const data = [];
      const numMonths = 6; // Last 6 months
      for (let i = numMonths - 1; i >= 0; i--) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = targetDate.getFullYear();
          const month = targetDate.getMonth();
          const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

          // Income & Expenses from transactions
          const monthTxs = transactions.filter(t => {
              const d = new Date(t.date);
              return d.getFullYear() === year && d.getMonth() === month;
          });
          const income = monthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expense = monthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

          // Stock income
          const dividend = monthTxs.filter(t => t.type === 'DIVIDEND').reduce((s, t) => s + t.amount, 0);
          const monthStockTxs = stockTransactions?.filter(t => {
              if (t.side !== 'SELL') return false;
              const d = new Date(t.date);
              return d.getFullYear() === year && d.getMonth() === month;
          }) || [];
          const stockProfit = monthStockTxs.reduce((s, t) => s + (t.realizedProfit || 0), 0);
          const stockIncome = dividend + stockProfit;

          // Debt payments for this month
          let debtPayments = 0;
          const midOfMonth = new Date(year, month, 15);
          assets.filter(a => a.type === AssetType.DEBT).forEach(debt => {
              if (debt.startDate) {
                  const start = new Date(debt.startDate);
                  if (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() <= month)) {
                      debtPayments += Math.round(calculateMonthlyPaymentAt(debt, midOfMonth));
                  }
              } else {
                  debtPayments += Math.round(calculateMonthlyPaymentAt(debt, midOfMonth));
              }
          });

          const totalExpense = expense + debtPayments;
          const netIncome = income + stockIncome - totalExpense;

          data.push({
              month: monthStr,
              netIncome,
              income,
              stockIncome,
              expense,
              debtPayments
          });
      }
      return data;
  }, [transactions, stockTransactions, assets, now]);

  // 1.6 Historical Annual Net Income
  const historicalAnnualIncomeData = useMemo(() => {
      const data = [];
      const numYears = 3; // Last 3 years
      for (let i = numYears - 1; i >= 0; i--) {
          const year = now.getFullYear() - i;
          const yearStr = `${year}年`;

          // Income & Expenses from transactions
          const yearTxs = transactions.filter(t => new Date(t.date).getFullYear() === year);
          const income = yearTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expense = yearTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

          // Stock income
          const dividend = yearTxs.filter(t => t.type === 'DIVIDEND').reduce((s, t) => s + t.amount, 0);
          const yearStockTxs = stockTransactions?.filter(t => t.side === 'SELL' && new Date(t.date).getFullYear() === year) || [];
          const stockProfit = yearStockTxs.reduce((s, t) => s + (t.realizedProfit || 0), 0);
          const stockIncome = dividend + stockProfit;

          // Debt payments for this year
          let debtPayments = 0;
          assets.filter(a => a.type === AssetType.DEBT).forEach(debt => {
              let startMonth: number;
              if (debt.startDate) {
                  const start = new Date(debt.startDate);
                  startMonth = start.getFullYear() === year ? start.getMonth() : (start.getFullYear() < year ? 0 : 12);
              } else {
                  startMonth = 0;
              }
              const endMonth = now.getFullYear() === year ? now.getMonth() : 11;
              // 逐月累加：每個月依當時是否在寬限期取實際應繳金額
              for (let mo = startMonth; mo <= endMonth; mo++) {
                  debtPayments += Math.round(calculateMonthlyPaymentAt(debt, new Date(year, mo, 15)));
              }
          });

          const totalExpense = expense + debtPayments;
          const netIncome = income + stockIncome - totalExpense;

          data.push({
              year: yearStr,
              netIncome,
              income,
              stockIncome,
              expense,
              debtPayments
          });
      }
      return data;
  }, [transactions, stockTransactions, assets, now]);

  // 2. All Debts Overview with Grace Period
  const allDebtPayments = useMemo(() => {
      return assets.filter(a => a.type === AssetType.DEBT).map(debt => {
          let graceMonthsLeft = null;
          if (debt.startDate && debt.interestOnlyPeriod) {
              const start = new Date(debt.startDate);
              const graceEnd = new Date(start.setFullYear(start.getFullYear() + debt.interestOnlyPeriod));
              if (graceEnd > now) {
                  graceMonthsLeft = (graceEnd.getFullYear() - now.getFullYear()) * 12 + (graceEnd.getMonth() - now.getMonth());
              }
          }
          return {
              id: debt.id,
              name: debt.name,
              amount: debt.amount,
              // 當月實際應繳（寬限期內＝只繳利息）
              estimatedPayment: Math.round(calculateMonthlyPaymentAt(debt, now)),
              // 過寬限期後的本息攤還金額，寬限期內另行標示提醒
              postGracePayment: Math.round(calculateEstimatedMonthlyPayment(debt)),
              graceMonthsLeft
          };
      }).sort((a, b) => b.estimatedPayment - a.estimatedPayment);
  }, [assets, now]);

  // 2.5 本月財務摘要（規則式白話分析，不呼叫 AI）
  const monthlySummary = useMemo(() => {
      const y = now.getFullYear(), m = now.getMonth();
      const prevY = m === 0 ? y - 1 : y, prevM = m === 0 ? 11 : m - 1;
      const inMonth = (dateStr: string, yy: number, mm: number) => {
          const d = new Date(dateStr);
          return d.getFullYear() === yy && d.getMonth() === mm;
      };

      const thisTxs = transactions.filter(t => inMonth(t.date, y, m));
      const lastTxs = transactions.filter(t => inMonth(t.date, prevY, prevM));
      const income = thisTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = thisTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const lastIncome = lastTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const lastExpense = lastTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const netFlow = income - expense;
      const flowDiff = netFlow - (lastIncome - lastExpense);

      // 現金流變化主因：本月 vs 上月變化量最大的支出類別
      const catDelta: Record<string, number> = {};
      thisTxs.filter(t => t.type === 'EXPENSE').forEach(t => { catDelta[t.category] = (catDelta[t.category] || 0) + t.amount; });
      lastTxs.filter(t => t.type === 'EXPENSE').forEach(t => { catDelta[t.category] = (catDelta[t.category] || 0) - t.amount; });
      let driver: { category: string; delta: number } | null = null;
      for (const [c, d] of Object.entries(catDelta)) {
          if (!driver || Math.abs(d) > Math.abs(driver.delta)) driver = { category: c, delta: d };
      }

      // 股票：未實現損益、本月已實現、本月股息、最佳/最弱持股
      const holdings = assets.filter(a => a.type === AssetType.STOCK);
      let unrealized = 0;
      const perfEntries = holdings.map(s => {
          const p = calculateStockPerformance(s, transactions);
          unrealized += p.netProfit;
          return { name: s.name || s.symbol || '?', roi: p.roi };
      });
      const best = perfEntries.length > 0 ? perfEntries.reduce((a, b) => (b.roi > a.roi ? b : a)) : null;
      const worst = perfEntries.length > 0 ? perfEntries.reduce((a, b) => (b.roi < a.roi ? b : a)) : null;
      const realized = (stockTransactions || [])
          .filter(t => t.side === 'SELL' && inMonth(t.date, y, m))
          .reduce((s, t) => s + (t.realizedProfit || 0), 0);
      const dividendIncome = thisTxs.filter(t => t.type === 'DIVIDEND').reduce((s, t) => s + t.amount, 0);

      // 支出結構：最大類別、單筆最大、超出預算的類別
      const catTotals: Record<string, number> = {};
      thisTxs.filter(t => t.type === 'EXPENSE').forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
      let topCat: { category: string; amount: number } | null = null;
      for (const [c, a] of Object.entries(catTotals)) {
          if (!topCat || a > topCat.amount) topCat = { category: c, amount: a };
      }
      const biggestTx = thisTxs.filter(t => t.type === 'EXPENSE').slice().sort((a, b) => b.amount - a.amount)[0] || null;
      const overBudget = (budgets || []).filter(b => b.limit > 0 && (catTotals[b.category] || 0) > b.limit);

      const savingsRate = income > 0 ? (netFlow / income) * 100 : null;

      return {
          income, expense, netFlow, flowDiff, driver,
          holdingsCount: holdings.length, unrealized, realized, dividendIncome, best, worst,
          topCat, biggestTx, overBudget, savingsRate,
          hasData: thisTxs.length > 0 || holdings.length > 0,
      };
  }, [transactions, assets, stockTransactions, budgets, now]);

  // 2.6 財務風險與規劃：寬限期衝擊、現金跑道、利息成本、扣款帳戶監控、多還本金回饋
  const financialPlanning = useMemo(() => {
      const debts = assets.filter(a => a.type === AssetType.DEBT);

      // 固定收支（含年攤提，與固定收支頁同一算法）
      let fixedIncome = 0, fixedExpense = 0;
      (recurring || []).forEach(item => {
          const monthly = item.frequency === 'YEARLY' ? Math.round(item.amount / 12) : item.amount;
          if (item.type === 'INCOME') fixedIncome += monthly; else fixedExpense += monthly;
      });
      const fixedBalance = fixedIncome - fixedExpense;

      // 寬限期衝擊：每筆仍在寬限期的貸款，寬限結束後月付增加多少
      const graceImpacts = debts.flatMap(d => {
          if (!d.startDate || !d.interestOnlyPeriod) return [];
          const graceEnd = new Date(d.startDate);
          graceEnd.setFullYear(graceEnd.getFullYear() + d.interestOnlyPeriod);
          if (graceEnd <= now) return [];
          const current = Math.round(calculateMonthlyPaymentAt(d, now));
          const after = Math.round(calculateEstimatedMonthlyPayment(d));
          if (after <= current) return [];
          const monthsLeft = (graceEnd.getFullYear() - now.getFullYear()) * 12 + (graceEnd.getMonth() - now.getMonth());
          return [{ name: d.name, graceEnd, monthsLeft, jump: after - current, current, after }];
      });
      const totalJump = graceImpacts.reduce((s, g) => s + g.jump, 0);
      const postGraceBalance = fixedBalance - totalJump;

      // 現金跑道：流動現金 ÷ 每月淨流出（收支平衡以上則無耗損）
      const liquidCash = assets.filter(a => a.type === AssetType.CASH).reduce((s, a) => s + a.amount, 0);
      const runwayNow = fixedBalance < 0 ? liquidCash / -fixedBalance : null;
      const runwayAfter = postGraceBalance < 0 ? liquidCash / -postGraceBalance : null;

      // 利息成本：各貸款剩餘本金 × 年利率 / 12（近似當前每月利息），趨近 0 的項目不列
      const interestItems = debts
          .filter(d => d.interestRate && d.amount)
          .map(d => ({ name: d.name, monthly: Math.round(d.amount * (d.interestRate! / 100) / 12) }))
          .filter(i => i.monthly > 0)
          .sort((a, b) => b.monthly - a.monthly);
      const monthlyInterest = interestItems.reduce((s, i) => s + i.monthly, 0);

      // 扣款帳戶餘額監控：同帳戶多筆貸款合併計算「還能扣幾個月」
      const byAccount = new Map<string, { accountName: string; balance: number; totalPay: number; debtNames: string[] }>();
      debts.forEach(d => {
          if (!d.paymentAccountId) return;
          const acct = assets.find(a => a.id === d.paymentAccountId);
          if (!acct) return;
          const monthlyPay = Math.round(calculateMonthlyPaymentAt(d, now));
          if (monthlyPay <= 0) return;
          const entry = byAccount.get(acct.id) || { accountName: acct.name, balance: acct.amount, totalPay: 0, debtNames: [] };
          entry.totalPay += monthlyPay;
          entry.debtNames.push(d.name);
          byAccount.set(acct.id, entry);
      });
      const accountChecks = Array.from(byAccount.values()).map(a => ({
          ...a,
          monthsCovered: Math.floor(a.balance / a.totalPay),
      })).sort((a, b) => a.monthsCovered - b.monthsCovered);

      // 多還本金回饋：固定收支項目金額 > 依利率計算的最低應繳 → 正向提示。
      // 名稱可能一對多（「房貸」同時符合房貸(本金)/房貸(保險)），同一個固定收支項目只配給金額最接近的那筆貸款。
      const candidates = debts.flatMap(d => {
          const rec = (recurring || []).find(r =>
              r.type === 'EXPENSE' && r.name && d.name && (d.name.includes(r.name) || r.name.includes(d.name))
          );
          if (!rec) return [];
          const minPay = Math.round(calculateMonthlyPaymentAt(d, now));
          if (minPay <= 0) return [];
          const recMonthly = rec.frequency === 'YEARLY' ? Math.round(rec.amount / 12) : rec.amount;
          return [{ debtName: d.name, recId: rec.id, diff: recMonthly - minPay, gap: Math.abs(recMonthly - minPay) }];
      });
      const bestByRec = new Map<string, typeof candidates[number]>();
      candidates.forEach(c => {
          const existing = bestByRec.get(c.recId);
          if (!existing || c.gap < existing.gap) bestByRec.set(c.recId, c);
      });
      const overpayments = Array.from(bestByRec.values()).filter(c => c.diff > 0);

      return {
          fixedIncome, fixedExpense, fixedBalance,
          graceImpacts, totalJump, postGraceBalance,
          liquidCash, runwayNow, runwayAfter,
          interestItems, monthlyInterest,
          accountChecks, overpayments,
          debts,
      };
  }, [assets, recurring, now]);

  // 提前還款模擬器
  const [simDebtId, setSimDebtId] = useState<string>('');
  const [simAmount, setSimAmount] = useState<string>('');
  const prepaySimulation = useMemo(() => {
      const debt = financialPlanning.debts.find(d => d.id === simDebtId);
      const prepay = parseFloat(simAmount);
      if (!debt || !prepay || prepay <= 0 || !debt.interestRate || !debt.termYears || !debt.amount) return null;
      if (prepay >= debt.amount) return { payoff: true as const, debtName: debt.name };

      const r = debt.interestRate / 100 / 12;
      const graceYears = debt.interestOnlyPeriod || 0;
      const n = Math.max(1, Math.round((debt.termYears - graceYears) * 12));
      const pmt = (p: number) => (r === 0 ? p / n : p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
      const oldPayment = pmt(debt.amount);
      const newPayment = pmt(debt.amount - prepay);

      // 攤還期利息差 = 總繳款差 − 本金差；寬限期內另省下 prepay 在剩餘寬限月數的利息
      let graceMonthsLeft = 0;
      if (debt.startDate && debt.interestOnlyPeriod) {
          const graceEnd = new Date(debt.startDate);
          graceEnd.setFullYear(graceEnd.getFullYear() + debt.interestOnlyPeriod);
          if (graceEnd > now) {
              graceMonthsLeft = (graceEnd.getFullYear() - now.getFullYear()) * 12 + (graceEnd.getMonth() - now.getMonth());
          }
      }
      const interestSaved = (oldPayment - newPayment) * n - prepay + prepay * r * graceMonthsLeft;
      const currentMonthly = Math.round(calculateMonthlyPaymentAt(debt, now));
      const newMonthly = graceMonthsLeft > 0 ? Math.round((debt.amount - prepay) * r) : Math.round(newPayment);

      return {
          payoff: false as const,
          debtName: debt.name,
          currentMonthly,
          newMonthly,
          monthlySaved: currentMonthly - newMonthly,
          postGraceOld: Math.round(oldPayment),
          postGraceNew: Math.round(newPayment),
          interestSaved: Math.round(interestSaved),
          inGrace: graceMonthsLeft > 0,
      };
  }, [simDebtId, simAmount, financialPlanning.debts, now]);

  // 3. Budget Execution Progress
  const budgetProgressData = useMemo(() => {
      const currentMonthTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      });

      return budgets?.map(b => {
          const spent = currentMonthTransactions
              .filter(t => t.category === b.category && t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0);
          return { 
              name: b.category, 
              spent, 
              limit: b.limit,
              percentage: b.limit > 0 ? (spent / b.limit) * 100 : 0 
          };
      }).sort((a, b) => b.percentage - a.percentage) || [];
  }, [budgets, transactions, currentMonth, currentYear]);

  // 4. Net Worth Trend (vs ~30 days ago)
  const netWorthTrend = useMemo(() => {
      if (historyData.length < 2) return null;
      const todayEntry = historyData[historyData.length - 1];
      const targetDate = new Date(todayEntry.fullDate);
      targetDate.setDate(targetDate.getDate() - 30);
      const targetStr = targetDate.toISOString().split('T')[0];
      let baseline = null;
      for (let i = historyData.length - 1; i >= 0; i--) {
          if (historyData[i].fullDate <= targetStr) { baseline = historyData[i]; break; }
      }
      if (!baseline || baseline.fullDate === todayEntry.fullDate) return null;
      const diff = todayEntry.netWorth - baseline.netWorth;
      const pct = baseline.netWorth !== 0 ? (diff / Math.abs(baseline.netWorth)) * 100 : null;
      return { diff, pct };
  }, [historyData]);

  // 5. Monthly Net Income Trend (this month vs last month)
  const monthlyIncomeTrend = useMemo(() => {
      if (historicalMonthlyIncomeData.length < 2) return null;
      const cur = historicalMonthlyIncomeData[historicalMonthlyIncomeData.length - 1];
      const prev = historicalMonthlyIncomeData[historicalMonthlyIncomeData.length - 2];
      const diff = cur.netIncome - prev.netIncome;
      const pct = prev.netIncome !== 0 ? (diff / Math.abs(prev.netIncome)) * 100 : null;
      return { diff, pct };
  }, [historicalMonthlyIncomeData]);

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
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
                    placeholder="項目"
                    aria-label="快速記帳項目"
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
            className={netWorth < 0
                ? "bg-gradient-to-br from-red-900/40 to-slate-800 border-red-500/40 relative overflow-hidden group cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all"
                : "bg-gradient-to-br from-primary/20 to-slate-800 border-primary/30 relative overflow-hidden group cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all"}
            onClick={() => onChangeView('ASSETS')}
        >
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                {netWorth < 0 ? <AlertTriangle size={100} /> : <Sparkles size={100} />}
            </div>
            <div className={`text-sm font-medium mb-2 flex items-center gap-2 ${netWorth < 0 ? 'text-red-300' : 'text-primary-300'}`}>
                {netWorth < 0 ? <AlertTriangle size={16}/> : <TrendingUp size={16}/>} 淨資產總額 (Net Worth)
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
                <div className={`text-4xl font-bold tracking-tight font-mono ${netWorth < 0 ? 'text-red-400' : 'text-white'}`}>
                  {formatMoney(netWorth)}
                </div>
                {netWorthTrend && (
                    <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${netWorthTrend.diff > 0 ? 'text-red-400' : netWorthTrend.diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {netWorthTrend.diff > 0 ? '▲' : netWorthTrend.diff < 0 ? '▼' : ''}
                        {netWorthTrend.diff !== 0 ? Math.abs(netWorthTrend.diff).toLocaleString() : '0'}
                        {netWorthTrend.pct !== null && ` (${netWorthTrend.diff >= 0 ? '+' : '-'}${Math.abs(netWorthTrend.pct).toFixed(1)}%)`}
                    </span>
                )}
            </div>
            <div className={`mt-4 text-xs transition-colors ${netWorth < 0 ? 'text-red-300/70 group-hover:text-red-300' : 'text-slate-400 group-hover:text-primary-300'}`}>
               {netWorth < 0 ? '負債大於資產，建議檢視還款計畫' : '資產 - 負債 (系統即時結算)'} {netWorthTrend && '· 近30天'}
            </div>
        </Card>
        
        <Card 
            className="cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-emerald-500/50 transition-all group flex flex-col justify-between"
            onClick={() => onChangeView('ASSETS')}
        >
            <div>
                <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                    <Wallet size={16} className="text-emerald-400"/> 總資產 (Assets)
                </div>
                <div className="text-3xl font-bold text-white tracking-tight font-mono mb-2">
                  {formatMoney(totalAssets)}
                </div>
            </div>
            
            {/* Asset Allocation Breakdown */}
            {totalAssets > 0 && (
                <div className="mt-auto">
                    <div className="flex gap-x-3 gap-y-1 text-xs text-slate-400 flex-wrap">
                        {dataByType.sort((a, b) => b.value - a.value).slice(0, 3).map(d => (
                            <div key={d.typeCode} className="flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ASSET_TYPE_COLORS[d.typeCode] || '#94a3b8' }}></div>
                                <span>{d.name} {((d.value / totalAssets) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                        {dataByType.length > 3 && <span className="text-xs">...</span>}
                    </div>
                </div>
            )}
        </Card>

        <Card 
            className="cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-red-500/50 transition-all group flex flex-col justify-between"
            onClick={() => {
                window.location.hash = 'debt';
                onChangeView('ASSETS');
            }}
        >
            <div>
                <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2 group-hover:text-red-400 transition-colors">
                    <CreditCard size={16} className="text-red-400"/> 總負債 (Debt)
                </div>
                <div className="text-3xl font-bold text-red-400 tracking-tight font-mono mb-2">
                  {formatMoney(totalDebt)}
                </div>
            </div>

            {/* Debt Breakdown */}
            {totalDebt > 0 && (
                <div className="mt-auto">
                    <div className="flex gap-x-3 gap-y-1 text-xs text-slate-400 flex-wrap">
                        {assets.filter(a => a.type === AssetType.DEBT).sort((a, b) => b.amount - a.amount).slice(0, 3).map(d => (
                            <div key={d.id} className="flex items-center gap-1 group-hover:text-red-300 transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                <span>{d.name} {((d.amount / totalDebt) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                        {assets.filter(a => a.type === AssetType.DEBT).length > 3 && <span className="text-xs">...</span>}
                    </div>
                </div>
            )}
        </Card>
      </div>

      {/* 本月財務摘要（規則式白話分析，不呼叫 AI） */}
      {monthlySummary.hasData && (
        <Card className="border-slate-700/50 bg-slate-900/40 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3 flex-wrap">
                <Sparkles size={18} className="text-cyan-400"/>
                <h3 className="font-bold text-white text-lg">本月財務摘要</h3>
                <span className="text-xs text-slate-400">{now.getMonth() + 1} 月 · 依記帳與庫存資料自動整理</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 text-sm leading-relaxed">
                {/* 現金流 */}
                <div className="flex items-start gap-3">
                    <div className="text-cyan-400 bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20 shrink-0"><Wallet size={16}/></div>
                    <p className="text-slate-300">
                        <span className="font-bold text-slate-200">現金流：</span>
                        本月收入 <span className="font-mono text-emerald-400">{formatMoney(monthlySummary.income)}</span>、支出 <span className="font-mono text-rose-400">{formatMoney(monthlySummary.expense)}</span>，
                        {monthlySummary.netFlow >= 0 ? '淨流入 ' : '淨流出 '}
                        <span className={`font-mono font-bold ${monthlySummary.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(Math.abs(monthlySummary.netFlow))}</span>
                        {monthlySummary.flowDiff !== 0 && (
                            <>，比上月{monthlySummary.flowDiff > 0 ? '改善' : '惡化'} <span className="font-mono">{formatMoney(Math.abs(monthlySummary.flowDiff))}</span></>
                        )}
                        {monthlySummary.driver && Math.abs(monthlySummary.driver.delta) > 1000 && (
                            <>，主因是「{monthlySummary.driver.category}」支出{monthlySummary.driver.delta > 0 ? '增加' : '減少'} <span className="font-mono">{formatMoney(Math.abs(monthlySummary.driver.delta))}</span></>
                        )}。
                    </p>
                </div>
                {/* 股票 */}
                {monthlySummary.holdingsCount > 0 && (
                    <div className="flex items-start gap-3">
                        <div className="text-violet-400 bg-violet-500/10 p-2 rounded-lg border border-violet-500/20 shrink-0"><TrendingUp size={16}/></div>
                        <p className="text-slate-300">
                            <span className="font-bold text-slate-200">股票：</span>
                            庫存未實現損益 <span className={`font-mono font-bold ${monthlySummary.unrealized > 0 ? 'text-red-400' : monthlySummary.unrealized < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>{formatMoney(monthlySummary.unrealized, { showPlus: true })}</span>
                            {monthlySummary.realized !== 0 && (
                                <>，本月已實現 <span className={`font-mono ${monthlySummary.realized > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatMoney(monthlySummary.realized, { showPlus: true })}</span></>
                            )}
                            {monthlySummary.dividendIncome > 0 && (
                                <>，股息入帳 <span className="font-mono text-emerald-400">{formatMoney(monthlySummary.dividendIncome, { showPlus: true })}</span></>
                            )}
                            {monthlySummary.best && monthlySummary.worst && monthlySummary.best.name !== monthlySummary.worst.name && (
                                <>；表現最佳 {monthlySummary.best.name}（<span className="font-mono text-red-400">{monthlySummary.best.roi >= 0 ? '+' : ''}{monthlySummary.best.roi.toFixed(1)}%</span>）、最弱 {monthlySummary.worst.name}（<span className="font-mono text-emerald-400">{monthlySummary.worst.roi.toFixed(1)}%</span>）</>
                            )}。
                        </p>
                    </div>
                )}
                {/* 支出結構 */}
                {monthlySummary.topCat && (
                    <div className="flex items-start gap-3">
                        <div className="text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 shrink-0"><PieIcon size={16}/></div>
                        <p className="text-slate-300">
                            <span className="font-bold text-slate-200">支出：</span>
                            最大類別是「{monthlySummary.topCat.category}」<span className="font-mono">{formatMoney(monthlySummary.topCat.amount)}</span>
                            {monthlySummary.expense > 0 && <>（佔 {((monthlySummary.topCat.amount / monthlySummary.expense) * 100).toFixed(0)}%）</>}
                            {monthlySummary.biggestTx && (
                                <>；單筆最大是「{monthlySummary.biggestTx.item}」<span className="font-mono">{formatMoney(monthlySummary.biggestTx.amount)}</span></>
                            )}
                            {monthlySummary.overBudget.length > 0 && (
                                <>；<span className="text-amber-400 font-bold">{monthlySummary.overBudget.map(b => `「${b.category}」`).join('、')}已超出預算</span></>
                            )}。
                        </p>
                    </div>
                )}
                {/* 儲蓄率 */}
                {monthlySummary.savingsRate !== null && (
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border shrink-0 ${monthlySummary.savingsRate >= 20 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : monthlySummary.savingsRate >= 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}><Target size={16}/></div>
                        <p className="text-slate-300">
                            <span className="font-bold text-slate-200">儲蓄率：</span>
                            本月 <span className={`font-mono font-bold ${monthlySummary.savingsRate >= 20 ? 'text-emerald-400' : monthlySummary.savingsRate >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{monthlySummary.savingsRate.toFixed(1)}%</span>。
                            {monthlySummary.savingsRate >= 20
                                ? '收支結構健康，可持續累積資產。'
                                : monthlySummary.savingsRate >= 0
                                ? '結餘偏低，建議檢視非必要支出，優先保留應急預備金。'
                                : '本月入不敷出，建議先檢視大額與非必要支出，避免動用存款或增加負債。'}
                        </p>
                    </div>
                )}
                {/* 配置風險與淨資產轉正預測 */}
                {(monthlySummary.holdingsCount > 0 || netWorth < 0) && totalAssets > 0 && (() => {
                    const stockValue = assets.filter(a => a.type === AssetType.STOCK).reduce((s, a) => s + a.amount, 0);
                    const leverageValue = assets.filter(a => a.type === AssetType.STOCK && ((a.name || '').includes('正2') || (a.symbol || '').endsWith('L'))).reduce((s, a) => s + a.amount, 0);
                    const stockPct = (stockValue / totalAssets) * 100;
                    const leveragePct = (leverageValue / totalAssets) * 100;
                    const highRisk = netWorth < 0 && stockPct > 40;
                    return (
                        <div className="flex items-start gap-3 lg:col-span-2">
                            <div className={`p-2 rounded-lg border shrink-0 ${highRisk ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-sky-400 bg-sky-500/10 border-sky-500/20'}`}><ShieldAlert size={16}/></div>
                            <p className="text-slate-300">
                                <span className="font-bold text-slate-200">風險：</span>
                                股票佔總資產 <span className={`font-mono font-bold ${highRisk ? 'text-red-400' : 'text-slate-200'}`}>{stockPct.toFixed(0)}%</span>
                                {leverageValue > 0 && <>（其中槓桿型 ETF 佔總資產 <span className="font-mono text-amber-400">{leveragePct.toFixed(1)}%</span>）</>}
                                {highRisk && <>。<span className="text-red-300">在淨資產為負、每月固定結餘為負的狀態下，股票部位的回檔會直接縮短現金跑道，建議控制槓桿部位並保留足額預備金</span></>}
                                {netWorth < 0 && netWorthTrend && (
                                    netWorthTrend.diff > 0
                                        ? <>。以近 30 天淨資產改善速度（+{Math.round(netWorthTrend.diff).toLocaleString()}/月）推估，約 <span className="font-mono font-bold text-emerald-400">{(Math.abs(netWorth) / netWorthTrend.diff / 12).toFixed(1)} 年</span>後淨資產轉正（受股價波動影響大，僅供參考）</>
                                        : <>。近 30 天淨資產仍在下降，尚無法推估轉正時點</>
                                )}。
                            </p>
                        </div>
                    );
                })()}
            </div>
        </Card>
      )}

      {/* Bento Grid layout */}
      <div className="flex flex-col gap-6">
          {/* Main View (Full width) - Charts Tabs */}
          <div className="w-full">
              <Card className="border-slate-700/50 bg-slate-900/40 h-[400px] flex flex-col">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">
                            <BarChart3 size={20}/>
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-white">
                                {activeMainChart === 'WATERFALL' ? '資產配置演進' : activeMainChart === 'TREND' ? '總資產與負債趨勢' : activeMainChart === 'MONTHLY_INCOME' ? '歷史月度淨收益' : activeMainChart === 'ANNUAL_INCOME' ? '歷史年度淨收益' : '本月金流與分類'}
                            </h3>
                            <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                                <span>{activeMainChart === 'WATERFALL' ? '各類資產的成長貢獻' : activeMainChart === 'TREND' ? '歷史資產累積與淨值變化' : activeMainChart === 'MONTHLY_INCOME' ? '每月最終結算之正負收益' : activeMainChart === 'ANNUAL_INCOME' ? '年度最終結算之正負收益' : '每日收入與支出分佈 (含股票收益)'}</span>
                                {activeMainChart === 'MONTHLY_INCOME' && monthlyIncomeTrend && (
                                    <span className={`font-mono font-bold flex items-center gap-0.5 ${monthlyIncomeTrend.diff > 0 ? 'text-red-400' : monthlyIncomeTrend.diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                        本月 vs 上月：
                                        {monthlyIncomeTrend.diff > 0 ? '▲' : monthlyIncomeTrend.diff < 0 ? '▼' : ''}
                                        {Math.abs(monthlyIncomeTrend.diff).toLocaleString()}
                                        {monthlyIncomeTrend.pct !== null && ` (${monthlyIncomeTrend.diff >= 0 ? '+' : '-'}${Math.abs(monthlyIncomeTrend.pct).toFixed(1)}%)`}
                                    </span>
                                )}
                            </p>
                         </div>
                      </div>
                      <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 gap-1 overflow-x-auto no-scrollbar max-w-full">
                          <button onClick={() => setActiveMainChart('TREND')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${activeMainChart === 'TREND' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}>資產趨勢</button>
                          <button onClick={() => setActiveMainChart('WATERFALL')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${activeMainChart === 'WATERFALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>資產演進</button>
                          <button onClick={() => setActiveMainChart('CASH_FLOW')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${activeMainChart === 'CASH_FLOW' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>本月金流</button>
                          <button onClick={() => setActiveMainChart('MONTHLY_INCOME')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${activeMainChart === 'MONTHLY_INCOME' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>月度收支</button>
                          <button onClick={() => setActiveMainChart('ANNUAL_INCOME')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${activeMainChart === 'ANNUAL_INCOME' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>年度收支</button>
                      </div>
                  </div>
                  
                  <div className="flex-1 w-full min-h-0">
                      {activeMainChart === 'WATERFALL' ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.2}/>
                                      </linearGradient>
                                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                                      </linearGradient>
                                      <linearGradient id="colorFund" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8}/>
                                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.2}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickCount={5} dy={10}/>
                                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/10000).toFixed(0)}萬`} width={55}/>
                                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px', padding: 0 }} formatter={(val: number, name: string) => [`NT$ ${val.toLocaleString()}`, name === 'cash' ? '現金' : name === 'stock' ? '股票' : name === 'fund' ? '基金/其他' : name]}/>
                                  <Area type="monotone" dataKey="cash" name="現金" stroke="#38bdf8" fill="url(#colorCash)" />
                                  <Area type="monotone" dataKey="stock" name="股票" stroke="#818cf8" fill="url(#colorStock)" />
                                  <Area type="monotone" dataKey="fund" name="基金/其他" stroke="#a78bfa" fill="url(#colorFund)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : activeMainChart === 'TREND' ? (
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
                                      <linearGradient id="colorDashNet" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickMargin={10} minTickGap={20} />
                                  <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickFormatter={(val) => `${(val / 10000).toFixed(0)}萬`} width={60} />
                                  <Tooltip 
                                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                      itemStyle={{ color: '#e2e8f0' }}
                                      formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                                  />
                                  <Area yAxisId="left" type="monotone" dataKey="totalAssets" name="總資產" stroke="#10b981" fill="url(#colorDashAssets)" strokeWidth={2} />
                                  <Area yAxisId="left" type="monotone" dataKey="totalDebt" name="總負債" stroke="#ef4444" fill="url(#colorDashDebt)" strokeWidth={2} />
                                  <Area yAxisId="left" type="monotone" dataKey="netWorth" name="淨資產" stroke="#3b82f6" fill="url(#colorDashNet)" strokeWidth={2} />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : activeMainChart === 'MONTHLY_INCOME' ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={historicalMonthlyIncomeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickMargin={10} />
                                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `${(val / 10000).toFixed(0)}萬`} width={60} />
                                  <Tooltip 
                                      cursor={{ fill: '#334155', opacity: 0.2 }}
                                      content={({ active, payload, label }) => {
                                          if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              const isPositive = data.netIncome >= 0;
                                              return (
                                                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-sm min-w-[150px]">
                                                      <p className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">{label}</p>
                                                      <div className="flex justify-between gap-4 mb-1">
                                                          <span className="text-slate-400">一般收入</span>
                                                          <span className="text-emerald-400 font-mono">+${data.income.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 mb-1">
                                                          <span className="text-slate-400">股票收益</span>
                                                          <span className="text-sky-400 font-mono">+${data.stockIncome.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 mb-1">
                                                          <span className="text-slate-400">一般支出</span>
                                                          <span className="text-rose-400 font-mono">-${data.expense.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 mb-2">
                                                          <span className="text-slate-400">各項貸款預估</span>
                                                          <span className="text-rose-400 font-mono">-${data.debtPayments.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 pt-2 border-t border-slate-700 font-bold">
                                                          <span className="text-slate-200">當月淨收益</span>
                                                          <span className={`font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                              {isPositive ? '+' : ''}${data.netIncome.toLocaleString()}
                                                          </span>
                                                      </div>
                                                  </div>
                                              );
                                          }
                                          return null;
                                      }}
                                  />
                                  <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                                  <Bar dataKey="netIncome" radius={[4, 4, 4, 4]} maxBarSize={60}>
                                      {historicalMonthlyIncomeData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.netIncome >= 0 ? '#10b981' : '#ef4444'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      ) : activeMainChart === 'ANNUAL_INCOME' ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={historicalAnnualIncomeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} tickMargin={10} />
                                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `${(val / 10000).toFixed(0)}萬`} width={60} />
                                  <Tooltip 
                                      cursor={{ fill: '#334155', opacity: 0.2 }}
                                      content={({ active, payload, label }) => {
                                          if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              const isPositive = data.netIncome >= 0;
                                              return (
                                                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-sm min-w-[150px]">
                                                      <p className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">{label}</p>
                                                      <div className="flex justify-between gap-4 mb-1">
                                                          <span className="text-slate-400">一般收入</span>
                                                          <span className="text-emerald-400 font-mono">+${data.income.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 mb-1">
                                                          <span className="text-slate-400">股票收益</span>
                                                          <span className="text-sky-400 font-mono">+${data.stockIncome.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 mb-1">
                                                          <span className="text-slate-400">一般支出</span>
                                                          <span className="text-rose-400 font-mono">-${data.expense.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 mb-2">
                                                          <span className="text-slate-400">各項貸款預估</span>
                                                          <span className="text-rose-400 font-mono">-${data.debtPayments.toLocaleString()}</span>
                                                      </div>
                                                      <div className="flex justify-between gap-4 pt-2 border-t border-slate-700 font-bold">
                                                          <span className="text-slate-200">年度淨收益</span>
                                                          <span className={`font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                              {isPositive ? '+' : ''}${data.netIncome.toLocaleString()}
                                                          </span>
                                                      </div>
                                                  </div>
                                              );
                                          }
                                          return null;
                                      }}
                                  />
                                  <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                                  <Bar dataKey="netIncome" radius={[4, 4, 4, 4]} maxBarSize={60}>
                                      {historicalAnnualIncomeData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.netIncome >= 0 ? '#10b981' : '#ef4444'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      ) : (
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => Math.abs(val) >= 10000 ? `${(val/10000).toFixed(0)}萬` : Math.abs(val) >= 1000 ? `${(val/1000).toFixed(0)}千` : `$${val}`} />
                                  <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} labelFormatter={(label) => `${currentMonth + 1}月${label}日`} formatter={(value: number, name: string) => { const isExp = name.startsWith('exp_'); const displayName = isExp ? name.replace('exp_', '') : name === 'income' ? '一般收入' : name === 'stockIncome' ? '股票收益' : name; return [`$${Math.abs(value).toLocaleString()}`, displayName]; }}/>
                                  <ReferenceLine y={0} stroke="#334155" />
                                  <Bar dataKey="income" name="income" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                  <Bar dataKey="stockIncome" name="stockIncome" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                  {expenseCategories.map((cat, idx) => {
                                      const colors = ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#8b5cf6', '#d946ef', '#14b8a6', '#06b6d4'];
                                      return <Bar key={cat} dataKey={`exp_${cat}`} name={`exp_${cat}`} stackId="b" fill={colors[idx % colors.length]} radius={idx === 0 ? [0, 0, 4, 4] : [0, 0, 0, 0]} maxBarSize={40} />;
                                  })}
                              </BarChart>
                          </ResponsiveContainer>
                      )}
                  </div>
              </Card>
          </div>

          {/* Bottom layout */}
          <div className="w-full">
                 {/* Debt Overview Card */}
                 <Card className="border-slate-700/50 bg-slate-900/40 p-6 flex flex-col">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
                          <div className="flex items-center gap-2">
                              <Target size={20} className="text-amber-400" />
                              <h3 className="font-bold text-white text-lg">每月還款總覽</h3>
                          </div>
                          {allDebtPayments.length > 0 && (
                              <div className="flex items-center gap-3 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30">
                                  <span className="text-sm font-bold text-red-200">總計應繳</span>
                                  <span className="text-2xl font-black text-red-400 font-mono">
                                      ${allDebtPayments.reduce((s, d) => s + d.estimatedPayment, 0).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-red-400/70">/ 月</span>
                              </div>
                          )}
                      </div>

                      {allDebtPayments.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {allDebtPayments.map(debt => (
                                  <div key={debt.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                              <CreditCard size={14} className="text-red-400" />
                                          </div>
                                          <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                  <p className="font-bold text-slate-200 text-sm">{debt.name}</p>
                                                  {debt.graceMonthsLeft !== null && (
                                                      <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                          <AlertTriangle size={10} className="text-amber-400" />
                                                          <span className="text-[10px] font-bold text-amber-400">寬限 {debt.graceMonthsLeft} 月</span>
                                                      </div>
                                                  )}
                                              </div>
                                              <p className="text-xs text-slate-400">總額: ${debt.amount.toLocaleString()}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="flex flex-col items-end text-right">
                                          <div className="flex items-baseline gap-1">
                                              <span className="font-bold text-red-400 font-mono text-base">
                                                  {debt.estimatedPayment > 0 ? `$${debt.estimatedPayment.toLocaleString()}` : '未設定'}
                                              </span>
                                              {debt.estimatedPayment > 0 && <span className="text-[10px] text-slate-400">/月</span>}
                                          </div>
                                          {debt.graceMonthsLeft !== null && debt.postGracePayment > 0 && (
                                              <span className="text-[11px] text-amber-400/90">寬限後 ${debt.postGracePayment.toLocaleString()}/月</span>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center text-center opacity-50 py-12 bg-slate-800/20 rounded-xl border border-slate-700/30 border-dashed">
                              <Flag size={40} className="text-slate-600 mb-3" />
                              <p className="text-slate-400 text-sm">目前沒有任何貸款項目</p>
                              <Button variant="ghost" onClick={() => { window.location.hash = 'debt'; onChangeView('ASSETS'); }} className="text-xs mt-2">前往設定</Button>
                          </div>
                      )}

                      {/* 多還本金正向回饋 */}
                      {financialPlanning.overpayments.length > 0 && (
                          <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 space-y-1">
                              {financialPlanning.overpayments.map(o => (
                                  <p key={o.debtName} className="text-xs text-emerald-300 leading-relaxed">
                                      ✓ 你為「{o.debtName}」每月實際還款比最低應繳多 <span className="font-mono font-bold">{formatMoney(o.diff)}</span>，多出的部分正在加速清償本金。
                                  </p>
                              ))}
                          </div>
                      )}
                 </Card>

                 {/* 財務風險與規劃 */}
                 {financialPlanning.debts.length > 0 && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                         {/* 寬限期衝擊 + 現金跑道 */}
                         <Card className="border-slate-700/50 bg-slate-900/40 p-6 space-y-4">
                             <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                 <Hourglass size={18} className="text-amber-400"/>
                                 <h3 className="font-bold text-white text-lg">寬限期衝擊與現金跑道</h3>
                             </div>
                             {financialPlanning.graceImpacts.length > 0 ? (
                                 financialPlanning.graceImpacts.map(g => (
                                     <div key={g.name} className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-slate-300 leading-relaxed">
                                         「{g.name}」寬限期至 <span className="font-mono text-amber-300">{g.graceEnd.getFullYear()}-{String(g.graceEnd.getMonth() + 1).padStart(2, '0')}</span>（剩 {g.monthsLeft} 個月），
                                         屆時月付 <span className="font-mono">{formatMoney(g.current)}</span> → <span className="font-mono font-bold text-red-400">{formatMoney(g.after)}</span>
                                         （每月增加 <span className="font-mono font-bold text-red-400">{formatMoney(g.jump)}</span>）。
                                     </div>
                                 ))
                             ) : (
                                 <p className="text-sm text-slate-400">目前沒有仍在寬限期的貸款。</p>
                             )}
                             <div className="grid grid-cols-2 gap-3 text-sm">
                                 <div className="bg-slate-800/50 rounded-lg p-3">
                                     <p className="text-xs text-slate-400 mb-1">每月固定結餘（現在）</p>
                                     <p className={`font-mono font-bold text-lg ${financialPlanning.fixedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(financialPlanning.fixedBalance)}</p>
                                 </div>
                                 {financialPlanning.totalJump > 0 && (
                                     <div className="bg-slate-800/50 rounded-lg p-3">
                                         <p className="text-xs text-slate-400 mb-1">寬限期結束後（預估）</p>
                                         <p className={`font-mono font-bold text-lg ${financialPlanning.postGraceBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(financialPlanning.postGraceBalance)}</p>
                                     </div>
                                 )}
                             </div>
                             <div className="text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                                 流動現金 <span className="font-mono text-emerald-400">{formatMoney(financialPlanning.liquidCash)}</span>。
                                 {financialPlanning.runwayNow !== null ? (
                                     <>以目前固定結餘估算，現金跑道約 <span className={`font-mono font-bold ${financialPlanning.runwayNow < 12 ? 'text-red-400' : financialPlanning.runwayNow < 36 ? 'text-amber-400' : 'text-slate-200'}`}>{(financialPlanning.runwayNow / 12).toFixed(1)} 年</span>
                                     {financialPlanning.runwayAfter !== null && financialPlanning.totalJump > 0 && (
                                         <>；寬限期結束後將縮短為約 <span className={`font-mono font-bold ${financialPlanning.runwayAfter < 12 ? 'text-red-400' : financialPlanning.runwayAfter < 36 ? 'text-amber-400' : 'text-slate-200'}`}>{(financialPlanning.runwayAfter / 12).toFixed(1)} 年</span></>
                                     )}。</>
                                 ) : (
                                     <>目前固定收支為正，現金不會因固定開銷而耗損。</>
                                 )}
                             </div>
                         </Card>

                         {/* 利息成本儀表 */}
                         <Card className="border-slate-700/50 bg-slate-900/40 p-6 space-y-4">
                             <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                 <Landmark size={18} className="text-rose-400"/>
                                 <h3 className="font-bold text-white text-lg">利息成本</h3>
                             </div>
                             {financialPlanning.monthlyInterest > 0 ? (
                                 <>
                                     <div className="grid grid-cols-2 gap-3 text-sm">
                                         <div className="bg-slate-800/50 rounded-lg p-3">
                                             <p className="text-xs text-slate-400 mb-1">每月利息（近似）</p>
                                             <p className="font-mono font-bold text-lg text-rose-400">{formatMoney(financialPlanning.monthlyInterest)}</p>
                                         </div>
                                         <div className="bg-slate-800/50 rounded-lg p-3">
                                             <p className="text-xs text-slate-400 mb-1">一年約</p>
                                             <p className="font-mono font-bold text-lg text-rose-400">{formatMoney(financialPlanning.monthlyInterest * 12)}</p>
                                         </div>
                                     </div>
                                     {financialPlanning.fixedIncome > 0 && (
                                         <p className="text-sm text-slate-300 leading-relaxed">
                                             利息佔每月固定收入 <span className={`font-mono font-bold ${financialPlanning.monthlyInterest / financialPlanning.fixedIncome > 0.3 ? 'text-red-400' : 'text-amber-400'}`}>{((financialPlanning.monthlyInterest / financialPlanning.fixedIncome) * 100).toFixed(0)}%</span>
                                             ——這是「什麼都不做也會流出去」的成本，評估賣股還債或提前還款時以此為基準。
                                         </p>
                                     )}
                                     <div className="space-y-1.5 border-t border-slate-800 pt-3">
                                         {financialPlanning.interestItems.map(i => (
                                             <div key={i.name} className="flex items-center justify-between text-xs">
                                                 <span className="text-slate-400">{i.name}</span>
                                                 <span className="font-mono text-rose-300">{formatMoney(i.monthly)}/月</span>
                                             </div>
                                         ))}
                                     </div>
                                 </>
                             ) : (
                                 <p className="text-sm text-slate-400">貸款尚未設定利率，無法估算利息成本。</p>
                             )}
                         </Card>

                         {/* 扣款帳戶餘額監控 */}
                         <Card className="border-slate-700/50 bg-slate-900/40 p-6 space-y-4">
                             <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                 <Wallet size={18} className="text-sky-400"/>
                                 <h3 className="font-bold text-white text-lg">扣款帳戶餘額</h3>
                             </div>
                             {financialPlanning.accountChecks.length > 0 ? (
                                 <div className="space-y-3">
                                     {financialPlanning.accountChecks.map(a => (
                                         <div key={a.accountName} className={`rounded-lg px-4 py-3 border ${a.monthsCovered < 6 ? 'bg-red-500/5 border-red-500/30' : a.monthsCovered < 12 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
                                             <div className="flex items-center justify-between text-sm">
                                                 <span className="font-bold text-slate-200">{a.accountName}</span>
                                                 <span className="font-mono text-slate-300">{formatMoney(a.balance)}</span>
                                             </div>
                                             <p className="text-xs text-slate-400 mt-1">
                                                 每月扣 <span className="font-mono">{formatMoney(a.totalPay)}</span>（{a.debtNames.join('、')}）
                                                 → 約可再扣 <span className={`font-mono font-bold ${a.monthsCovered < 6 ? 'text-red-400' : a.monthsCovered < 12 ? 'text-amber-400' : 'text-emerald-400'}`}>{a.monthsCovered} 個月</span>
                                                 {a.monthsCovered < 6 && <span className="text-red-300">，餘額偏低，請留意補足以免扣款失敗</span>}
                                             </p>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <p className="text-sm text-slate-400">
                                     尚未為貸款指定扣款帳戶。到「資產管理」編輯負債（例如信貸、房貸），選擇「每月扣款帳戶」後，這裡會監控帳戶餘額還能扣幾個月。
                                 </p>
                             )}
                         </Card>

                         {/* 提前還款模擬器 */}
                         <Card className="border-slate-700/50 bg-slate-900/40 p-6 space-y-4">
                             <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                 <Calculator size={18} className="text-emerald-400"/>
                                 <h3 className="font-bold text-white text-lg">提前還款模擬</h3>
                             </div>
                             <div className="flex gap-3 flex-wrap">
                                 <Select value={simDebtId} onChange={e => setSimDebtId(e.target.value)} className="flex-1 min-w-[140px] bg-slate-900">
                                     <option value="">選擇貸款...</option>
                                     {financialPlanning.debts.filter(d => d.interestRate && d.termYears).map(d => (
                                         <option key={d.id} value={d.id}>{d.name}（{formatMoney(d.amount)}）</option>
                                     ))}
                                 </Select>
                                 <Input
                                     type="number"
                                     placeholder="提前還款金額"
                                     aria-label="提前還款金額"
                                     value={simAmount}
                                     onChange={e => setSimAmount(e.target.value)}
                                     className="flex-1 min-w-[140px] font-mono bg-slate-900"
                                 />
                             </div>
                             {prepaySimulation ? (
                                 prepaySimulation.payoff ? (
                                     <p className="text-sm text-emerald-300">這筆金額已足以清償「{prepaySimulation.debtName}」全部剩餘本金。</p>
                                 ) : (
                                     <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm text-slate-300 space-y-1.5 leading-relaxed">
                                         <p>
                                             「{prepaySimulation.debtName}」當月月付 <span className="font-mono">{formatMoney(prepaySimulation.currentMonthly)}</span> → <span className="font-mono font-bold text-emerald-400">{formatMoney(prepaySimulation.newMonthly)}</span>
                                             （每月減少 <span className="font-mono font-bold text-emerald-400">{formatMoney(prepaySimulation.monthlySaved)}</span>）
                                         </p>
                                         {prepaySimulation.inGrace && (
                                             <p className="text-xs text-slate-400">
                                                 寬限期後月付 {formatMoney(prepaySimulation.postGraceOld)} → <span className="text-emerald-400">{formatMoney(prepaySimulation.postGraceNew)}</span>
                                             </p>
                                         )}
                                         <p>
                                             至清償為止總利息約可省下 <span className="font-mono font-bold text-emerald-400">{formatMoney(prepaySimulation.interestSaved)}</span>
                                         </p>
                                         <p className="text-[11px] text-slate-400">* 以「月付金重新計算、年期不變」估算；若選擇維持月付金縮短年期，省下的利息會更多。</p>
                                     </div>
                                 )
                             ) : (
                                 <p className="text-xs text-slate-400">選擇貸款並輸入金額，試算月付變化與可省下的總利息。例如：拿一部分股票獲利提前還信貸。</p>
                             )}
                         </Card>
                     </div>
                 )}
          </div>
      </div>
    </div>
  );
};
