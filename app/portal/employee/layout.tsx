import Link from 'next/link';
import { Milk, Activity, LogOut } from 'lucide-react';
import SyncAndInstallHeader from '@/components/SyncAndInstallHeader';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-85 transition-opacity">
            <img src="/logo.svg" alt="Lactis" className="h-12 w-auto object-contain" />
          </Link>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
            Employee Station
          </span>
        </div>
        
        <SyncAndInstallHeader />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--bg-card)]/50">
        <p>Lactis powered by <strong className="text-[var(--text-main)]">Blazas</strong></p>
      </footer>

      {/* Bottom Navigation for Mobile / Tablet Kiosk */}
      <nav className="bg-[var(--bg-card)] border-t border-[var(--border)] p-4 flex gap-4 sm:hidden pb-safe">
        <Link href="/portal/employee/milking" className="flex-1 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-3 flex flex-col items-center gap-1 text-[var(--primary)]">
          <Milk className="w-6 h-6" />
          <span className="text-xs font-bold">Milking</span>
        </Link>
        <Link href="/portal/employee/medical" className="flex-1 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-3 flex flex-col items-center gap-1 text-[var(--accent)]">
          <Activity className="w-6 h-6" />
          <span className="text-xs font-bold">Medical</span>
        </Link>
      </nav>
    </div>
  )
}
