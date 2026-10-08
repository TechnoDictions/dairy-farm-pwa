'use client';

import { useState, useEffect } from 'react';
import { useSync } from '../hooks/useSync';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Cloud, CloudOff, RefreshCw, Download, Monitor, Smartphone, 
  X, CheckCircle2, ShieldCheck, LogOut, Sparkles, AlertCircle, 
  User, CreditCard 
} from 'lucide-react';
import InstallModal from './InstallModal';

export default function SyncAndInstallHeader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { isOnline, isSyncing, lastSyncedAt, syncData, syncError } = useSync();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);

    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null);
          setUserAvatar(user.user_metadata?.avatar_url || null);
        }
      } catch (e) {
        console.warn('Auth user fetch in header:', e);
      }
    }
    getUser();

    // Capture PWA install prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    setShowInstallModal(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "employee_session=; max-age=0; path=/";
    router.push('/login');
  };

  // Prevent SSR Hydration mismatch by rendering a stable placeholder before mounting
  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="hidden sm:inline">Connecting...</span>
        </div>

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Install App</span>
        </button>

        <div className="p-2 text-gray-400">
          <LogOut className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Sync Status Button */}
        <button
          onClick={() => syncData()}
          disabled={isSyncing || !isOnline}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            !isOnline 
              ? 'bg-amber-50 text-amber-800 border-amber-200 cursor-not-allowed'
              : isSyncing 
              ? 'bg-blue-50 text-blue-800 border-blue-200' 
              : 'bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--border)] hover:border-[var(--primary)]'
          }`}
          title={isOnline ? 'Tap to trigger instant cloud sync' : 'Currently offline'}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          ) : isOnline ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-amber-600" />
          )}

          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : isOnline ? 'Cloud Synced' : 'Offline Mode'}
          </span>
        </button>

        {/* Install App Button */}
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 border border-[var(--primary)]/20 transition-colors shadow-2xs cursor-pointer"
          title="Install as Android APK or Windows Desktop App"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Install App</span>
        </button>

        {/* Account & SaaS Plan Profile Button */}
        <Link
          href="/portal/admin/account"
          className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--bg-main)] hover:bg-gray-100 border border-[var(--border)] transition-colors group"
          title="Manage Account, Backups & SaaS Subscription"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="Avatar" className="w-6 h-6 rounded-lg object-cover border border-[var(--primary)]" />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-[var(--accent-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="text-left hidden lg:block">
            <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] block leading-tight truncate max-w-[120px]">
              {userName || 'Account'}
            </span>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
              SaaS Active License
            </span>
          </div>
        </Link>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* App Install Modal (Windows, Android & iOS Multi-Platform Guide) */}
      <InstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onPromptAccepted={() => {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }}
      />
    </>
  );
}
