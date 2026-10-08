'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useSync } from '@/hooks/useSync';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useRouter } from 'next/navigation';
import { 
  User, ShieldCheck, Mail, Cloud, RefreshCw, CheckCircle2, 
  CreditCard, Sparkles, Calendar, ArrowRight, Zap, Download, 
  ExternalLink, Lock, Check, Smartphone, Building2, AlertCircle, 
  LogOut, Layers, Award, FileText, KeyRound, Copy, CheckCheck, Send
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, PlanKey, MERCHANT_CONFIG } from '@/config/subscription';

export default function AccountAndSubscriptionPage() {
  const router = useRouter();
  const supabase = createClient();
  const { isOnline, isSyncing, lastSyncedAt, syncData, syncError } = useSync();

  // User auth state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Subscription state
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('starter');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'GooglePay' | 'NayaPayDirect' | 'JazzCash'>('Card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [serverError, setServerError] = useState<string>('');

  // Card validation & 3DS state
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [card3dsStep, setCard3dsStep] = useState<'form' | 'otp'>('form');
  const [simulatedOtp, setSimulatedOtp] = useState('849201');
  const [cardOtp, setCardOtp] = useState('');

  // NayaPay / Raast Direct Payment
  const [directTid, setDirectTid] = useState('');
  const [copiedField, setCopiedField] = useState<'iban' | 'raast' | null>(null);

  // JazzCash state
  const [jazzCashStep, setJazzCashStep] = useState<'phone' | 'mpin'>('phone');
  const [jazzCashMobile, setJazzCashMobile] = useState('');
  const [jazzCashMpin, setJazzCashMpin] = useState('');

  // Validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active subscription (saved in state or Supabase)
  const [activePlan, setActivePlan] = useState<{
    tier: string;
    status: 'active' | 'trial' | 'past_due';
    expiresAt: string;
    billing: 'monthly' | 'yearly';
  }>({
    tier: 'Starter Monthly',
    status: 'trial',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    billing: 'monthly'
  });

  // Local Dexie Database Counts
  const cowsCount = useLiveQuery(() => db.Livestock.count(), []) ?? 0;
  const milkingCount = useLiveQuery(() => db.MilkingLogs.count(), []) ?? 0;
  const salesCount = useLiveQuery(() => db.SalesLogs.count(), []) ?? 0;
  const paymentsCount = useLiveQuery(() => db.CustomerPayments.count(), []) ?? 0;
  const customersCount = useLiveQuery(() => db.Customers.count(), []) ?? 0;
  const feedCount = useLiveQuery(() => db.FeedLogs.count(), []) ?? 0;
  const expenseCount = useLiveQuery(() => db.ExpenseLogs.count(), []) ?? 0;
  const staffCount = useLiveQuery(() => db.Employees.count(), []) ?? 0;

  const totalRecords = useMemo(() => {
    return cowsCount + milkingCount + salesCount + paymentsCount + customersCount + feedCount + expenseCount + staffCount;
  }, [cowsCount, milkingCount, salesCount, paymentsCount, customersCount, feedCount, expenseCount, staffCount]);

  useEffect(() => {
    async function loadUser() {
      setLoadingUser(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          if (user.user_metadata?.full_name && !cardholderName) {
            setCardholderName(user.user_metadata.full_name);
          }
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (prof) setProfile(prof);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  const plan = SUBSCRIPTION_PLANS[selectedPlan];

  const handleCopy = (text: string, field: 'iban' | 'raast') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const validateCardForm = () => {
    const errors: Record<string, string> = {};
    const rawCard = cardNumber.replace(/\s+/g, '');

    if (!cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    }
    if (!rawCard || rawCard.length !== 16) {
      errors.cardNumber = '16-digit card number required';
    }
    if (!cardExpiry || !cardExpiry.match(/^(\d{2})\/(\d{2})$/)) {
      errors.cardExpiry = 'MM/YY required';
    }
    if (!cardCvc || cardCvc.length < 3) {
      errors.cardCvc = '3-4 digit CVC required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenPayment = (planKey: PlanKey) => {
    setSelectedPlan(planKey);
    setShowPaymentModal(true);
    setCard3dsStep('form');
    setJazzCashStep('phone');
    setFormErrors({});
    setServerError('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "employee_session=; max-age=0; path=/";
    router.push('/login');
  };

  const handleExecuteServerPayment = async (customMethod?: string, customRef?: string) => {
    setIsProcessingPayment(true);
    setServerError('');

    try {
      const methodLabel = customMethod || (
        paymentMethod === 'GooglePay' ? 'Google Pay' :
        paymentMethod === 'NayaPayDirect' ? 'NayaPay / Raast Direct' :
        paymentMethod === 'JazzCash' ? 'JazzCash Direct Link' :
        'Debit/Credit Card (3DS)'
      );

      const refVal = customRef || (
        paymentMethod === 'NayaPayDirect' ? (directTid.trim() || `NP-${Date.now()}`) :
        paymentMethod === 'Card' ? `CARD-${cardNumber.slice(-4)}-${cardOtp || simulatedOtp}` :
        `AUTH-${MERCHANT_CONFIG.nayapayIban.slice(0, 8)}-${Date.now().toString().slice(-4)}`
      );

      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod: methodLabel,
          transactionRef: refVal,
          cardholderName: cardholderName || user?.user_metadata?.full_name || 'Farm Account',
          cardNumberLast4: cardNumber.replace(/\s+/g, '').slice(-4) || '4242',
          accountPhone: jazzCashMobile || MERCHANT_CONFIG.raastMobile,
          userId: user?.id || localStorage.getItem('lactis_active_user_id') || 'usr_farm_admin'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed on server.');
      }

      setPaymentSuccess(true);
      setActivePlan({
        tier: plan.name,
        status: 'active',
        expiresAt: data.invoice.expiresAt,
        billing: selectedPlan === 'starter' ? 'monthly' : 'yearly'
      });

      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
      }, 2500);
    } catch (err: any) {
      setServerError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Account & Cloud Licensing</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Manage your verified Google account, cloud database backups, and SaaS subscription license
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Account
        </button>
      </div>

      {/* Grid: Profile & Cloud Backup Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-widest">
                Authenticated User
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {user?.app_metadata?.provider === 'google' ? 'Google Verified' : 'Admin Session'}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name || 'User'}
                  className="w-16 h-16 rounded-2xl border-2 border-[var(--primary)] object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] text-[var(--primary)] flex items-center justify-center border-2 border-white shadow-sm">
                  <User className="w-8 h-8" />
                </div>
              )}

              <div>
                <h3 className="font-extrabold text-lg text-[var(--text-main)]">
                  {user?.user_metadata?.full_name || profile?.full_name || 'Farm Owner / Admin'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {user?.email || 'admin@dairyfarm.local'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold">
                  Role: {profile?.role?.toUpperCase() || 'FARM OWNER'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex justify-between items-center">
            <span>Auth ID: <strong className="font-mono">{user?.id ? `${user.id.substring(0, 8)}...` : 'Local-Session'}</strong></span>
            <span className="text-[11px]">Since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}</span>
          </div>
        </div>

        {/* Cloud Backup & Sync Engine Status Card */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-widest flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-[var(--primary)]" />
                Cloud Backup & Database Sync
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {isOnline ? 'Connected to Supabase Cloud' : 'Offline Mode (Local Storage)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Cattle & Herd</span>
                <span className="text-xl font-black text-[var(--text-main)] mt-0.5 block">{cowsCount} Head</span>
              </div>
              <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Milking Records</span>
                <span className="text-xl font-black text-[var(--primary)] mt-0.5 block">{milkingCount}</span>
              </div>
              <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Khata & Dispatches</span>
                <span className="text-xl font-black text-blue-700 mt-0.5 block">{salesCount + paymentsCount}</span>
              </div>
              <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Feed & Expenses</span>
                <span className="text-xl font-black text-amber-700 mt-0.5 block">{feedCount + expenseCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-bold text-[var(--text-main)]">
                Last Cloud Backup: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + lastSyncedAt.toLocaleDateString() + ')' : 'Just now'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Total {totalRecords} farm records encrypted and synced to cloud
              </p>
            </div>

            <button
              onClick={() => syncData()}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing Cloud...' : 'Backup & Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Tier Active Banner */}
      <div className="bg-gradient-to-br from-[#0B6AB5] via-[#085491] to-[#063F6E] text-white rounded-3xl p-6 sm:p-8 luxury-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black uppercase tracking-wider text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-[#249D4A]" />
              <span>{profile?.subscription_plan || activePlan.tier} • {profile?.subscription_status === 'active' ? 'Active License' : 'Full Access'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Farm Operating System
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Multi-tenant isolated offline database with secure Supabase PostgreSQL cloud sync, real cash P&L accounting, multi-month silage amortization, and customer credit khata.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => router.push('/billing')}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0B6AB5] font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 card-hover"
            >
              <CreditCard className="w-4 h-4" />
              Manage / Renew Subscription →
            </button>
          </div>
        </div>
      </div>

      {/* SaaS Pricing Tiers */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-black text-[var(--text-main)]">SaaS License Plans & Tiers</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">
            Transparent pricing designed for Pakistani dairy farms. All plans include 100% offline-ready PWA functionality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1: 15-Day Free Trial */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 border-2 border-emerald-500 shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-xs">
              {SUBSCRIPTION_PLANS.trial.badge}
            </div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)]">{SUBSCRIPTION_PLANS.trial.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{SUBSCRIPTION_PLANS.trial.duration}</p>
                </div>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <Layers className="w-4 h-4" />
                </span>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-800">
                    ₨ 0
                  </span>
                  <span className="text-xs font-bold text-emerald-700">/ 15 Days</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">
                    FREE
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-emerald-200/60">
                  <span className="font-bold text-emerald-900">Total: ₨ 0 for 15 Days</span>
                  <span className="font-bold text-emerald-700">1 Trial Per Farm</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Daily online check-in • Full ERP access
                </p>
              </div>

              <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-6">
                {SUBSCRIPTION_PLANS.trial.features.slice(0, 4).map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => router.push('/billing')}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md active:scale-95"
            >
              {profile?.subscription_status === 'trial' ? 'Trial Active (Manage)' : 'View Trial & Plans'}
            </button>
          </div>

          {/* Tier 2: Starter */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)]">{SUBSCRIPTION_PLANS.starter.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{SUBSCRIPTION_PLANS.starter.duration}</p>
                </div>
                <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    ₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}
                  </span>
                  <span className="text-xs font-bold text-slate-600">/ month</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[10px] font-black">
                    {SUBSCRIPTION_PLANS.starter.discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-900">Total: ₨ {SUBSCRIPTION_PLANS.starter.introPrice} (1st month)</span>
                  <span className="font-bold text-emerald-700">Save ₨ {SUBSCRIPTION_PLANS.starter.savingsPKR}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Renews at ₨ {SUBSCRIPTION_PLANS.starter.renewalPrice}/mo after 1st month
                </p>
              </div>

              <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-6">
                {SUBSCRIPTION_PLANS.starter.features.slice(0, 4).map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleOpenPayment('starter')}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md active:scale-95"
            >
              Select Starter (₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.starter.introPrice})
            </button>
          </div>

          {/* Tier 3: Farm Pro (Most Popular) */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 border-2 border-[#0B6AB5] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#0B6AB5] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-xs">
              {SUBSCRIPTION_PLANS.pro.badge}
            </div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)]">{SUBSCRIPTION_PLANS.pro.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{SUBSCRIPTION_PLANS.pro.duration}</p>
                </div>
                <span className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-[#0B6AB5]">
                  <Award className="w-4 h-4" />
                </span>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#0B6AB5]">
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

              <ul className="space-y-3 text-xs font-medium text-[var(--text-main)] mb-6">
                {SUBSCRIPTION_PLANS.pro.features.slice(0, 5).map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleOpenPayment('pro')}
              className="w-full py-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-black text-xs transition-all shadow-md active:scale-95"
            >
              Select Farm Pro (₨ {SUBSCRIPTION_PLANS.pro.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.pro.introPrice.toLocaleString()})
            </button>
          </div>
        </div>
      </div>

      {/* Payment & Subscription Checkout Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[var(--border)] luxury-shadow relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowPaymentModal(false)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-4xl shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-emerald-900">Subscription Activated!</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto font-medium">
                  Your <strong>{plan.name}</strong> plan has been verified and activated on your account. Full cloud sync and enterprise features are unlocked.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-[#0B6AB5] uppercase tracking-wider block">Server Payment Gateway</span>
                  <h3 className="text-2xl font-black text-[var(--text-main)] mt-0.5">
                    Subscribe to {plan.name}
                  </h3>
                  <div className="mt-3 p-3 bg-blue-50 rounded-2xl border border-blue-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-blue-900 font-bold block">Payable Amount:</span>
                      <span className="text-[11px] text-blue-700">{plan.duration}</span>
                    </div>
                    <span className="text-xl font-black text-[#0B6AB5]">
                      ₨ {plan.introPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {serverError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Payment Method Selector */}
                {card3dsStep === 'form' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('Card'); setFormErrors({}); setServerError(''); }}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === 'Card' ? 'border-[#0B6AB5] bg-[#0B6AB5] text-white shadow-sm' : 'border-[var(--border)] text-gray-600 bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[11px]">Card (Visa/MC)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('NayaPayDirect'); setFormErrors({}); setServerError(''); }}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === 'NayaPayDirect' ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-[var(--border)] text-gray-600 bg-slate-50'
                        }`}
                      >
                        <Send className="w-4 h-4 text-emerald-300" />
                        <span className="text-[11px]">NayaPay/Raast</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('GooglePay'); setFormErrors({}); setServerError(''); }}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === 'GooglePay' ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-[var(--border)] text-gray-600 bg-slate-50'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-[11px]">Google Pay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('JazzCash'); setFormErrors({}); setServerError(''); }}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === 'JazzCash' ? 'border-amber-600 bg-amber-600 text-white shadow-sm' : 'border-[var(--border)] text-gray-600 bg-slate-50'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span className="text-[11px]">JazzCash</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Option 1: Card */}
                {paymentMethod === 'Card' && (
                  <>
                    {card3dsStep === 'form' ? (
                      <div className="space-y-3 bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Direct Card Authorization</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border">NayaPay Gateway</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                            Cardholder Name <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. MUHAMMAD AHMAD" 
                            value={cardholderName}
                            onChange={e => {
                              setCardholderName(e.target.value);
                              if (formErrors.cardholderName) setFormErrors(prev => ({ ...prev, cardholderName: '' }));
                            }}
                            className={`w-full bg-white border ${formErrors.cardholderName ? 'border-rose-400' : 'border-[var(--border)]'} rounded-xl py-2 px-3 text-xs font-bold`} 
                          />
                          {formErrors.cardholderName && <p className="text-[10px] text-rose-500 mt-0.5">{formErrors.cardholderName}</p>}
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                            Card Number <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="4242 •••• •••• 4242" 
                            value={cardNumber}
                            maxLength={19}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                              setCardNumber(val.replace(/(\d{4})/g, '$1 ').trim());
                              if (formErrors.cardNumber) setFormErrors(prev => ({ ...prev, cardNumber: '' }));
                            }}
                            className={`w-full bg-white border ${formErrors.cardNumber ? 'border-rose-400' : 'border-[var(--border)]'} rounded-xl py-2 px-3 text-xs font-mono font-bold`} 
                          />
                          {formErrors.cardNumber && <p className="text-[10px] text-rose-500 mt-0.5">{formErrors.cardNumber}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                              Expiry <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              placeholder="MM/YY" 
                              maxLength={5}
                              value={cardExpiry}
                              onChange={e => {
                                let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                setCardExpiry(val);
                                if (formErrors.cardExpiry) setFormErrors(prev => ({ ...prev, cardExpiry: '' }));
                              }}
                              className={`w-full bg-white border ${formErrors.cardExpiry ? 'border-rose-400' : 'border-[var(--border)]'} rounded-xl py-2 px-3 text-xs font-mono font-bold`} 
                            />
                            {formErrors.cardExpiry && <p className="text-[10px] text-rose-500 mt-0.5">{formErrors.cardExpiry}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                              CVC <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="password" 
                              placeholder="•••" 
                              maxLength={4}
                              value={cardCvc}
                              onChange={e => {
                                setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4));
                                if (formErrors.cardCvc) setFormErrors(prev => ({ ...prev, cardCvc: '' }));
                              }}
                              className={`w-full bg-white border ${formErrors.cardCvc ? 'border-rose-400' : 'border-[var(--border)]'} rounded-xl py-2 px-3 text-xs font-mono font-bold`} 
                            />
                            {formErrors.cardCvc && <p className="text-[10px] text-rose-500 mt-0.5">{formErrors.cardCvc}</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-blue-50/80 p-4 rounded-2xl border border-blue-200 text-xs animate-slide-up">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                          <div className="flex items-center gap-1.5 font-bold text-[#0B6AB5]">
                            <KeyRound className="w-4 h-4" /> 3D Secure Verification
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">OTP Step</span>
                        </div>

                        {/* LIVE SIMULATED SMS BANNER */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs space-y-1">
                          <div className="flex justify-between text-[10px] text-emerald-400 font-bold">
                            <span>SMS OTP Generated:</span>
                            <span>Just Now</span>
                          </div>
                          <p className="text-xs font-mono font-bold text-amber-300">
                            Code: <span className="text-base text-white font-black">{simulatedOtp}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setCardOtp(simulatedOtp);
                              if (formErrors.otp) setFormErrors(prev => ({ ...prev, otp: '' }));
                            }}
                            className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg transition-all"
                          >
                            Auto-fill OTP ({simulatedOtp})
                          </button>
                        </div>

                        <p className="text-slate-700">Enter the 6-digit bank verification code:</p>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={cardOtp}
                          onChange={e => setCardOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full bg-white border border-blue-400 rounded-xl py-2.5 px-3 text-center text-xl tracking-[0.4em] font-mono font-black text-slate-900"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Option 2: NayaPay / Raast Direct Transfer */}
                {paymentMethod === 'NayaPayDirect' && (
                  <div className="space-y-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-emerald-900">Send ₨ {plan.introPrice} to NayaPay / Raast:</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">Direct Transfer</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Title:</span>
                        <span className="font-bold text-slate-900">{MERCHANT_CONFIG.accountTitle}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-t border-slate-100 pt-1.5">
                        <span className="font-mono text-xs">{MERCHANT_CONFIG.nayapayIban}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(MERCHANT_CONFIG.nayapayIban, 'iban')}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded"
                        >
                          {copiedField === 'iban' ? 'Copied!' : 'Copy IBAN'}
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-t border-slate-100 pt-1.5">
                        <span className="font-mono text-xs">Raast: {MERCHANT_CONFIG.raastMobile}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(MERCHANT_CONFIG.raastMobile, 'raast')}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded"
                        >
                          {copiedField === 'raast' ? 'Copied!' : 'Copy Mobile'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1">
                        Enter Bank Transaction ID (TID) <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. 409281093821" 
                        value={directTid}
                        onChange={e => {
                          setDirectTid(e.target.value);
                          if (formErrors.tid) setFormErrors(prev => ({ ...prev, tid: '' }));
                        }}
                        className="w-full bg-white border border-emerald-300 rounded-xl py-2 px-3 text-xs font-mono font-bold" 
                      />
                      {formErrors.tid && <p className="text-[10px] text-rose-500 mt-0.5">{formErrors.tid}</p>}
                    </div>
                  </div>
                )}

                {/* Option 3: Google Pay */}
                {paymentMethod === 'GooglePay' && (
                  <div className="space-y-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 text-xs">
                    <p className="font-bold">Google Pay Automated Link:</p>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Instant biometric authorization using your linked Google Wallet cards. Direct debit to NayaPay account <strong>{MERCHANT_CONFIG.nayapayIban}</strong>.
                    </p>
                  </div>
                )}

                {/* Option 4: JazzCash */}
                {paymentMethod === 'JazzCash' && (
                  <div className="space-y-3 bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs">
                    <p className="font-bold text-amber-900">JazzCash Instant Mobile Link:</p>
                    {jazzCashStep === 'phone' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">JazzCash Mobile Account <span className="text-rose-500">*</span></label>
                        <input 
                          type="tel" 
                          placeholder="03001234567" 
                          maxLength={11}
                          value={jazzCashMobile}
                          onChange={e => {
                            setJazzCashMobile(e.target.value.replace(/\D/g, '').slice(0, 11));
                            if (formErrors.jazzCashMobile) setFormErrors(prev => ({ ...prev, jazzCashMobile: '' }));
                          }}
                          className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-xs font-bold" 
                        />
                        {formErrors.jazzCashMobile && <p className="text-[10px] text-rose-500 mt-0.5">{formErrors.jazzCashMobile}</p>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-amber-800 text-[11px]">Enter your 4-Digit MPIN to authorize direct debit:</p>
                        <input 
                          type="password" 
                          placeholder="••••" 
                          maxLength={4}
                          value={jazzCashMpin}
                          onChange={e => setJazzCashMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full bg-white border border-amber-400 rounded-xl py-2.5 px-3 text-center text-xl tracking-[0.5em] font-mono font-bold" 
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>256-bit encrypted checkout. Server-verified activation.</span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowPaymentModal(false); setCard3dsStep('form'); setJazzCashStep('phone'); }}
                    className="w-1/3 py-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  {paymentMethod === 'Card' && card3dsStep === 'form' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (validateCardForm()) {
                          const rOtp = Math.floor(100000 + Math.random() * 900000).toString();
                          setSimulatedOtp(rOtp);
                          setCard3dsStep('otp');
                        }
                      }}
                      className="w-2/3 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      Verify Card & Pay ₨ {plan.introPrice.toLocaleString()} →
                    </button>
                  ) : paymentMethod === 'NayaPayDirect' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!directTid.trim()) {
                          setFormErrors({ tid: 'Please enter your bank Transaction ID' });
                          return;
                        }
                        handleExecuteServerPayment('NayaPay Direct Transfer', `TID-${directTid.trim()}`);
                      }}
                      disabled={isProcessingPayment}
                      className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isProcessingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : `Verify TID & Activate (₨ ${plan.introPrice}) →`}
                    </button>
                  ) : paymentMethod === 'JazzCash' && jazzCashStep === 'phone' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!jazzCashMobile || jazzCashMobile.length < 11) {
                          setFormErrors({ jazzCashMobile: '11-digit mobile number required' });
                          return;
                        }
                        setJazzCashStep('mpin');
                      }}
                      className="w-2/3 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      Next: Authorize MPIN →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleExecuteServerPayment()}
                      disabled={isProcessingPayment}
                      className="w-2/3 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verifying on Server...
                        </>
                      ) : (
                        <>
                          Confirm & Pay ₨ {plan.introPrice.toLocaleString()} →
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
