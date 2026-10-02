'use client';

import Link from 'next/link';
import { useState } from 'react';
import { 
  Milk, Wheat, ReceiptText, Users, ShieldCheck, Zap, 
  CheckCircle2, ArrowRight, Smartphone, Monitor, Cloud, 
  Download, Sparkles, TrendingUp, ChevronRight, Activity, 
  Calendar, Award, Star, Check 
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/config/subscription';

export default function SaaSMarketingLandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-[var(--primary)] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* Enlarged Logo without duplicate text */}
            <img src="/logo.svg" alt="Lactis Dairy Farm Management" className="h-12 sm:h-14 w-auto object-contain" />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0B6AB5]/10 text-[#0B6AB5] border border-[#0B6AB5]/20">
              Cloud OS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text-main)] transition-colors">Features</a>
            <a href="#pnl-engine" className="hover:text-[var(--text-main)] transition-colors">P&L Engine</a>
            <a href="#offline-sync" className="hover:text-[var(--text-main)] transition-colors">Offline Sync</a>
            <a href="#pricing" className="hover:text-[var(--text-main)] transition-colors">Pricing</a>
            <a href="#download" className="hover:text-[var(--text-main)] transition-colors">Android & PC App</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 text-xs font-bold text-[var(--text-main)] hover:bg-gray-100 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login?signup=true"
              className="px-5 py-2.5 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Background glow using logo gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-tr from-[#0B6AB5]/15 via-[#249D4A]/10 to-transparent pointer-events-none rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B6AB5]/10 border border-[#0B6AB5]/20 text-[#0B6AB5] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#249D4A]" />
              <span>Version 2.0 • Offline-First Dairy ERP & Cloud SaaS</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-[var(--text-main)]">
              The Complete Operating System for <span className="bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] bg-clip-text text-transparent">Modern Dairy Farms</span>
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-muted)] font-medium leading-relaxed">
              Track milk yields, automate multi-month feed costs, manage customer credit khatas, and calculate real cash profit & loss — even without an internet connection.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/login?signup=true&plan=pro"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0B6AB5] hover:bg-[#085491] text-white font-extrabold text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[var(--bg-card)] hover:bg-slate-50 text-[var(--text-main)] border border-[var(--border)] font-bold text-sm shadow-sm transition-all card-hover"
              >
                Live Interactive Demo →
              </Link>
            </div>

            <p className="text-xs text-[var(--text-muted)] font-medium">
              ✨ No credit card required • Instant setup in 2 minutes • Works on any phone, tablet, or Windows PC
            </p>
          </div>

          {/* Interactive Live Dashboard Mockup */}
          <div className="mt-16 bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] luxury-shadow p-6 sm:p-8 max-w-5xl mx-auto relative overflow-hidden card-hover">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-bold text-[var(--text-muted)] ml-2">Command Center & Live P&L</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Cloud Synced
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] card-hover">
                <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider block">Today Yield</span>
                <span className="text-2xl font-black text-[var(--text-main)] mt-1 block">840 Liters</span>
                <span className="text-[11px] text-[#249D4A] font-bold">↑ 8.4% vs last week</span>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] card-hover">
                <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider block">Cash Collected</span>
                <span className="text-2xl font-black text-[#249D4A] mt-1 block">₨ 142,500</span>
                <span className="text-[11px] text-[var(--text-muted)]">From Customer Khata</span>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] card-hover">
                <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider block">Active Silage Stock</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">120 Days</span>
                <span className="text-[11px] text-slate-600 font-bold">₨ 1,500/day amortized</span>
              </div>
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/80 card-hover">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Farm Net Margin</span>
                <span className="text-2xl font-black text-emerald-800 mt-1 block">+₨ 87,200</span>
                <span className="text-[11px] text-emerald-700 font-bold">61.2% Real Margin</span>
              </div>
            </div>

            <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  ✓
                </span>
                <span>Active Milking Herd: <strong>48 / 62 Head</strong> • Colostrum Alerts: <strong>2 Due</strong></span>
              </div>
              <Link href="/portal/admin/dashboard" className="text-[#0B6AB5] hover:text-[#085491] flex items-center gap-1 transition-colors">
                Explore Full Interactive Software →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-20 bg-[var(--bg-card)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold text-[#0B6AB5] uppercase tracking-widest">
              Engineered For Dairy Farmers
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-main)]">
              Everything Needed to Run a Profitable Dairy Operation
            </h3>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Eliminate paper registers, missing milk logs, untracked feed expenses, and customer credit confusion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B6AB5] border border-blue-100 flex items-center justify-center text-2xl font-black">
                🥛
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)]">Milk Production & Yield Leaderboards</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                Log morning and evening yields in seconds. Auto-rank highest producing cows and identify sudden yield drops before disease spreads.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#249D4A] border border-emerald-100 flex items-center justify-center text-2xl font-black">
                🌾
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)]">Multi-Month Silage & Feed Amortization</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                Prepared a 4-month silage pit or bought seasonal sorghum? The system automatically amortizes the cost daily instead of falsely showing a huge 1-day loss.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center text-2xl font-black">
                📒
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)]">Customer Khata & Credit Accounts</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                Customers buy daily and pay weekly/monthly. Keep full ledger of dispatched liters, record cash receipts, and track remaining debt balances effortlessly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center text-2xl font-black">
                💉
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)]">Medical, Calving & Vaccine Tasks</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                Schedule FMD, Anthrax, and Deworming tasks. Get automated alerts 30 days before calving to transition cows to dry and colostrum stages.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center text-2xl font-black">
                👥
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)]">Staff Payroll, Advances & Facilities</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                Manage milkers, feeders, and security staff. Track salary disbursals, monthly advance loans, and non-cash perks (wheat/milk ration).
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center text-2xl font-black">
                ⚡
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)]">100% Offline-First Cloud Sync</h4>
              <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                Works seamlessly in remote barns with zero cellular signal. All data is saved on device and auto-syncs securely to Supabase PostgreSQL when connected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Pricing Section */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B6AB5]/10 border border-[#0B6AB5]/20 text-[#0B6AB5] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#249D4A]" />
            Official SaaS Pricing • Limited Launch Rates
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--text-main)]">
            Transparent Plans for Any Farm Size
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-medium">
            Lock in introductory rates today. All plans include 100% offline functionality, multi-tenant local isolation, and automatic cloud backup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {/* Starter */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 border-2 border-emerald-500 shadow-md flex flex-col justify-between card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-xs">
              ₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly} / MO
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Tier 1 • Small Sheds</span>
              <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{SUBSCRIPTION_PLANS.starter.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{SUBSCRIPTION_PLANS.starter.duration}</p>
              
              <div className="my-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-800">
                    ₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">/ month</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">
                    {SUBSCRIPTION_PLANS.starter.discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-emerald-200/60">
                  <span className="font-bold text-emerald-900">Total: ₨ {SUBSCRIPTION_PLANS.starter.introPrice} (1st month)</span>
                  <span className="font-bold text-emerald-700">Save ₨ {SUBSCRIPTION_PLANS.starter.savingsPKR}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Renews at ₨ {SUBSCRIPTION_PLANS.starter.renewalPrice}/mo after 1st month
                </p>
              </div>

              <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-8">
                {SUBSCRIPTION_PLANS.starter.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#249D4A] shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>

            <Link
              href="/login?plan=starter"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#249D4A] to-[#1e823d] text-white font-black text-xs text-center transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              Choose Starter (₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.starter.introPrice}) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Farm Pro */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 border-2 border-[#0B6AB5] shadow-2xl flex flex-col justify-between relative overflow-hidden card-hover">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-xs">
              ⭐ {SUBSCRIPTION_PLANS.pro.badge}
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0B6AB5]">Tier 2 • Commercial Dairy</span>
              <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{SUBSCRIPTION_PLANS.pro.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{SUBSCRIPTION_PLANS.pro.duration}</p>
              
              <div className="my-6 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-[#0B6AB5]">
                    ₨ {SUBSCRIPTION_PLANS.pro.effectiveMonthly}
                  </span>
                  <span className="text-xs font-bold text-[#0B6AB5]">/ month</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">
                    {SUBSCRIPTION_PLANS.pro.discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-blue-200/60">
                  <span className="font-bold text-blue-900">Total: ₨ {SUBSCRIPTION_PLANS.pro.introPrice.toLocaleString()} billed annually</span>
                  <span className="font-black text-emerald-800">Save ₨ {SUBSCRIPTION_PLANS.pro.savingsPKR.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Renews at ₨ {SUBSCRIPTION_PLANS.pro.renewalPrice.toLocaleString()}/yr (~₨ {Math.round(SUBSCRIPTION_PLANS.pro.renewalPrice / 12)}/mo)
                </p>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-[var(--text-main)] mb-8">
                {SUBSCRIPTION_PLANS.pro.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#249D4A] shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>

            <Link
              href="/login?plan=pro"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B6AB5] to-[#085491] hover:opacity-95 text-white font-black text-xs text-center shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Activate Pro Annual (₨ {SUBSCRIPTION_PLANS.pro.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.pro.introPrice.toLocaleString()}) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow flex flex-col justify-between relative overflow-hidden card-hover">
            <div className="absolute top-0 right-0 bg-slate-900 text-amber-300 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-xs">
              🏆 24-MONTH LOCK-IN
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tier 3 • Multi-Farm & VIP</span>
              <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{SUBSCRIPTION_PLANS.enterprise.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{SUBSCRIPTION_PLANS.enterprise.duration}</p>
              
              <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-[var(--text-main)]">
                    ₨ {SUBSCRIPTION_PLANS.enterprise.effectiveMonthly}
                  </span>
                  <span className="text-xs font-bold text-slate-600">/ month</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">
                    {SUBSCRIPTION_PLANS.enterprise.discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-900">Total: ₨ {SUBSCRIPTION_PLANS.enterprise.introPrice.toLocaleString()} for 2 years</span>
                  <span className="font-bold text-emerald-700">Save ₨ {SUBSCRIPTION_PLANS.enterprise.savingsPKR.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Locked for 24 months • Renews at ₨ {SUBSCRIPTION_PLANS.enterprise.renewalPrice.toLocaleString()}/2yr
                </p>
              </div>

              <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-8">
                {SUBSCRIPTION_PLANS.enterprise.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#249D4A] shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>

            <Link
              href="/login?plan=enterprise"
              className="w-full py-3.5 rounded-2xl border-2 border-slate-800 text-slate-900 hover:bg-slate-900 hover:text-white font-black text-xs text-center transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Choose Enterprise (₨ {SUBSCRIPTION_PLANS.enterprise.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.enterprise.introPrice.toLocaleString()}) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Download Software / Mobile App Section */}
      <section id="download" className="py-16 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider">Install Anywhere</span>
            <h2 className="text-3xl font-black text-[var(--text-main)]">Install as Desktop Software or Android App</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">
              No need to rely on app stores. Install directly to your Windows desktop with 1-click or add to your Android home screen as an offline APK.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] card-hover">
              <Monitor className="w-8 h-8 text-[#0B6AB5] shrink-0" />
              <div>
                <p className="text-xs font-bold text-[var(--text-main)]">Windows PC Software</p>
                <p className="text-[11px] text-[var(--text-muted)]">Edge & Chrome 1-Click Install</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] card-hover">
              <Smartphone className="w-8 h-8 text-[#249D4A] shrink-0" />
              <div>
                <p className="text-xs font-bold text-[var(--text-main)]">Android Phone & Tablet</p>
                <p className="text-[11px] text-[var(--text-muted)]">Instant Offline APK / PWA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--border)] text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Lactis" className="h-8 w-auto object-contain" />
            <span className="text-slate-600 font-bold">• Next-Gen Dairy Operating System</span>
          </div>
          <div className="flex gap-6 font-bold">
            <Link href="/login" className="hover:text-[var(--text-main)]">Admin Login</Link>
            <Link href="/login" className="hover:text-[var(--text-main)]">Employee Kiosk</Link>
            <a href="#pricing" className="hover:text-[var(--text-main)]">SaaS Subscriptions</a>
          </div>
          <p className="font-semibold">Lactis powered by <strong className="text-[var(--text-main)]">Blazas</strong></p>
        </div>
      </footer>
    </div>
  );
}