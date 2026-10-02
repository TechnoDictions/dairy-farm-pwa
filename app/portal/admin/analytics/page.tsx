'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../db/db';
import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Activity, Milk, Users, DollarSign, Wheat, TrendingUp, 
  Layers, ShieldCheck, CheckCircle2, Clock, Calendar, Sparkles, Building2
} from 'lucide-react';
import Link from 'next/link';

const BREED_COLORS = ['#0B6AB5', '#249D4A', '#D97706', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'];

export default function AnalyticsHub() {
  const [timeRange, setTimeRange] = useState<'All-Time' | 'This Month' | 'This Year'>('All-Time');

  // Real database queries
  const milkingLogs = useLiveQuery(() => db.MilkingLogs.toArray(), []);
  const livestock = useLiveQuery(() => db.Livestock.toArray(), []);
  const salesLogs = useLiveQuery(() => db.SalesLogs.toArray(), []);
  const customerPayments = useLiveQuery(() => db.CustomerPayments.toArray(), []);
  const feedLogs = useLiveQuery(() => db.FeedLogs.toArray(), []);
  const expenseLogs = useLiveQuery(() => db.ExpenseLogs.toArray(), []);
  const salaryPayments = useLiveQuery(() => db.SalaryPayments.toArray(), []);

  // Compute Active Milking Animals (Based on status & recent milk entries)
  const activeMilkingStats = useMemo(() => {
    if (!livestock || !milkingLogs) return { milkingCount: 0, totalHerd: 0, lactatingRatio: 0, avgPerCow: 0 };
    
    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const recentMilkingTags = new Set(
      milkingLogs
        .filter(l => (now - new Date(l.timestamp).getTime()) <= fiveDaysMs && l.yieldLiters > 0)
        .map(l => l.tag)
    );

    const activeHerd = livestock.filter(c => c.status !== 'Sold');
    const totalHerd = activeHerd.length;

    const milkingCows = activeHerd.filter(c => {
      if (c.gender === 'Male') return false;
      const st = (c.status || '').toLowerCase();
      if (st === 'pregnant' && c.expectedCalvingDate) {
        const daysRemaining = (new Date(c.expectedCalvingDate).getTime() - now) / (1000 * 60 * 60 * 24);
        if (daysRemaining <= 30) return false;
      }
      return st === 'lactating' || st === 'pregnant' || recentMilkingTags.has(c.tag);
    });

    const milkingCount = milkingCows.length;
    const lactatingRatio = totalHerd > 0 ? (milkingCount / totalHerd) * 100 : 0;

    // Total milk in last 30 days divided by active milking cows
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const last30DaysMilk = milkingLogs
      .filter(l => (now - new Date(l.timestamp).getTime()) <= thirtyDaysMs)
      .reduce((sum, l) => sum + (l.yieldLiters || 0), 0);
    
    const avgDailyPerCow = (milkingCount > 0 && last30DaysMilk > 0) ? (last30DaysMilk / 30 / milkingCount) : 0;

    return { milkingCount, totalHerd, lactatingRatio, avgPerCow: avgDailyPerCow };
  }, [livestock, milkingLogs]);

  // Compute Filtered Core Metrics
  const analyticsData = useMemo(() => {
    if (!milkingLogs || !salesLogs || !livestock) {
      return {
        totalProduction: 0,
        totalSalesVolume: 0,
        totalSalesBilled: 0,
        totalCashCollected: 0,
        outstandingKhata: 0,
        activeFeedStockValue: 0,
        activeFeedBatchesCount: 0,
        feedReserveDays: 0,
        breedYieldData: [],
        monthlyTrendData: [],
        cashVsSalesData: [],
        expensesDistribution: []
      };
    }

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Filter Milking Logs
    const filteredMilking = milkingLogs.filter(l => {
      if (timeRange === 'All-Time') return true;
      const d = new Date(l.timestamp);
      if (timeRange === 'This Month') return d.getMonth() === curMonth && d.getFullYear() === curYear;
      if (timeRange === 'This Year') return d.getFullYear() === curYear;
      return true;
    });

    // Filter Sales Logs
    const filteredSales = salesLogs.filter(s => {
      if (timeRange === 'All-Time') return true;
      const d = new Date(s.timestamp);
      if (timeRange === 'This Month') return d.getMonth() === curMonth && d.getFullYear() === curYear;
      if (timeRange === 'This Year') return d.getFullYear() === curYear;
      return true;
    });

    // Filter Payments
    const filteredPayments = (customerPayments || []).filter(p => {
      if (timeRange === 'All-Time') return true;
      const d = new Date(p.paymentDate);
      if (timeRange === 'This Month') return d.getMonth() === curMonth && d.getFullYear() === curYear;
      if (timeRange === 'This Year') return d.getFullYear() === curYear;
      return true;
    });

    // Totals
    const totalProduction = filteredMilking.reduce((sum, l) => sum + (l.yieldLiters || 0), 0);
    const totalSalesVolume = filteredSales.reduce((sum, s) => sum + ((s.volumeLiters ?? (s as any).litersSold ?? 0) as number), 0);
    const totalSalesBilled = filteredSales.reduce((sum, s) => sum + (s.totalPKR || 0), 0);
    const totalCashCollected = filteredPayments.reduce((sum, p) => sum + (p.amountPKR || 0), 0);

    // All-time uncollected Khata
    const allBilled = salesLogs.reduce((sum, s) => sum + (s.totalPKR || 0), 0);
    const allPaid = (customerPayments || []).reduce((sum, p) => sum + (p.amountPKR || 0), 0);
    const outstandingKhata = Math.max(0, allBilled - allPaid);

    // Feed Inventory & Active Batches Available
    let activeFeedStockValue = 0;
    let activeFeedBatchesCount = 0;
    let maxReserveDays = 0;

    (feedLogs || []).forEach(f => {
      const start = new Date(f.date || f.startDate || Date.now());
      const duration = f.durationDays && f.durationDays > 0 ? f.durationDays : 30;
      const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, duration - elapsedDays);

      if (remainingDays > 0) {
        activeFeedBatchesCount += 1;
        const dailyRate = (f.totalAmountPKR || 0) / duration;
        activeFeedStockValue += (dailyRate * remainingDays);
        if (remainingDays > maxReserveDays) maxReserveDays = remainingDays;
      }
    });

    // Dynamic Real Breed Yield Calculation (Strictly existing active herd)
    const activeHerd = livestock.filter(c => c.status !== 'Sold');
    const cowBreedMap: Record<string, string> = {};
    const breedHeadMap: Record<string, number> = {};

    activeHerd.forEach(c => {
      const b = (c.breed && c.breed.trim()) ? c.breed.trim() : 'General Breed';
      cowBreedMap[c.tag] = b;
      breedHeadMap[b] = (breedHeadMap[b] || 0) + 1;
    });

    const breedYieldMap: Record<string, number> = {};
    Object.keys(breedHeadMap).forEach(b => {
      breedYieldMap[b] = 0;
    });

    // Only add yield for cows that currently exist in active herd
    filteredMilking.forEach(l => {
      const breed = cowBreedMap[l.tag];
      if (breed && breedYieldMap[breed] !== undefined) {
        breedYieldMap[breed] += (l.yieldLiters || 0);
      }
    });

    const breedYieldData = Object.keys(breedHeadMap).map(b => ({
      name: b,
      yield: Math.round(breedYieldMap[b] || 0),
      count: breedHeadMap[b] || 0
    })).sort((a, b) => b.yield - a.yield || b.count - a.count);

    // Monthly Yield & Sales Timeline
    const monthMap: Record<string, { month: string; yieldLiters: number; salesPKR: number; cashPKR: number }> = {};
    
    // Last 6-12 months buckets
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      monthMap[key] = { month: key, yieldLiters: 0, salesPKR: 0, cashPKR: 0 };
    }

    milkingLogs.forEach(l => {
      const d = new Date(l.timestamp);
      const key = d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      if (monthMap[key]) {
        monthMap[key].yieldLiters += (l.yieldLiters || 0);
      }
    });

    salesLogs.forEach(s => {
      const d = new Date(s.timestamp);
      const key = d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      if (monthMap[key]) {
        monthMap[key].salesPKR += (s.totalPKR || 0);
      }
    });

    (customerPayments || []).forEach(p => {
      const d = new Date(p.paymentDate);
      const key = d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      if (monthMap[key]) {
        monthMap[key].cashPKR += (p.amountPKR || 0);
      }
    });

    const monthlyTrendData = Object.values(monthMap);

    // Expense Distribution
    const totalFeedCost = (feedLogs || []).reduce((s, f) => s + (f.totalAmountPKR || 0), 0);
    const totalSalaries = (salaryPayments || []).reduce((s, p) => s + (p.amountPKR || 0), 0);
    const totalOps = (expenseLogs || []).reduce((s, e) => s + (e.amountPKR || 0), 0);

    const expensesDistribution = [
      { name: 'Feed & Silage', amount: totalFeedCost, color: '#D97706' },
      { name: 'Staff Salaries', amount: totalSalaries, color: '#2563EB' },
      { name: 'WAPDA & Farm Ops', amount: totalOps, color: '#E11D48' },
    ];

    return {
      totalProduction,
      totalSalesVolume,
      totalSalesBilled,
      totalCashCollected,
      outstandingKhata,
      activeFeedStockValue,
      activeFeedBatchesCount,
      feedReserveDays: maxReserveDays,
      breedYieldData,
      monthlyTrendData,
      cashVsSalesData: monthlyTrendData,
      expensesDistribution
    };
  }, [milkingLogs, salesLogs, livestock, customerPayments, feedLogs, expenseLogs, salaryPayments, timeRange]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Activity className="w-8 h-8 text-[var(--primary)]" /> Farm Analytics Hub
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Real-time herd production, milking metrics, sales credit, and active feed availability
          </p>
        </div>

        <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
          {['All-Time', 'This Month', 'This Year'].map(t => (
            <button 
              key={t}
              onClick={() => setTimeRange(t as any)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                timeRange === t 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core Real Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Milk Production */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-gold)]">
              Total Milk Production
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--primary)]">
              <Milk className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">
            {analyticsData.totalProduction.toLocaleString()} L
          </div>
          <div className="pt-2 border-t border-[var(--border)]/60 text-xs text-[var(--text-muted)] flex justify-between items-center">
            <span>Dispatched: <strong className="text-[var(--text-main)]">{analyticsData.totalSalesVolume.toLocaleString()} L</strong></span>
            <span className="text-emerald-700 font-bold">100% Real Logs</span>
          </div>
        </div>

        {/* 2. Total Animals Milking */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-gold)]">
              Total Animals Milking
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-700">{activeMilkingStats.milkingCount}</span>
            <span className="text-sm font-bold text-[var(--text-muted)]">/ {activeMilkingStats.totalHerd} Active Herd</span>
          </div>
          <div className="pt-2 border-t border-[var(--border)]/60 text-xs text-[var(--text-muted)] flex justify-between items-center">
            <span>Lactation Ratio: <strong className="text-blue-900">{Math.round(activeMilkingStats.lactatingRatio)}%</strong></span>
            <span>Avg: <strong className="text-blue-900">{activeMilkingStats.avgPerCow.toFixed(1)} L/cow/day</strong></span>
          </div>
        </div>

        {/* 3. Total Sales & Realized Cash */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-gold)]">
              Total Sales & Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-800">
            ₨ {analyticsData.totalSalesBilled.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-[var(--border)]/60 text-xs text-[var(--text-muted)] flex justify-between items-center">
            <span>Collected: <strong className="text-emerald-700">₨ {analyticsData.totalCashCollected.toLocaleString()}</strong></span>
            {analyticsData.outstandingKhata > 0 && (
              <span className="text-rose-600 font-bold">₨ {analyticsData.outstandingKhata.toLocaleString()} Khata</span>
            )}
          </div>
        </div>

        {/* 4. Total Feed Available & Stock Value */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-gold)]">
              Total Feed Available
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Wheat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-800">
            ₨ {Math.round(analyticsData.activeFeedStockValue).toLocaleString()}
          </div>
          <div className="pt-2 border-t border-[var(--border)]/60 text-xs text-[var(--text-muted)] flex justify-between items-center">
            <span>Active Batches: <strong className="text-amber-900">{analyticsData.activeFeedBatchesCount}</strong></span>
            <span>Reserve: <strong className="text-amber-900">{analyticsData.feedReserveDays} Days</strong></span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Real Monthly Production & Trend */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Milk className="w-5 h-5 text-[var(--primary)]" />
                Monthly Milk Production (Liters)
              </h3>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Historical yield across recent calendar months</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D2" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6C7A73', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6C7A73', fontSize: 12, fontWeight: 600 }} dx={-5} />
                <Tooltip 
                  cursor={{ fill: 'rgba(30, 58, 43, 0.05)' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} Liters`, 'Milk Yield']}
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(30, 58, 43, 0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="yieldLiters" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Real Yield by Breed */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Yield by Herd Breed (Liters)
              </h3>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Calculated dynamically from cattle breed performance</p>
            </div>
          </div>

          <div className="h-72 w-full flex items-center">
            {analyticsData.breedYieldData.length > 0 ? (
              <>
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.breedYieldData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="yield"
                        stroke="none"
                      >
                        {analyticsData.breedYieldData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BREED_COLORS[index % BREED_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${Number(value).toLocaleString()} L`, 'Yield']}
                        contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-1/2 space-y-3 pl-4">
                  {analyticsData.breedYieldData.map((b, i) => (
                    <div key={b.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: BREED_COLORS[i % BREED_COLORS.length] }}></div>
                        <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[100px]">{b.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[var(--text-main)] block">{b.yield.toLocaleString()} L</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{b.count} Head</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full text-center text-[var(--text-muted)] font-medium">
                No livestock breed data recorded.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Credit Sales vs Cash Realization */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                Sales Billed vs Cash Collected (PKR)
              </h3>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Credit sales dispatch vs real cash payment settlements</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.cashVsSalesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D2" />
                <XAxis dataKey="month" tick={{ fill: '#6C7A73', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6C7A73', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={val => `₨${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                <Tooltip 
                  formatter={(val: any, name: any) => [`₨ ${Number(val).toLocaleString()}`, name === 'salesPKR' ? 'Billed Sales' : 'Cash Collected']}
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="salesPKR" name="salesPKR" stroke="var(--primary)" fill="url(#colorBilled)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="cashPKR" name="cashPKR" stroke="#059669" fill="url(#colorCash)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Farm Expense Allocation */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-600" />
                Farm Cost & Expense Distribution
              </h3>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">Proportionate breakdown across feed, salaries, and WAPDA</p>
            </div>
          </div>

          <div className="space-y-5 pt-2">
            {analyticsData.expensesDistribution.map(exp => {
              const totalAllExp = analyticsData.expensesDistribution.reduce((s, e) => s + e.amount, 0);
              const pct = totalAllExp > 0 ? Math.round((exp.amount / totalAllExp) * 100) : 0;

              return (
                <div key={exp.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-[var(--text-main)] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: exp.color }}></span>
                      {exp.name}
                    </span>
                    <span className="text-[var(--text-main)]">
                      ₨ {exp.amount.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: exp.color }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
