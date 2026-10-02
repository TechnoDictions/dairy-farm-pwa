import Link from 'next/link';
import { Milk, Activity } from 'lucide-react';

export default function EmployeeDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Welcome to Shift</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Select an operation to begin data entry.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link href="/portal/employee/milking" className="bg-white rounded-3xl p-8 border-2 border-transparent hover:border-[var(--primary)] shadow-md hover:shadow-xl transition-all group active:scale-95 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-green-50 text-[var(--primary)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Milk className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Batch Milking</h2>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Fast multi-cow entry</p>
          </div>
        </Link>

        <Link href="/portal/employee/medical" className="bg-white rounded-3xl p-8 border-2 border-transparent hover:border-orange-500 shadow-md hover:shadow-xl transition-all group active:scale-95 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Medical Log</h2>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Record treatments</p>
          </div>
        </Link>

        <Link href="/portal/employee/tasks" className="bg-white rounded-3xl p-8 border-2 border-transparent hover:border-red-500 shadow-md hover:shadow-xl transition-all group active:scale-95 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-10 h-10" /> {/* Should ideally use Syringe or CheckSquare, but Activity works for now as it's imported */}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Daily Tasks</h2>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Vaccinations & Checklist</p>
          </div>
        </Link>
      </div>
      
      {/* Network Status Indicator placeholder - would ideally be tied to useSync hook */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <div>
            <p className="text-sm font-bold text-[var(--text-main)]">System Online</p>
            <p className="text-xs text-[var(--text-muted)]">Data is automatically syncing to the cloud.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
