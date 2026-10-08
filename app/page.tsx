'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Milk, Wheat, ReceiptText, Users, ShieldCheck, Zap,
  ArrowRight, Smartphone, Monitor, Cloud,
  Download, Sparkles, TrendingUp, Activity,
  Check, Building2, Layers, BookOpen, Lock,
  BarChart2, Bell, RefreshCw
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/config/subscription';
import InstallModal from '@/components/InstallModal';

/* ---------- Scroll-reveal hook ---------- */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ---------- Animated counter ---------- */
function CountUp({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        obs.disconnect();
        let start = 0;
        const step = target / 60;
        const id = setInterval(() => {
          start += step;
          if (start >= target) { setVal(target); clearInterval(id); }
          else setVal(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ---------- Feature data ---------- */
const FEATURES = [
  {
    icon: Building2, color: 'text-[#0B6AB5]', bg: 'bg-blue-50', border: 'border-blue-100',
    title: 'Milk Production Leaderboard',
    desc: 'Log morning & evening sessions in seconds. Auto-rank highest producers and catch sudden yield drops before illness spreads.',
    before: 'Missing yields, paper registers, no trend data',
    after: 'Every cow ranked, trends visible, alerts automated',
  },
  {
    icon: Layers, color: 'text-[#249D4A]', bg: 'bg-emerald-50', border: 'border-emerald-100',
    title: 'Multi-Month Feed Amortization',
    desc: 'Bought 4-month silage? Lactis distributes that cost daily so your P&L never shows a false one-day loss.',
    before: 'Big silage purchase ruins monthly P&L numbers',
    after: 'Cost spread across the season, margins look real',
  },
  {
    icon: BookOpen, color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-200',
    title: 'Customer Khata Ledger',
    desc: 'Daily dispatches, weekly cash collections, running credit balance per customer — all in one place.',
    before: 'Paper khata books, missing payments, disputes',
    after: 'Digital ledger, instant balance, zero disputes',
  },
  {
    icon: Activity, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100',
    title: 'Calving & Vaccine Scheduler',
    desc: 'FMD, Anthrax, deworming — automated 30-day calving alerts. Never miss a critical health event.',
    before: 'Vaccines forgotten, calving surprise, calf losses',
    after: 'Alerts 30 days early, colostrum prepared, calf safe',
  },
  {
    icon: Users, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100',
    title: 'Staff Kiosk & Payroll',
    desc: 'Employees log milking via their own kiosk login. Track salaries, advances, and non-cash perks automatically.',
    before: 'Manual salary sheets, advance disputes, no audit trail',
    after: 'Staff self-log, payroll tracked, advances transparent',
  },
  {
    icon: Zap, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-100',
    title: '100% Offline-First, Cloud Sync',
    desc: 'Works in remote barns with zero signal. All data syncs securely to the cloud when connected.',
    before: 'Internet required, data lost during outages',
    after: 'Works offline always, syncs when reconnected',
  },
];

const STATS = [
  { val: 840, suffix: 'L', label: 'Avg daily yield tracked', prefix: '' },
  { val: 62, suffix: ' Head', label: 'Livestock records per farm', prefix: '' },
  { val: 142500, suffix: '', prefix: '₨', label: 'Monthly cash tracked' },
  { val: 87200, suffix: '', prefix: '+₨', label: 'Net margin reported' },
];

const TICKER_ITEMS = [
  'Milk yield tracking', 'Feed amortization', 'Customer khata',
  'Calving alerts', 'Vaccine schedules', 'Staff payroll',
  'P&L reporting', 'Offline sync', 'Cow health tracking',
  'Silage management', 'Expense logging', 'Cloud backup',
];

export default function SaaSLandingPage() {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  const heroRef = useReveal();
  const statsRef = useReveal();
  const featureRef = useReveal();
  const pricingRef = useReveal();
  const downloadRef = useReveal();

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-cycle feature tab
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3500);
    return () => clearInterval(t);
  }, []);

  const af = FEATURES[activeFeature];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-[#0B6AB5]/20">
      {/* ── Navbar ── */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Lactis" className="h-12 sm:h-14 w-auto object-contain" />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0B6AB5]/10 text-[#0B6AB5] border border-[#0B6AB5]/20">
              Cloud OS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text-main)] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--text-main)] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[var(--text-main)] transition-colors">Pricing</a>
            <button
              onClick={() => setShowInstallModal(true)}
              className="hover:text-[#0B6AB5] transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Download className="w-3.5 h-3.5" /> Install App
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2.5 text-xs font-bold text-[var(--text-main)] hover:bg-slate-100 rounded-xl transition-colors">
              Sign In
            </Link>
            <Link
              href="/login?signup=true"
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0B6AB5] hover:bg-[#085491] rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              Free Trial <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Ticker ── */}
      <div className="bg-[#0B6AB5] py-2 overflow-hidden">
        <div className="flex whitespace-nowrap animate-ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 text-white text-[11px] font-black uppercase tracking-wider mx-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#249D4A] shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-[#0B6AB5]/12 via-[#249D4A]/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute -top-20 -right-40 w-80 h-80 bg-[#249D4A]/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div ref={heroRef} className="reveal text-center max-w-4xl mx-auto space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0B6AB5]/10 border border-[#0B6AB5]/20 text-[#0B6AB5] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#249D4A]" />
              Offline-First Dairy ERP — Built for Pakistani Farms
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-[var(--text-main)]">
              Run your dairy farm<br />
              <span className="shimmer-text">like a modern business</span>
            </h1>

            <p className="text-base sm:text-xl text-[var(--text-muted)] font-medium leading-relaxed max-w-2xl mx-auto">
              Track every liter, automate feed costs, manage customer credit khatas, and see your real net profit — even without internet.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/login?signup=true"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0B6AB5] hover:bg-[#085491] text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Start 15-Day Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[var(--bg-card)] hover:bg-slate-50 text-[var(--text-main)] border border-[var(--border)] font-bold text-sm shadow-sm transition-all card-hover flex items-center justify-center gap-2"
              >
                Sign In to Dashboard →
              </Link>
            </div>

            <p className="text-xs text-[var(--text-muted)] font-medium">
              No credit card required · Works on phone, tablet, or Windows PC · 100% offline
            </p>
          </div>

          {/* ── Live Dashboard Preview ── */}
          <div className="mt-16 max-w-5xl mx-auto animate-float" style={{ animationDuration: '5s' }}>
            <div className="bg-white rounded-3xl border border-[var(--border)] luxury-shadow-lg p-5 sm:p-8 relative overflow-hidden">
              {/* Window bar */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-[var(--text-muted)] ml-2">Lactis Command Center — Live P&L</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Synced
                </span>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Today Yield', val: '840 L', sub: '↑ 8.4% vs last week', c: 'text-[#0B6AB5]', sc: 'text-[#249D4A]', bg: '' },
                  { label: 'Cash Collected', val: '₨ 142,500', sub: 'From Customer Khata', c: 'text-[#249D4A]', sc: 'text-slate-500', bg: '' },
                  { label: 'Feed Amortized', val: '₨ 55,300', sub: '120-day silage pit', c: 'text-amber-800', sc: 'text-amber-600', bg: '' },
                  { label: 'Net Margin', val: '+₨ 87,200', sub: '61.2% real margin', c: 'text-emerald-800', sc: 'text-emerald-700', bg: 'bg-emerald-50/80 border border-emerald-200/80' },
                ].map((kpi, i) => (
                  <div key={i} className={`${kpi.bg || 'bg-[var(--bg-main)]'} p-4 rounded-2xl border border-[var(--border)] card-hover`}>
                    <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider block">{kpi.label}</span>
                    <span className={`text-xl sm:text-2xl font-black mt-1 block ${kpi.c}`}>{kpi.val}</span>
                    <span className={`text-[11px] font-bold ${kpi.sc}`}>{kpi.sub}</span>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                {[
                  { label: 'Milking Herd Active', pct: 77, color: 'bg-[#0B6AB5]' },
                  { label: 'Feed Stock Remaining', pct: 62, color: 'bg-amber-500' },
                  { label: 'Khata Collected', pct: 84, color: 'bg-[#249D4A]' },
                ].map((b, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">{b.label}</span>
                      <span className="text-[var(--text-main)]">{b.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 bg-[var(--bg-card)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div ref={statsRef} className="reveal grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <div key={i} className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black text-[var(--text-main)]">
                  <CountUp target={s.val} suffix={s.suffix} prefix={s.prefix} />
                </p>
                <p className="text-xs text-[var(--text-muted)] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Helps — Interactive Feature Showcase ── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div ref={featureRef} className="reveal text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-black text-[#0B6AB5] uppercase tracking-widest">How Lactis Transforms Your Farm</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--text-main)]">
              Before vs After — See the Difference
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Every feature is built around a real problem Pakistani dairy farmers face daily.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Feature tabs */}
            <div className="lg:col-span-2 flex flex-col gap-2">
              {FEATURES.map((f, i) => {
                const FIcon = f.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-300 border ${
                      i === activeFeature
                        ? 'bg-[var(--bg-card)] border-[#0B6AB5]/40 shadow-md'
                        : 'border-transparent hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center shrink-0`}>
                      <FIcon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <span className={`text-sm font-black ${i === activeFeature ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                      {f.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Feature detail */}
            <div className="lg:col-span-3">
              <div key={activeFeature} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] luxury-shadow p-8 space-y-6 animate-scale-in">
                <div className={`w-14 h-14 rounded-2xl ${af.bg} border ${af.border} flex items-center justify-center`}>
                  <af.icon className={`w-7 h-7 ${af.color}`} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[var(--text-main)]">{af.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">{af.desc}</p>
                </div>

                {/* Before / After */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Before Lactis</span>
                    <p className="text-xs font-bold text-rose-900 leading-relaxed">{af.before}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">After Lactis</span>
                    <p className="text-xs font-bold text-emerald-900 leading-relaxed">{af.after}</p>
                  </div>
                </div>

                <Link
                  href="/login?signup=true"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B6AB5] text-white text-xs font-black shadow hover:bg-[#085491] transition-all active:scale-95"
                >
                  Try This Feature Free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Features Grid ── */}
      <section id="features" className="py-20 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold text-[#0B6AB5] uppercase tracking-widest">Complete Feature Set</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-main)]">
              Everything to Run a Profitable Dairy Operation
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const FI = f.icon;
              return (
                <div key={i} className="p-7 rounded-3xl bg-[var(--bg-main)] border border-[var(--border)] space-y-4 card-hover">
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} ${f.color} border ${f.border} flex items-center justify-center`}>
                    <FI className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black text-[var(--text-main)]">{f.title}</h4>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Offline / PWA section ── */}
      <section id="offline-sync" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#0B6AB5] to-[#085491] rounded-3xl p-10 sm:p-14 text-white grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">Offline-First Architecture</span>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                Works in your barn with<br />zero mobile signal
              </h2>
              <p className="text-sm font-medium text-blue-100 leading-relaxed">
                All data is stored on-device using IndexedDB. The moment you reconnect, Lactis auto-syncs every milking log, sale, and expense to your Supabase cloud account securely.
              </p>
              <div className="flex flex-col gap-3">
                {['Works with 0% signal', 'Auto-syncs on reconnect', 'Multi-device data merge', 'Secure encrypted backup'].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm font-bold text-white">
                    <div className="w-5 h-5 rounded-full bg-[#249D4A] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Cloud, label: 'Cloud Sync Active', val: 'Last sync: just now', color: 'text-[#249D4A]' },
                { icon: RefreshCw, label: 'Offline Records Queued', val: '0 pending — all synced', color: 'text-blue-200' },
                { icon: ShieldCheck, label: 'Data Security', val: 'Supabase PostgreSQL encrypted', color: 'text-blue-200' },
                { icon: Bell, label: 'Calving Alert', val: 'Cow #A14 — 28 days to calving', color: 'text-amber-300' },
              ].map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <div key={i} className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 border border-white/10 backdrop-blur-sm">
                    <ItemIcon className={`w-5 h-5 ${item.color} shrink-0`} />
                    <div>
                      <p className="text-xs font-black text-white">{item.label}</p>
                      <p className={`text-[11px] font-medium ${item.color}`}>{item.val}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div ref={pricingRef} className="reveal max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B6AB5]/10 border border-[#0B6AB5]/20 text-[#0B6AB5] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#249D4A]" />
              Transparent Pricing
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--text-main)]">
              Plans for Every Farm Size
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              All plans include 100% offline functionality, cloud backup, and multi-device sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
            {/* Trial */}
            <div className="bg-white rounded-3xl p-8 border-2 border-emerald-500 shadow-md flex flex-col justify-between card-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                {SUBSCRIPTION_PLANS.trial.badge}
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">No Credit Card Required</span>
                <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{SUBSCRIPTION_PLANS.trial.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{SUBSCRIPTION_PLANS.trial.duration}</p>
                <div className="my-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-800">₨ 0</span>
                    <span className="text-xs font-bold text-emerald-700">/ 15 Days</span>
                    <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">FREE</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-emerald-200/60">
                    <span className="font-bold text-emerald-900">Total: ₨ 0 for 15 Days</span>
                    <span className="font-bold text-emerald-700">1 Trial Per Farm</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-8">
                  {SUBSCRIPTION_PLANS.trial.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#249D4A] shrink-0" /> {f}</li>
                  ))}
                </ul>
              </div>
              <Link href="/login?plan=trial" className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#249D4A] to-[#1e823d] text-white font-black text-xs text-center transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
                Start 15-Day Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Starter */}
            <div className="bg-white rounded-3xl p-8 border border-[var(--border)] shadow-md flex flex-col justify-between card-hover relative overflow-hidden">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tier 1 — Small Sheds</span>
                <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{SUBSCRIPTION_PLANS.starter.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{SUBSCRIPTION_PLANS.starter.duration}</p>
                <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900">₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}</span>
                    <span className="text-xs font-bold text-slate-600">/ month</span>
                    <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">{SUBSCRIPTION_PLANS.starter.discountPercent}% OFF</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-slate-200/60">
                    <span className="font-bold text-slate-900">Total: ₨ {SUBSCRIPTION_PLANS.starter.introPrice} (1st month)</span>
                    <span className="font-bold text-emerald-700">Save ₨ {SUBSCRIPTION_PLANS.starter.savingsPKR}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Renews at ₨ {SUBSCRIPTION_PLANS.starter.renewalPrice}/mo after 1st month</p>
                </div>
                <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-8">
                  {SUBSCRIPTION_PLANS.starter.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#249D4A] shrink-0" /> {f}</li>
                  ))}
                </ul>
              </div>
              <Link href="/login?plan=starter" className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs text-center transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
                Choose Starter <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-3xl p-8 border-2 border-[#0B6AB5] shadow-2xl flex flex-col justify-between card-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                {SUBSCRIPTION_PLANS.pro.badge}
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0B6AB5]">Tier 2 — Commercial Dairy</span>
                <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{SUBSCRIPTION_PLANS.pro.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{SUBSCRIPTION_PLANS.pro.duration}</p>
                <div className="my-6 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#0B6AB5]">₨ {SUBSCRIPTION_PLANS.pro.effectiveMonthly}</span>
                    <span className="text-xs font-bold text-[#0B6AB5]">/ month</span>
                    <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">{SUBSCRIPTION_PLANS.pro.discountPercent}% OFF</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-blue-200/60">
                    <span className="font-bold text-blue-900">₨ {SUBSCRIPTION_PLANS.pro.introPrice.toLocaleString()} billed annually</span>
                    <span className="font-black text-emerald-800">Save ₨ {SUBSCRIPTION_PLANS.pro.savingsPKR.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Renews at ₨ {SUBSCRIPTION_PLANS.pro.renewalPrice.toLocaleString()}/yr (~₨ {Math.round(SUBSCRIPTION_PLANS.pro.renewalPrice / 12)}/mo)</p>
                </div>
                <ul className="space-y-3 text-xs font-semibold text-[var(--text-main)] mb-8">
                  {SUBSCRIPTION_PLANS.pro.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#249D4A] shrink-0" /> {f}</li>
                  ))}
                </ul>
              </div>
              <Link href="/login?plan=pro" className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B6AB5] to-[#085491] hover:opacity-95 text-white font-black text-xs text-center shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                Activate Pro Annual <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs text-[var(--text-muted)] font-bold">
            {[
              { icon: Lock, text: 'Paddle PCI-DSS Secure Payments' },
              { icon: ShieldCheck, text: 'Supabase Encrypted Cloud' },
              { icon: Zap, text: 'Instant Account Activation' },
              { icon: BarChart2, text: 'Real-Time P&L Reports' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#0B6AB5]" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Install / Download ── */}
      <section id="download" className="py-16 border-t border-[var(--border)]">
        <div ref={downloadRef} className="reveal max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4 max-w-xl">
            <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider">Install Anywhere</span>
            <h2 className="text-3xl font-black text-[var(--text-main)]">Desktop Software or Android App — No App Store Needed</h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Install directly to Windows with 1-click or add to your Android home screen as an offline-first PWA.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { Icon: Monitor, label: 'Windows PC Software', sub: 'Edge & Chrome 1-Click Install', hover: 'hover:border-[#0B6AB5]', ic: 'text-[#0B6AB5]' },
              { Icon: Smartphone, label: 'Android Phone & Tablet', sub: 'Instant Offline PWA', hover: 'hover:border-[#249D4A]', ic: 'text-[#249D4A]' },
            ].map(({ Icon, label, sub, hover, ic }, i) => (
              <button
                key={i}
                onClick={() => setShowInstallModal(true)}
                className={`flex items-center gap-3 bg-[var(--bg-main)] p-5 rounded-2xl border border-[var(--border)] ${hover} card-hover text-left cursor-pointer transition-all`}
              >
                <Icon className={`w-8 h-8 ${ic} shrink-0`} />
                <div>
                  <p className="text-xs font-bold text-[var(--text-main)]">{label}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-[var(--border)] text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Lactis" className="h-8 w-auto object-contain" />
            <span className="text-slate-600 font-bold">— Next-Gen Dairy Operating System</span>
          </div>
          <div className="flex gap-6 font-bold">
            <Link href="/login" className="hover:text-[var(--text-main)]">Admin Login</Link>
            <Link href="/login" className="hover:text-[var(--text-main)]">Employee Kiosk</Link>
            <a href="#pricing" className="hover:text-[var(--text-main)]">Pricing</a>
          </div>
          <p className="font-semibold">Lactis powered by <strong className="text-[var(--text-main)]">Blazas</strong></p>
        </div>
      </footer>

      <InstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onPromptAccepted={() => setDeferredPrompt(null)}
      />
    </div>
  );
}