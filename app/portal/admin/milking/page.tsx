'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Livestock, MilkingLog } from '../../../../db/db';
import { Search, Plus, X, Edit2, CheckCircle2, Save, Trophy } from 'lucide-react';

export default function AdminMilkingSection() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'Today' | 'Week' | 'Month' | 'Year'>('Week');
  
  const [selectedCow, setSelectedCow] = useState<Livestock | null>(null);
  const [newYield, setNewYield] = useState('');
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editYield, setEditYield] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const cows = useLiveQuery(() => db.Livestock.toArray(), []);
  const allLogs = useLiveQuery(() => db.MilkingLogs.toArray(), []);

  // Sort cows by highest yield in selected period
  const sortedCows = useMemo(() => {
    if (!cows || !allLogs) return [];
    
    // Filter out males
    const femaleCows = cows.filter(c => c.gender !== 'Male');

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
    allLogs.forEach(log => {
      if (new Date(log.timestamp) >= cutoff) {
        if (!yieldMap[log.tag]) yieldMap[log.tag] = 0;
        yieldMap[log.tag] += log.yieldLiters;
      }
    });

    const cowsWithYield = femaleCows.map(cow => {
      return { ...cow, periodYield: yieldMap[cow.tag] || 0 };
    });

    let filtered = cowsWithYield;
    if (search) {
      filtered = cowsWithYield.filter(c => c.tag.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()));
    }

    return filtered.sort((a, b) => b.periodYield - a.periodYield);
  }, [cows, allLogs, search, period]);

  // Get past 7 days of logs for the selected cow
  const cowLogs = useMemo(() => {
    if (!selectedCow || !allLogs) return [];
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0,0,0,0);

    return allLogs
      .filter(l => l.tag === selectedCow.tag && new Date(l.timestamp) >= oneWeekAgo)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedCow, allLogs]);

  const updateCowStatus = async (tag: string, yieldLiters: number) => {
    const cowToUpdate = await db.Livestock.where('tag').equals(tag).first();
    if (cowToUpdate) {
      // If pregnant or in colostrum phase, keep that status! She continues milking during pregnancy
      const currentStatus = (cowToUpdate.status || '').toLowerCase();
      if (currentStatus === 'pregnant' || currentStatus === 'colostrum') {
        return;
      }
      const newStatus = yieldLiters > 0 ? 'Lactating' : 'Dry';
      if (currentStatus !== newStatus.toLowerCase()) {
         await db.Livestock.update(cowToUpdate.id!, { status: newStatus });
      }
    }
  };

  const handleInstantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCow && newYield) {
      const yieldLiters = parseFloat(newYield);
      await db.MilkingLogs.add({
        tag: selectedCow.tag,
        yieldLiters: yieldLiters,
        timestamp: new Date().toISOString(),
        isSynced: false
      });
      await updateCowStatus(selectedCow.tag, yieldLiters);
      setNewYield('');
      setSuccessMsg('Milking record added successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveEdit = async (logId: number) => {
    if (editYield) {
      const yieldLiters = parseFloat(editYield);
      await db.MilkingLogs.update(logId, {
        yieldLiters: yieldLiters,
        isSynced: false
      });
      // Optionally update status based on the most recent edit if needed
      if (selectedCow) await updateCowStatus(selectedCow.tag, yieldLiters);
      setEditingLogId(null);
      setEditYield('');
      setSuccessMsg('Milking record updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[var(--text-gold)]" /> Milking Leaderboard
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Highest producers for the selected period</p>
        </div>
        
        <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
          {['Today', 'Week', 'Month', 'Year'].map(p => (
            <button 
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                period === p 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] luxury-shadow overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] relative">
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by tag or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-4 px-6 font-bold w-16 text-center">Rank</th>
                <th className="py-4 px-6 font-bold w-1/4">Tag</th>
                <th className="py-4 px-6 font-bold w-1/4">Name</th>
                <th className="py-4 px-6 font-bold">Total Yield ({period})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedCows.map((cow, index) => (
                <tr 
                  key={cow.tag} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => { setSelectedCow(cow); setSuccessMsg(''); }}
                >
                  <td className="py-4 px-6 font-black text-center text-gray-400">
                    {index === 0 ? <span className="text-yellow-500 text-xl">1</span> : 
                     index === 1 ? <span className="text-gray-400 text-lg">2</span> : 
                     index === 2 ? <span className="text-amber-600 text-lg">3</span> : 
                     index + 1}
                  </td>
                  <td className="py-4 px-6 font-black text-[var(--text-main)] text-lg">{cow.tag}</td>
                  <td className="py-4 px-6 font-medium text-[var(--text-muted)]">{cow.name}</td>
                  <td className="py-4 px-6 font-bold text-[var(--primary)]">{cow.periodYield.toFixed(1)} L</td>
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

      {/* Dialog Box */}
      {selectedCow && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedCow(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[var(--bg-card)] shadow-2xl z-50 rounded-3xl border border-[var(--border)] p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedCow(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-3xl shadow-sm border-2 border-white overflow-hidden">
                {selectedCow.picture_url ? <img src={selectedCow.picture_url} className="w-full h-full object-cover" /> : '🐄'}
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--text-main)]">{selectedCow.name}</h2>
                <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mt-1 inline-block">{selectedCow.tag}</span>
              </div>
            </div>

            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 spring-transition mb-6">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold">{successMsg}</span>
              </div>
            )}

            <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-6 rounded-2xl mb-8">
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-3">Instant Entry</h3>
              <form onSubmit={handleInstantSubmit} className="flex gap-4 items-center">
                <input 
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="Enter yield in Liters..."
                  value={newYield}
                  onChange={(e) => setNewYield(e.target.value)}
                  className="flex-1 bg-white border border-[var(--border)] rounded-xl py-3 px-4 text-lg font-bold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
                <button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all whitespace-nowrap">
                  Save Yield
                </button>
              </form>
              <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">Entering 0 will automatically mark the cow as Dry.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Past 7 Days History</h3>
              <div className="space-y-3">
                {cowLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] group">
                    <div>
                      <p className="font-bold text-[var(--text-main)]">
                        {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Recorded Yield</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {editingLogId === log.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            step="0.1"
                            min="0"
                            value={editYield}
                            onChange={(e) => setEditYield(e.target.value)}
                            className="w-24 bg-white border border-[var(--border)] rounded-lg py-2 px-3 font-bold focus:outline-none focus:border-[var(--primary)]"
                          />
                          <button onClick={() => handleSaveEdit(log.id!)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingLogId(null)} className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl font-black text-[var(--primary)]">{log.yieldLiters} L</span>
                          <button 
                            onClick={() => { setEditingLogId(log.id!); setEditYield(log.yieldLiters.toString()); }}
                            className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {cowLogs.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">No milking records found for the past week.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
