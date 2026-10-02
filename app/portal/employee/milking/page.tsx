'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../db/db';
import { ArrowLeft, CheckCircle2, Search, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function BatchMilkingEntry() {
  const [success, setSuccess] = useState(false);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'Today' | 'Week' | 'Month' | 'Year'>('Week');

  // Get all female cows (not just lactating, so they can enter dry cows to lactating, or if they just want to see all females)
  const cows = useLiveQuery(
    () => db.Livestock.filter(cow => cow.gender !== 'Male').toArray(),
    []
  );

  const logs = useLiveQuery(() => db.MilkingLogs.toArray(), []);

  // Sort by highest yield in selected period
  const sortedCows = useMemo(() => {
    if (!cows || !logs) return [];
    
    const now = new Date();
    let cutoff = new Date(0);
    
    if (period === 'Today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'Week') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'Month') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'Year') {
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const yieldMap: Record<string, number> = {};
    logs.forEach(log => {
      if (new Date(log.timestamp) >= cutoff) {
        if (!yieldMap[log.tag]) yieldMap[log.tag] = 0;
        yieldMap[log.tag] += log.yieldLiters;
      }
    });

    const cowsWithYield = cows.map(cow => {
      return { ...cow, periodYield: yieldMap[cow.tag] || 0 };
    });

    let filtered = cowsWithYield;
    if (search) {
      filtered = cowsWithYield.filter(c => c.tag.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()));
    }

    return filtered.sort((a, b) => b.periodYield - a.periodYield);
  }, [cows, logs, search, period]);

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    const logsToSave = [];

    for (const [tag, yieldStr] of Object.entries(entries)) {
      if (yieldStr && parseFloat(yieldStr) > 0) {
        logsToSave.push({
          tag,
          yieldLiters: parseFloat(yieldStr),
          timestamp,
          isSynced: false
        });
        
        // Auto-status
        const cowToUpdate = await db.Livestock.where('tag').equals(tag).first();
        if (cowToUpdate) {
          const currentStatus = (cowToUpdate.status || '').toLowerCase();
          if (currentStatus !== 'pregnant' && currentStatus !== 'colostrum') {
            const newStatus = parseFloat(yieldStr) > 0 ? 'Lactating' : 'Dry';
            if (currentStatus !== newStatus.toLowerCase()) {
              await db.Livestock.update(cowToUpdate.id!, { status: newStatus as any });
            }
          }
        }
      } else if (yieldStr && parseFloat(yieldStr) === 0) {
        // Explicitly entered 0, update to Dry if not pregnant/colostrum
        logsToSave.push({
          tag,
          yieldLiters: 0,
          timestamp,
          isSynced: false
        });
        const cowToUpdate = await db.Livestock.where('tag').equals(tag).first();
        if (cowToUpdate) {
          const currentStatus = (cowToUpdate.status || '').toLowerCase();
          if (currentStatus !== 'pregnant' && currentStatus !== 'colostrum' && currentStatus !== 'dry') {
            await db.Livestock.update(cowToUpdate.id!, { status: 'Dry' as any });
          }
        }
      }
    }

    if (logsToSave.length > 0) {
      await db.MilkingLogs.bulkAdd(logsToSave);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEntries({});
      }, 2000);
    }
  };

  const handleInputChange = (tag: string, value: string) => {
    setEntries(prev => ({ ...prev, [tag]: value }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/portal/employee" className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
              <Trophy className="w-6 h-6 text-[var(--text-gold)]" /> Milking Leaderboard
            </h1>
            <p className="text-[var(--text-muted)] text-sm font-medium">Batch entry ordered by production</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
            {['Today', 'Week', 'Month', 'Year'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  period === p 
                    ? 'bg-[var(--primary)] text-white shadow-md' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button 
            onClick={handleBatchSubmit}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95"
          >
            Save All Entries
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] luxury-shadow overflow-hidden relative">
        {success && (
          <div className="absolute inset-0 bg-green-500/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white spring-transition">
            <CheckCircle2 className="w-16 h-16 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold">Batch Saved Locally</h2>
            <p className="text-green-100 font-medium mt-1">Synced automatically when online</p>
          </div>
        )}

        <div className="p-6 border-b border-[var(--border)] relative bg-[var(--bg-card)] z-10">
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by tag or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-4 px-6 font-bold w-16 text-center">Rank</th>
                <th className="py-4 px-6 font-bold w-1/4">Tag & Name</th>
                <th className="py-4 px-6 font-bold w-1/4">Total Yield ({period})</th>
                <th className="py-4 px-6 font-bold">Session Yield (Liters)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedCows.map((cow, index) => (
                <tr key={cow.tag} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 font-black text-center text-gray-400">
                    {index === 0 ? <span className="text-yellow-500 text-xl">1</span> : 
                     index === 1 ? <span className="text-gray-400 text-lg">2</span> : 
                     index === 2 ? <span className="text-amber-600 text-lg">3</span> : 
                     index + 1}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col">
                      <span className="font-black text-[var(--text-main)] text-lg">{cow.tag}</span>
                      <span className="font-medium text-[var(--text-muted)] text-sm">{cow.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 font-bold text-[var(--primary)]">
                    {cow.periodYield.toFixed(1)} L
                  </td>
                  <td className="py-3 px-6">
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={entries[cow.tag] || ''}
                      onChange={(e) => handleInputChange(cow.tag, e.target.value)}
                      className="w-full max-w-[200px] bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 text-xl font-bold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    />
                  </td>
                </tr>
              ))}
              {sortedCows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[var(--text-muted)] font-medium">
                    No cows found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
