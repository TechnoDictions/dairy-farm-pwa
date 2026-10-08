'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, VaccinationTask, Livestock } from '../../../../db/db';
import { 
  Clock, CheckCircle2, Syringe, Calendar, X, AlertCircle, 
  ArrowUpRight, TrendingUp, TrendingDown, DollarSign, Milk, 
  Wheat, Users, Zap, Fuel, ReceiptText, PieChart, ShieldCheck, 
  ChevronRight, Sparkles, Wallet 
} from 'lucide-react';
import Link from 'next/link';
import WelcomeTour from '@/components/WelcomeTour';

export default function AdminDashboard() {
  const [period, setPeriod] = useState<'Today' | 'This Week' | 'This Month' | 'This Year'>('This Month');
  const [selectedTask, setSelectedTask] = useState<VaccinationTask | null>(null);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [showPnLDetails, setShowPnLDetails] = useState(false);

  // Fetch real data
  const milkingLogs = useLiveQuery(() => db.MilkingLogs.toArray(), []);
  const salesLogs = useLiveQuery(() => db.SalesLogs.toArray(), []);
  const customerPayments = useLiveQuery(() => db.CustomerPayments.toArray(), []);
  const livestock = useLiveQuery(() => db.Livestock.toArray(), []);
  const tasks = useLiveQuery(() => db.VaccinationTasks.where('status').equals('pending').toArray(), []);
  const customers = useLiveQuery(() => db.Customers.toArray(), []);
  const feedLogs = useLiveQuery(() => db.FeedLogs.toArray(), []);
  const expenseLogs = useLiveQuery(() => db.ExpenseLogs.toArray(), []);
  const salaryPayments = useLiveQuery(() => db.SalaryPayments.toArray(), []);

  const [isReschedulingTask, setIsReschedulingTask] = useState(false);
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [rescheduledType, setRescheduledType] = useState('');

  const handleCompleteTask = async () => {
    if (selectedTask && selectedTask.id) {
      await db.VaccinationTasks.update(selectedTask.id, { status: 'completed' });
      setSelectedTask(null);
      setIsReschedulingTask(false);
    }
  };

  const handleRescheduleTask = async () => {
    if (selectedTask && selectedTask.id && rescheduledDate) {
      await db.VaccinationTasks.update(selectedTask.id, {
        date: rescheduledDate,
        type: rescheduledType || selectedTask.type
      });
      setSelectedTask({
        ...selectedTask,
        date: rescheduledDate,
        type: rescheduledType || selectedTask.type
      });
      setIsReschedulingTask(false);
    }
  };

  const upcomingBirths = useMemo(() => {
    if (!livestock) return [];
    return livestock
      .filter(c => c.status === 'Pregnant' && c.expectedCalvingDate)
      .sort((a, b) => new Date(a.expectedCalvingDate!).getTime() - new Date(b.expectedCalvingDate!).getTime());
  }, [livestock]);

  // Aggregation Logic for Yield, Cash Revenue, Billed Dispatches, Expenses, & P&L
  const { 
    yieldData, 
    salesData, 
    totalYield, 
    totalRevenue, 
    totalBilledSales,
    totalLitersDispatched,
    yieldGrowth, 
    revenueGrowth,
    currentSalesList,
    feedExpense,
    payrollExpense,
    operatingExpense,
    totalExpenses,
    netProfitOrLoss,
    profitMarginPercent,
    isProfitable,
    pnlBreakdownData
  } = useMemo(() => {
    if (!milkingLogs || !salesLogs) return { 
      yieldData: [], 
      salesData: [], 
      totalYield: 0, 
      totalRevenue: 0, 
      totalBilledSales: 0,
      totalLitersDispatched: 0,
      yieldGrowth: 0, 
      revenueGrowth: 0,
      currentSalesList: [],
      feedExpense: 0,
      payrollExpense: 0,
      operatingExpense: 0,
      totalExpenses: 0,
      netProfitOrLoss: 0,
      profitMarginPercent: 0,
      isProfitable: true,
      pnlBreakdownData: []
    };

    const now = new Date();
    let currentStart = new Date();
    let previousStart = new Date();
    let points = 30;
    let formatLabel = (d: Date) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;

    if (period === 'Today') {
      currentStart.setHours(0,0,0,0);
      previousStart = new Date(currentStart.getTime() - 24*60*60*1000);
      points = 24;
      formatLabel = (d: Date) => `${d.getHours()}:00`;
    } else if (period === 'This Week') {
      currentStart.setDate(now.getDate() - 6);
      currentStart.setHours(0,0,0,0);
      previousStart = new Date(currentStart.getTime() - 7*24*60*60*1000);
      points = 7;
      formatLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (period === 'This Month') {
      currentStart.setDate(now.getDate() - 29);
      currentStart.setHours(0,0,0,0);
      previousStart = new Date(currentStart.getTime() - 30*24*60*60*1000);
      points = 30;
      formatLabel = (d: Date) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
    } else {
      currentStart.setMonth(now.getMonth() - 11);
      currentStart.setDate(1);
      currentStart.setHours(0,0,0,0);
      previousStart = new Date(currentStart.getTime());
      previousStart.setFullYear(previousStart.getFullYear() - 1);
      points = 12;
      formatLabel = (d: Date) => d.toLocaleString('default', { month: 'short' });
    }

    const currentEnd = new Date();
    const previousEnd = new Date(currentStart.getTime() - 1);

    // Filter logs
    const currentYield = milkingLogs.filter(l => new Date(l.timestamp) >= currentStart && new Date(l.timestamp) <= currentEnd);
    const prevYield = milkingLogs.filter(l => new Date(l.timestamp) >= previousStart && new Date(l.timestamp) <= previousEnd);
    
    const currentSales = salesLogs.filter(l => new Date(l.timestamp) >= currentStart && new Date(l.timestamp) <= currentEnd);
    const prevSales = salesLogs.filter(l => new Date(l.timestamp) >= previousStart && new Date(l.timestamp) <= previousEnd);

    // Realized Customer Cash Payments
    const currentPayments = (customerPayments || []).filter(p => {
      const d = new Date(p.paymentDate);
      return d >= currentStart && d <= currentEnd;
    });

    const prevPayments = (customerPayments || []).filter(p => {
      const d = new Date(p.paymentDate);
      return d >= previousStart && d <= previousEnd;
    });

    // Expense Logs filtering
    const curFeeds = (feedLogs || []).filter(f => {
      const d = new Date(f.date);
      return d >= currentStart && d <= currentEnd;
    });

    const curSalaries = (salaryPayments || []).filter(s => {
      const d = new Date(s.paymentDate);
      return d >= currentStart && d <= currentEnd;
    });

    const curExpenses = (expenseLogs || []).filter(e => {
      const d = new Date(e.date);
      return d >= currentStart && d <= currentEnd;
    });

    // Totals
    const tYield = currentYield.reduce((sum, log) => sum + (log.yieldLiters || 0), 0);
    const pYield = prevYield.reduce((sum, log) => sum + (log.yieldLiters || 0), 0);
    
    // Realized Inflow / Revenue = Customer Payments Received!
    const tRev = currentPayments.reduce((sum, p) => sum + (p.amountPKR || 0), 0);
    const pRev = prevPayments.reduce((sum, p) => sum + (p.amountPKR || 0), 0);

    // Credit Sales Billed & Liters Dispatched:
    const tBilled = currentSales.reduce((sum, log) => sum + (log.totalPKR || 0), 0);
    const tDispatched = currentSales.reduce((sum, log) => sum + (log.volumeLiters ?? (log as any).litersSold ?? 0), 0);

    const yGrowth = pYield === 0 ? (tYield > 0 ? 100 : 0) : ((tYield - pYield) / pYield) * 100;
    const rGrowth = pRev === 0 ? (tRev > 0 ? 100 : 0) : ((tRev - pRev) / pRev) * 100;

    // Expenses breakdown
    const tFeed = curFeeds.reduce((sum, f) => sum + (f.totalAmountPKR || 0), 0);
    const tPayroll = curSalaries.reduce((sum, s) => sum + (s.amountPKR || 0), 0);
    const tOperating = curExpenses.reduce((sum, e) => sum + (e.amountPKR || 0), 0);
    const tExpenses = tFeed + tPayroll + tOperating;

    // Net Profit based on actual cash collected minus operational expenses
    const netProfit = tRev - tExpenses;
    const profitMargin = tRev > 0 ? (netProfit / tRev) * 100 : 0;
    const profitable = netProfit >= 0;

    // P&L Breakdown chart data
    const pnlBreakdown = [
      { name: 'Collected Revenue', amount: tRev, fill: '#0B6AB5' },
      { name: 'Feed & Silage', amount: tFeed, fill: '#D97706' },
      { name: 'Staff Salaries', amount: tPayroll, fill: '#2563EB' },
      { name: 'Farm Ops / WAPDA', amount: tOperating, fill: '#E11D48' },
    ];

    // Time Series Generation
    const yData = [];
    const sData = [];
    
    const step = period === 'Today' ? 60*60*1000 : period === 'This Year' ? 30*24*60*60*1000 : 24*60*60*1000;

    for (let i = 0; i < points; i++) {
      let tTarget = new Date(currentStart.getTime() + i * step);
      let pTarget = new Date(previousStart.getTime() + i * step);
      
      let cYieldSum = 0, pYieldSum = 0, cSalesSum = 0, pSalesSum = 0;

      currentYield.forEach(l => {
        const d = new Date(l.timestamp);
        if (period === 'This Year' && d.getMonth() === tTarget.getMonth()) cYieldSum += l.yieldLiters;
        else if (period === 'Today' && d.getHours() === tTarget.getHours()) cYieldSum += l.yieldLiters;
        else if (period !== 'This Year' && period !== 'Today' && d.getDate() === tTarget.getDate()) cYieldSum += l.yieldLiters;
      });

      prevYield.forEach(l => {
        const d = new Date(l.timestamp);
        if (period === 'This Year' && d.getMonth() === pTarget.getMonth()) pYieldSum += l.yieldLiters;
        else if (period === 'Today' && d.getHours() === pTarget.getHours()) pYieldSum += l.yieldLiters;
        else if (period !== 'This Year' && period !== 'Today' && d.getDate() === pTarget.getDate()) pYieldSum += l.yieldLiters;
      });

      // Realized Cash Collected
      currentPayments.forEach(p => {
        const d = new Date(p.paymentDate);
        if (period === 'This Year' && d.getMonth() === tTarget.getMonth()) cSalesSum += p.amountPKR;
        else if (period === 'Today' && d.getDate() === tTarget.getDate()) cSalesSum += p.amountPKR;
        else if (period !== 'This Year' && period !== 'Today' && d.getDate() === tTarget.getDate()) cSalesSum += p.amountPKR;
      });

      prevPayments.forEach(p => {
        const d = new Date(p.paymentDate);
        if (period === 'This Year' && d.getMonth() === pTarget.getMonth()) pSalesSum += p.amountPKR;
        else if (period === 'Today' && d.getDate() === pTarget.getDate()) pSalesSum += p.amountPKR;
        else if (period !== 'This Year' && period !== 'Today' && d.getDate() === pTarget.getDate()) pSalesSum += p.amountPKR;
      });

      const label = formatLabel(tTarget);
      
      yData.push({ name: label, current: cYieldSum, previous: pYieldSum });
      sData.push({ name: label, currentPKR: cSalesSum, prevPKR: pSalesSum });
    }

    const sortedCurrentSales = [...currentSales].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { 
      yieldData: yData, 
      salesData: sData, 
      totalYield: tYield, 
      totalRevenue: tRev, 
      totalBilledSales: tBilled,
      totalLitersDispatched: tDispatched,
      yieldGrowth: yGrowth, 
      revenueGrowth: rGrowth,
      currentSalesList: sortedCurrentSales,
      feedExpense: tFeed,
      payrollExpense: tPayroll,
      operatingExpense: tOperating,
      totalExpenses: tExpenses,
      netProfitOrLoss: netProfit,
      profitMarginPercent: profitMargin,
      isProfitable: profitable,
      pnlBreakdownData: pnlBreakdown
    };
  }, [period, milkingLogs, salesLogs, customerPayments, feedLogs, expenseLogs, salaryPayments]);

  const activeCows = useMemo(() => {
    if (!livestock || !milkingLogs) return 0;
    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const recentMilkingTags = new Set(
      milkingLogs
        .filter(l => (now - new Date(l.timestamp).getTime()) <= fiveDaysMs && l.yieldLiters > 0)
        .map(l => l.tag)
    );

    return livestock.filter(c => {
      if (c.status === 'Sold') return false;
      if (c.gender === 'Male') return false;
      const st = (c.status || '').toLowerCase();
      if (st === 'pregnant' && c.expectedCalvingDate) {
        const daysRemaining = (new Date(c.expectedCalvingDate).getTime() - now) / (1000 * 60 * 60 * 24);
        if (daysRemaining <= 30) return false;
      }
      if (st === 'lactating' || st === 'pregnant') {
        return recentMilkingTags.has(c.tag);
      }
      return false;
    }).length;
  }, [livestock, milkingLogs]);

  const totalCows = (livestock || []).filter(c => c.status !== 'Sold').length;
  const pendingTasks = tasks?.length || 0;

  const customerMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (customers) {
      customers.forEach(c => {
        if (c.id) map[c.id] = c.name;
      });
    }
    return map;
  }, [customers]);

  return (
    <div className="space-y-8 relative">
      {/* Welcome Tour — shown once for new paid subscribers */}
      <WelcomeTour />

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Command Center & P&L</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Real-time farm profit/loss, collected cash revenue, and expenses</p>
        </div>
        
        <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
          {['Today', 'This Week', 'This Month', 'This Year'].map(p => (
            <button 
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                period === p 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Hero: Profit & Loss (P&L) Summary Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border luxury-shadow transition-all relative overflow-hidden ${
        isProfitable 
          ? 'bg-gradient-to-br from-[#0B6AB5]/10 via-[#249D4A]/5 to-transparent border-emerald-300/60' 
          : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-rose-300/60'
      }`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isProfitable ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {isProfitable ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isProfitable ? 'FARM NET PROFIT' : 'FARM NET DEFICIT (LOSS)'}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">({period})</span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className={`text-4xl sm:text-5xl font-black ${isProfitable ? 'text-emerald-800' : 'text-rose-700'}`}>
                {isProfitable ? '+' : ''}₨ {netProfitOrLoss.toLocaleString()}
              </div>
              <div className={`text-sm font-bold px-2.5 py-1 rounded-lg ${isProfitable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {profitMarginPercent.toFixed(1)}% Margin
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] font-medium">
              Collected Cash (₨{totalRevenue.toLocaleString()}) minus Total Farm Expenses (₨{totalExpenses.toLocaleString()}) • Credit Dispatches: ₨{totalBilledSales.toLocaleString()}
            </p>
          </div>

          {/* Quick Expense Driver Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-[var(--bg-card)]/90 backdrop-blur-sm p-3.5 rounded-2xl border border-[var(--border)] shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                <Wallet className="w-3.5 h-3.5" /> Paid Revenue
              </div>
              <div className="font-black text-sm text-[var(--text-main)]">
                ₨ {totalRevenue.toLocaleString()}
              </div>
            </div>

            <div className="bg-[var(--bg-card)]/90 backdrop-blur-sm p-3.5 rounded-2xl border border-[var(--border)] shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
                <Wheat className="w-3.5 h-3.5" /> Feed & Silage
              </div>
              <div className="font-black text-sm text-amber-900">
                ₨ {feedExpense.toLocaleString()}
              </div>
            </div>

            <div className="bg-[var(--bg-card)]/90 backdrop-blur-sm p-3.5 rounded-2xl border border-[var(--border)] shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-1">
                <Users className="w-3.5 h-3.5" /> Staff Payroll
              </div>
              <div className="font-black text-sm text-blue-900">
                ₨ {payrollExpense.toLocaleString()}
              </div>
            </div>

            <div className="bg-[var(--bg-card)]/90 backdrop-blur-sm p-3.5 rounded-2xl border border-[var(--border)] shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                <Zap className="w-3.5 h-3.5" /> WAPDA & Ops
              </div>
              <div className="font-black text-sm text-rose-900">
                ₨ {operatingExpense.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--border)]/60 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Revenue reflects cash collected from customers. Credit dispatches remain stored in Customer Khata until settled.</span>
          </div>
          <button 
            onClick={() => setShowPnLDetails(true)}
            className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            View Complete Financial Breakdown & Margin Ledger →
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Yield Card */}
        <Link 
          href="/portal/admin/milking"
          className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] levitate hover:border-[var(--primary)] transition-all cursor-pointer group relative block"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Total Yield</h3>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">{totalYield.toLocaleString()} L</div>
          <div className="flex justify-between items-center mt-2">
            <p className={`text-xs font-bold ${yieldGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {yieldGrowth >= 0 ? '↑' : '↓'} {Math.abs(yieldGrowth).toFixed(1)}% vs prev
            </p>
            <span className="text-[10px] font-bold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
              Leaderboard →
            </span>
          </div>
        </Link>

        {/* Total Paid Revenue Card */}
        <div 
          onClick={() => setShowSalesDetails(true)}
          className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] levitate hover:border-[var(--primary)] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-light)] opacity-20 rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Collected Revenue</h3>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-3xl font-black text-emerald-800">
            ₨ {totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(1) + 'K' : totalRevenue.toLocaleString()}
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Dispatched: ₨{totalBilledSales.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
              View details →
            </span>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div 
          onClick={() => setShowPnLDetails(true)}
          className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] levitate hover:border-rose-400 transition-all cursor-pointer group relative block"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Total Expenses</h3>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-3xl font-black text-rose-700">
            ₨ {totalExpenses >= 1000 ? (totalExpenses/1000).toFixed(1) + 'K' : totalExpenses.toLocaleString()}
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Feed + Staff + WAPDA
            </p>
            <span className="text-[10px] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Breakdown →
            </span>
          </div>
        </div>

        {/* Lactating vs Total Card */}
        <Link 
          href="/portal/admin/cows"
          className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] levitate hover:border-[var(--primary)] transition-all cursor-pointer group relative block"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Lactating vs Total</h3>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--primary)]">{activeCows}</span>
            <span className="text-[var(--text-muted)] font-bold">/ {totalCows}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {totalCows ? Math.round((activeCows/totalCows)*100) : 0}% active herd
            </p>
            <span className="text-[10px] font-bold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
              All Categories →
            </span>
          </div>
        </Link>
      </div>

      {/* Multi-Line Canvas Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Milk Production */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Milk Production (Liters)</h3>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Current {period} vs Previous</p>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[var(--primary)] rounded-full"></div> Current</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[var(--text-gold)] rounded-full"></div> Previous</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} horizontal={false} />
                <XAxis dataKey="name" axisLine={{ stroke: '#E8E2D2' }} tickLine={false} tick={{ fill: '#6C7A73', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={false} dx={-10} />
                <Tooltip 
                  cursor={{ stroke: 'var(--primary)', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  formatter={(value: any) => [`${value} Liters`, 'Yield']}
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(30, 58, 43, 0.1)', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  name="Current Period"
                  stroke="var(--primary)" 
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: 'var(--primary)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="previous" 
                  name="Previous Period"
                  stroke="var(--text-gold)" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: 'var(--text-gold)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Collected Revenue */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Collected Cash Revenue (PKR)</h3>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Paid by customers ({period})</p>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-700 rounded-full"></div> Current</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#B4975A] rounded-full"></div> Previous</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrentRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} horizontal={false} />
                <XAxis dataKey="name" axisLine={{ stroke: '#E8E2D2' }} tickLine={false} tick={{ fill: '#6C7A73', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₨${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} tick={{ fill: '#6C7A73', fontSize: 12, fontWeight: 600 }} dx={-10} />
                <Tooltip 
                  cursor={{ stroke: '#059669', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  formatter={(value: any) => [`₨ ${Number(value).toLocaleString()}`, 'Cash Collected']}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--text-main)' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(30, 58, 43, 0.1)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="prevPKR" 
                  name="Previous PKR" 
                  stroke="#B4975A" 
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  fill="transparent" 
                />
                <Area 
                  type="monotone" 
                  dataKey="currentPKR" 
                  name="Current PKR" 
                  stroke="#059669" 
                  fillOpacity={1} 
                  fill="url(#colorCurrentRev)" 
                  strokeWidth={3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists Row: Tasks and Births */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Tasks List */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow flex flex-col max-h-96">
          <div className="mb-6 flex justify-between items-end">
            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <Syringe className="w-5 h-5 text-red-500" /> Pending Vaccinations ({tasks?.length || 0})
            </h3>
          </div>
          <div className="overflow-y-auto pr-2 space-y-3 flex-1">
            {tasks && tasks.length > 0 ? (
              tasks.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className="flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 rounded-2xl border border-red-100 cursor-pointer transition-colors group"
                >
                  <div>
                    <h4 className="font-bold text-[var(--text-main)] group-hover:text-red-700 transition-colors">{task.type}</h4>
                    <p className="text-xs font-medium text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      Target: {task.herdWide ? 'Herd-wide' : task.tag}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-red-100">
                      <Clock className="w-3 h-3" />
                      {new Date(task.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">All scheduled medical tasks completed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Calvings */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow flex flex-col max-h-96">
          <div className="mb-6 flex justify-between items-end">
            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" /> Upcoming Calvings
            </h3>
          </div>
          <div className="overflow-y-auto pr-2 space-y-3 flex-1">
            {upcomingBirths.length > 0 ? (
              upcomingBirths.map(cow => {
                const daysRemaining = Math.ceil((new Date(cow.expectedCalvingDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isClose = daysRemaining <= 90;

                return (
                  <div key={cow.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isClose ? 'bg-orange-50 border-orange-200' : 'bg-[var(--bg-main)] border-[var(--border)]'}`}>
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                        {cow.name} <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-md text-[var(--text-muted)]">{cow.tag}</span>
                      </h4>
                      <p className="text-xs font-medium text-[var(--text-muted)] mt-1">
                        Sire: {cow.upcomingCalfBreed || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${isClose ? 'text-orange-700 bg-orange-100' : 'text-blue-700 bg-blue-50'}`}>
                        {new Date(cow.expectedCalvingDate!).toLocaleDateString()}
                      </span>
                      {isClose && (
                        <span className="text-[10px] font-bold text-orange-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> ~{daysRemaining} days (Colostrum stage)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">No pregnant cows tracked.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Completion & Reschedule Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative">
            <button 
              onClick={() => { setSelectedTask(null); setIsReschedulingTask(false); }} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <div className="mb-6 flex flex-col items-center text-center mt-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Syringe className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)] mb-1">{selectedTask.type}</h2>
              <p className="text-sm font-bold text-[var(--text-muted)]">Target: {selectedTask.herdWide ? 'Entire Herd' : selectedTask.tag}</p>
            </div>
            
            {/* Scheduled Date Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Scheduled Date</p>
                  <p className="font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" /> {new Date(selectedTask.date).toLocaleDateString()}
                  </p>
                </div>
                {!isReschedulingTask && (
                  <button
                    onClick={() => {
                      setRescheduledDate(selectedTask.date);
                      setRescheduledType(selectedTask.type);
                      setIsReschedulingTask(true);
                    }}
                    className="text-xs font-bold text-[var(--primary)] hover:underline px-2 py-1 bg-white border border-[var(--border)] rounded-lg shadow-sm"
                  >
                    Edit / Reschedule
                  </button>
                )}
              </div>
            </div>

            {/* Reschedule Form */}
            {isReschedulingTask && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Change Scheduled Date / Name</h4>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Task Name</label>
                  <input 
                    type="text" 
                    value={rescheduledType} 
                    onChange={e => setRescheduledType(e.target.value)} 
                    className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">New Date</label>
                  <input 
                    type="date" 
                    value={rescheduledDate} 
                    onChange={e => setRescheduledDate(e.target.value)} 
                    className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsReschedulingTask(false)} 
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleRescheduleTask} 
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg shadow-sm"
                  >
                    Save Reschedule
                  </button>
                </div>
              </div>
            )}

            {/* Completion logic based on date */}
            {(() => {
              const today = new Date();
              today.setHours(0,0,0,0);
              const taskDate = new Date(selectedTask.date);
              taskDate.setHours(0,0,0,0);
              const isFuture = taskDate.getTime() > today.getTime();

              if (isFuture) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        This vaccination is scheduled for a future date ({new Date(selectedTask.date).toLocaleDateString()}) and cannot be completed in advance. You can edit or reschedule the date above if needed.
                      </span>
                    </div>
                    <button 
                      disabled 
                      className="w-full py-3.5 rounded-xl font-bold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200 text-sm"
                    >
                      Cannot Complete Before Scheduled Date
                    </button>
                  </div>
                );
              }

              return (
                <button 
                  onClick={handleCompleteTask}
                  className="w-full py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" /> Mark as Completed
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Complete P&L Breakdown Modal */}
      {showPnLDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowPnLDetails(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <ReceiptText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--text-main)]">Profit & Loss Financial Statement</h2>
                <p className="text-sm font-medium text-[var(--text-muted)]">Detailed cash ledger for {period}</p>
              </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                <span className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-wider block">Collected Revenue</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">₨ {totalRevenue.toLocaleString()}</span>
                <span className="text-xs text-[var(--text-muted)]">Credit Billed: ₨ {totalBilledSales.toLocaleString()}</span>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                <span className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-wider block">Total Expenditure</span>
                <span className="text-2xl font-black text-rose-700 mt-1 block">₨ {totalExpenses.toLocaleString()}</span>
                <span className="text-xs text-[var(--text-muted)]">Feed + Salaries + Operations</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <span className="text-xs font-bold uppercase tracking-wider block opacity-80">Net Cash Margin</span>
                <span className={`text-2xl font-black mt-1 block ${isProfitable ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {isProfitable ? '+' : ''}₨ {netProfitOrLoss.toLocaleString()}
                </span>
                <span className="text-xs font-bold opacity-90">{profitMarginPercent.toFixed(1)}% {isProfitable ? 'Profit' : 'Deficit'}</span>
              </div>
            </div>

            {/* Detailed Cost Breakdown Table */}
            <div className="border border-[var(--border)] rounded-2xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-3 px-4 font-bold">Category</th>
                    <th className="py-3 px-4 font-bold text-right">% of Revenue</th>
                    <th className="py-3 px-4 font-bold text-right">Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr className="bg-emerald-50/30">
                    <td className="py-3 px-4 font-bold text-emerald-900 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-700" /> Cash Collected from Customers
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-800">100.0%</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">+₨ {totalRevenue.toLocaleString()}</td>
                  </tr>

                  <tr className="bg-blue-50/20">
                    <td className="py-2.5 px-4 font-medium text-blue-900 flex items-center gap-2 text-xs">
                      <Milk className="w-3.5 h-3.5 text-blue-700" /> <em>Informational: Milk Dispatched on Credit (Khata)</em>
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs text-[var(--text-muted)]">-</td>
                    <td className="py-2.5 px-4 text-right font-bold text-blue-800 text-xs">₨ {totalBilledSales.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-medium text-[var(--text-main)] flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-amber-600" /> Feed & Silage Costs
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--text-muted)]">
                      {totalRevenue > 0 ? ((feedExpense / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">-₨ {feedExpense.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-medium text-[var(--text-main)] flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" /> Staff Salaries & Advances
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--text-muted)]">
                      {totalRevenue > 0 ? ((payrollExpense / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">-₨ {payrollExpense.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-medium text-[var(--text-main)] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Electricity & WAPDA Bills / Farm Ops
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--text-muted)]">
                      {totalRevenue > 0 ? ((operatingExpense / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">-₨ {operatingExpense.toLocaleString()}</td>
                  </tr>

                  <tr className={`border-t-2 font-black ${isProfitable ? 'bg-emerald-100/60 text-emerald-900' : 'bg-rose-100/60 text-rose-900'}`}>
                    <td className="py-3.5 px-4 font-black">NET CASH FLOW / (DEFICIT)</td>
                    <td className="py-3.5 px-4 text-right font-black">{profitMarginPercent.toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right font-black text-lg">
                      {isProfitable ? '+' : ''}₨ {netProfitOrLoss.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Link 
                  href="/portal/admin/customers" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  onClick={() => setShowPnLDetails(false)}
                >
                  Customer Khata →
                </Link>
                <Link 
                  href="/portal/admin/feed" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                  onClick={() => setShowPnLDetails(false)}
                >
                  Feed Hub →
                </Link>
                <Link 
                  href="/portal/admin/expenses" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
                  onClick={() => setShowPnLDetails(false)}
                >
                  Expenses Hub →
                </Link>
              </div>

              <button 
                onClick={() => setShowPnLDetails(false)} 
                className="px-6 py-2.5 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales & Revenue Breakdown Modal */}
      {showSalesDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowSalesDetails(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--text-main)]">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--text-main)]">Sales & Dispatch Details</h2>
                <p className="text-sm font-medium text-[var(--text-muted)]">Breakdown for {period}</p>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                <span className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-wider block">Total Dispatched</span>
                <span className="text-2xl font-black text-[var(--text-main)] mt-1 block">{totalLitersDispatched.toLocaleString()} L</span>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                <span className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-wider block">Total Billed</span>
                <span className="text-2xl font-black text-blue-700 mt-1 block">₨ {totalBilledSales.toLocaleString()}</span>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] col-span-2 sm:col-span-1">
                <span className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-wider block">Paid Inflow</span>
                <span className="text-2xl font-black text-green-700 mt-1 block">₨ {totalRevenue.toLocaleString()}</span>
              </div>
            </div>

            {/* Dispatches Table */}
            <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-main)] border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      <th className="py-3 px-4 font-bold">Date & Time</th>
                      <th className="py-3 px-4 font-bold">Customer</th>
                      <th className="py-3 px-4 font-bold text-right">Liters Dispatched</th>
                      <th className="py-3 px-4 font-bold text-right">Rate / L</th>
                      <th className="py-3 px-4 font-bold text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm">
                    {currentSalesList.map((sale) => {
                      const d = new Date(sale.timestamp);
                      const customerName = (sale.customerId && customerMap[sale.customerId]) || 'Direct Sale';
                      const volume = (sale.volumeLiters ?? (sale as any).litersSold ?? 0) as number;
                      const totalPKR = (sale.totalPKR ?? 0) as number;
                      const rate = volume > 0 ? (totalPKR / volume).toFixed(0) : '-';

                      return (
                        <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-[var(--text-main)]">
                            <div>{d.toLocaleDateString()}</div>
                            <div className="text-xs text-[var(--text-muted)]">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[var(--text-main)]">
                            {customerName}
                          </td>
                          <td className="py-3.5 px-4 font-black text-right text-[var(--primary)]">
                            {volume.toLocaleString()} L
                          </td>
                          <td className="py-3.5 px-4 font-medium text-right text-[var(--text-muted)]">
                            ₨ {rate}
                          </td>
                          <td className="py-3.5 px-4 font-black text-right text-blue-700">
                            ₨ {totalPKR.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    {currentSalesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[var(--text-muted)] font-medium">
                          No sales dispatched during this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 mt-6">
              <Link 
                href="/portal/admin/customers" 
                className="px-5 py-2.5 font-bold text-xs uppercase tracking-wider text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl transition-colors"
                onClick={() => setShowSalesDetails(false)}
              >
                Go to Customer Khata →
              </Link>
              <button 
                onClick={() => setShowSalesDetails(false)} 
                className="px-6 py-2.5 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
