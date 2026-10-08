'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, Sparkles, Zap, Lock, ShieldCheck, 
  ArrowRight, AlertCircle, RefreshCw, LogOut, HelpCircle
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, PlanKey } from '@/config/subscription';

import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSubActive, setIsSubActive] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('starter');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const statusParam = searchParams.get('status');
  const orderParam = searchParams.get('order');

  useEffect(() => {
    async function checkAuthAndSub() {
      setLoadingUser(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          // Check profile subscription & trial status
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setProfileData(profile);

            if (profile.subscription_status === 'trial') {
              const now = Date.now();
              const endsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;
              if (endsAt > now) {
                setIsSubActive(true);
                setIsTrialActive(true);
                const remaining = Math.max(1, Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24)));
                setTrialDaysLeft(remaining);
              }
            } else if (profile.subscription_status === 'active') {
              const { data: latestSub } = await supabase
                .from('subscriptions')
                .select('current_period_end, status')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('current_period_end', { ascending: false })
                .limit(1)
                .maybeSingle();

              const isExpired = latestSub?.current_period_end
                ? new Date(latestSub.current_period_end).getTime() <= Date.now()
                : false;

              if (!isExpired) {
                setIsSubActive(true);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Billing auth check error:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuthAndSub();

    // If returning from successful payment, periodically check for webhook activation
    if (statusParam === 'success') {
      const interval = setInterval(async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (prof?.subscription_status === 'active') {
            setIsSubActive(true);
            clearInterval(interval);
          }
        }
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [statusParam, supabase]);

  const handleStartFreeTrial = async () => {
    setIsStartingTrial(true);
    setErrorMessage('');

    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const res = await fetch('/api/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceFingerprint }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to activate 15-day free trial.');
      }

      setIsSubActive(true);
      setIsTrialActive(true);
      router.push(data.redirectUrl || '/portal/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error activating free trial. Please try again.');
      setIsStartingTrial(false);
    }
  };

  const handleProceedToCheckout = async (planId: PlanKey) => {
    if (planId === 'trial') {
      await handleStartFreeTrial();
      return;
    }

    setSelectedPlan(planId);
    setProcessingPlanId(planId);
    setIsRedirecting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.checkoutUrl) {
        throw new Error(data.error || 'Failed to initialize payment gateway checkout session.');
      }

      // External Hosted Gateway Redirect
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to payment processor. Please try again.');
      setIsRedirecting(false);
      setProcessingPlanId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = 'employee_session=; max-age=0; path=/';
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="h-20 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Lactis" className="h-12 sm:h-14 w-auto object-contain" />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0B6AB5]/10 text-[#0B6AB5] border border-[#0B6AB5]/20">
              Billing & Subscriptions
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-bold">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[var(--text-main)] truncate max-w-[150px]">{user.email}</span>
                <button onClick={handleSignOut} className="text-[var(--text-muted)] hover:text-rose-600 ml-1" title="Sign Out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-[#0B6AB5] hover:underline">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Billing Body */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
        {/* Active Subscription Banner */}
        {isSubActive && (
          <div className="max-w-4xl mx-auto p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-black text-base text-emerald-900">
                  {isTrialActive ? `15-Day Free Trial Active (${trialDaysLeft} Days Remaining)` : 'Official Farm Subscription Active'}
                </h4>
                <p className="text-xs text-emerald-700 font-medium">
                  {isTrialActive 
                    ? 'Your farm workspace is completely unlocked with full ERP privileges.' 
                    : 'Your SaaS cloud farm license is fully operational.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/portal/admin/dashboard')}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow active:scale-95 shrink-0"
            >
              Enter Dashboard →
            </button>
          </div>
        )}

        {/* Status Callouts */}
        {statusParam === 'cancelled' && (
          <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Checkout was cancelled. You can select a plan below whenever you are ready.</span>
            </div>
            {orderParam && <span className="font-mono text-[10px] bg-amber-100 px-2 py-0.5 rounded">{orderParam}</span>}
          </div>
        )}

        {statusParam === 'failed' && (
          <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>The payment processor reported an issue completing your transaction. Please try again.</span>
          </div>
        )}

        {statusParam === 'success' && (
          <div className="max-w-3xl mx-auto p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs space-y-3 shadow-md animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-[#249D4A] shrink-0" />
                <div>
                  <h4 className="font-black text-sm text-emerald-900">Payment Processed Successfully!</h4>
                  <p className="text-[11px] text-emerald-700">
                    {isSubActive ? 'Your SaaS farm license is fully activated.' : 'Synchronizing webhook activation with your account...'}
                  </p>
                </div>
              </div>
              {orderParam && (
                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                  {orderParam}
                </span>
              )}
            </div>

            <button
              onClick={() => router.push('/portal/admin/dashboard')}
              className="w-full py-3.5 bg-gradient-to-r from-[#249D4A] to-[#1e823d] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              Enter Farm Command Center & Dashboard →
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title & Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0B6AB5]/10 border border-[#0B6AB5]/20 text-[#0B6AB5] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#249D4A]" />
            Official SaaS Licensing & Free Trial
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-[var(--text-main)]">
            Choose Your <span className="bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] bg-clip-text text-transparent">Farm Workspace Plan</span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-muted)] font-medium max-w-2xl mx-auto leading-relaxed">
            Start risk-free with our 15-Day Free Trial, or select a high-performance commercial plan designed for Pakistani dairy operations.
          </p>
        </div>

        {/* 3 Pricing Cards: 15-Day Trial, Starter Monthly, Farm Pro Annual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {/* PLAN 1: 15-DAY FREE TRIAL */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 border-2 border-emerald-500 shadow-xl flex flex-col justify-between card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-xs">
              {SUBSCRIPTION_PLANS.trial.badge}
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">No Credit Card Required</span>
                <h3 className="text-2xl font-black text-[var(--text-main)]">{SUBSCRIPTION_PLANS.trial.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">{SUBSCRIPTION_PLANS.trial.duration}</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-800">
                    ₨ 0
                  </span>
                  <span className="text-xs font-bold text-emerald-700">/ 15 Days</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[11px] font-black">
                    FREE
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-emerald-200/60">
                  <span className="font-bold text-emerald-900">Total: ₨ 0 for 15 Days</span>
                  <span className="text-emerald-700 font-semibold">1 Trial Per Farm</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Daily online check-in • Full access to all farm features
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <p className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">Included Features:</p>
                <ul className="space-y-2.5">
                  {SUBSCRIPTION_PLANS.trial.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[var(--text-main)] font-medium">
                      <Check className="w-4 h-4 text-[#249D4A] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {profileData?.trial_used ? (
              <button
                disabled
                className="mt-8 w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-xs uppercase tracking-wider border border-gray-300 cursor-not-allowed text-center"
              >
                15-Day Free Trial Already Used
              </button>
            ) : (
              <button
                onClick={handleStartFreeTrial}
                disabled={isStartingTrial || isRedirecting}
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-[#249D4A] to-[#1e823d] hover:opacity-95 text-white font-black text-sm tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isStartingTrial ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Activating Trial...
                  </>
                ) : (
                  <>
                    Start 15-Day Free Trial <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* PLAN 2: STARTER */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] shadow-md flex flex-col justify-between card-hover relative overflow-hidden">
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tier 1 • Small Sheds</span>
                <h3 className="text-2xl font-black text-[var(--text-main)]">{SUBSCRIPTION_PLANS.starter.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">{SUBSCRIPTION_PLANS.starter.duration}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">
                    ₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}
                  </span>
                  <span className="text-xs font-bold text-slate-600">/ month</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[11px] font-black">
                    {SUBSCRIPTION_PLANS.starter.discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-900">Total: ₨ {SUBSCRIPTION_PLANS.starter.introPrice} (1st month)</span>
                  <span className="font-bold text-emerald-700">Save ₨ {SUBSCRIPTION_PLANS.starter.savingsPKR}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Renews at ₨ {SUBSCRIPTION_PLANS.starter.renewalPrice}/mo after 1st month
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <p className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">Included Features:</p>
                <ul className="space-y-2.5">
                  {SUBSCRIPTION_PLANS.starter.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[var(--text-main)] font-medium">
                      <Check className="w-4 h-4 text-[#249D4A] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleProceedToCheckout('starter')}
              disabled={isRedirecting}
              className="mt-8 w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs tracking-wider shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {processingPlanId === 'starter' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting to Paddle...
                </>
              ) : (
                <>
                  Proceed to Checkout (₨ {SUBSCRIPTION_PLANS.starter.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.starter.introPrice}) <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* PLAN 3: PRO */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 border-2 border-[#0B6AB5] shadow-2xl flex flex-col justify-between card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] text-white text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-bl-2xl shadow-sm">
              {SUBSCRIPTION_PLANS.pro.badge}
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0B6AB5]">Tier 2 • Commercial Dairy</span>
                <h3 className="text-2xl font-black text-[var(--text-main)]">{SUBSCRIPTION_PLANS.pro.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">{SUBSCRIPTION_PLANS.pro.duration}</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-[#0B6AB5]">
                    ₨ {SUBSCRIPTION_PLANS.pro.effectiveMonthly}
                  </span>
                  <span className="text-xs font-bold text-[#0B6AB5]">/ month</span>
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#249D4A] text-white text-[11px] font-black">
                    {SUBSCRIPTION_PLANS.pro.discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-1 border-t border-blue-200/60">
                  <span className="font-bold text-blue-900">Total: ₨ {SUBSCRIPTION_PLANS.pro.introPrice.toLocaleString()} billed annually</span>
                  <span className="font-black text-emerald-800">Save ₨ {SUBSCRIPTION_PLANS.pro.savingsPKR.toLocaleString()}!</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Renews at ₨ {SUBSCRIPTION_PLANS.pro.renewalPrice.toLocaleString()}/yr (~₨ {Math.round(SUBSCRIPTION_PLANS.pro.renewalPrice / 12)}/mo)
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <p className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">Everything in Starter, plus:</p>
                <ul className="space-y-2.5">
                  {SUBSCRIPTION_PLANS.pro.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[var(--text-main)] font-semibold">
                      <Check className="w-4 h-4 text-[#249D4A] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleProceedToCheckout('pro')}
              disabled={isRedirecting}
              className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B6AB5] to-[#085491] hover:opacity-95 text-white font-black text-sm tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {processingPlanId === 'pro' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting to Paddle...
                </>
              ) : (
                <>
                  Proceed to Checkout (₨ {SUBSCRIPTION_PLANS.pro.effectiveMonthly}/mo • Total ₨ {SUBSCRIPTION_PLANS.pro.introPrice.toLocaleString()}) <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security strip */}
        <div className="max-w-4xl mx-auto p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] luxury-shadow grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[var(--text-muted)]">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#0B6AB5] shrink-0" />
            <div>
              <p className="font-black text-[var(--text-main)]">Paddle Global Billing</p>
              <p className="mt-0.5">PCI-DSS Level 1 secure payments supporting Visa, Mastercard, Apple Pay, Google Pay & PayPal.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#249D4A] shrink-0" />
            <div>
              <p className="font-black text-[var(--text-main)]">Instant Webhook Sync</p>
              <p className="mt-0.5">Your license activates automatically upon verified server settlement.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-black text-[var(--text-main)]">Dairy Farm Support</p>
              <p className="mt-0.5">Direct phone & WhatsApp assistance available anytime.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[var(--border)] text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold">
            <img src="/logo.svg" alt="Lactis" className="h-7 w-auto object-contain" />
            <span className="text-slate-600 font-bold">• SaaS Operating System</span>
          </div>
          <p className="font-semibold">Lactis powered by <strong className="text-[var(--text-main)]">Blazas</strong></p>
        </div>
      </footer>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0B6AB5]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading Billing Plans...
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
