'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { 
  Building2, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, RefreshCw, User, Shield 
} from 'lucide-react';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [ownerName, setOwnerName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [deviceFp, setDeviceFp] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadAuthUser() {
      setLoadingUser(true);
      try {
        // Compute device fingerprint in background
        getDeviceFingerprint().then(fp => setDeviceFp(fp));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);

        // Pre-fill owner name from Google Metadata if available
        const defaultName = 
          user.user_metadata?.full_name || 
          user.user_metadata?.name || 
          user.email?.split('@')[0] || '';
        if (defaultName) setOwnerName(defaultName);

        // Check if profile already completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, farm_name, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.farm_name && profile?.full_name) {
          if (profile.subscription_status === 'active' || profile.subscription_status === 'trial') {
            router.push('/portal/admin/dashboard');
          } else {
            router.push('/billing');
          }
        }
      } catch (err) {
        console.warn('Onboarding user check note:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadAuthUser();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!ownerName.trim()) {
      setErrorMsg('Please enter the Farm Owner / Manager Name.');
      return;
    }
    if (!farmName.trim()) {
      setErrorMsg('Please enter your Farm / Dairy Name.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure fingerprint is ready
      const fingerprint = deviceFp || (await getDeviceFingerprint());

      const res = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          farmName: farmName.trim(),
          deviceFingerprint: fingerprint,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save farm workspace profile.');
      }

      setSuccessMsg('Farm workspace profile configured successfully. Redirecting to license setup...');
      setTimeout(() => {
        router.push(data.redirectUrl || '/billing');
      }, 600);
    } catch (err: any) {
      console.error('Onboarding submit error:', err);
      setErrorMsg(err.message || 'An error occurred while saving your profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-muted)]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0B6AB5]" />
          Preparing your farm workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col justify-between p-4 sm:p-6 text-[var(--text-main)] font-sans">
      {/* Top Bar */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between pt-2">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Lactis Logo" className="h-10 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Step 1: Farm Onboarding
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-xl w-full mx-auto my-auto bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] luxury-shadow space-y-6 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B6AB5] to-[#249D4A] text-white flex items-center justify-center mx-auto shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-main)]">
            Setup Your Farm Profile
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium max-w-md mx-auto">
            Enter your farm and owner identity to configure your dedicated cloud database and unlock your <strong>15-Day Free Trial</strong>.
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl font-bold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* 1-Step Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Farm Owner / Manager Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="e.g. Muhammad Ahmad"
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Farm / Dairy Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={farmName}
                onChange={e => setFarmName(e.target.value)}
                placeholder="e.g. Al-Madina Cattle & Dairy Farm"
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Shield className="w-3.5 h-3.5 text-[#0B6AB5]" />
              Multi-Device Hardware Security
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Your workspace hardware signature is secured. Each farm and device is eligible for one comprehensive 15-Day Free Trial.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] hover:opacity-95 text-white font-black text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Configuring Workspace...
              </>
            ) : (
              <>
                Continue to Workspace Plans <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[var(--text-muted)]">
        Lactis Cloud Farm OS • Secure Multi-Tenant Architecture
      </footer>
    </div>
  );
}

