'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, FeedLog, trackLocalDeletion } from '../../../../db/db';
import { useState, useMemo } from 'react';
import { 
  Wheat, Plus, Search, Filter, Trash2, Edit2, X, Calendar, 
  DollarSign, TrendingUp, Sparkles, CheckCircle2, Factory, ShoppingCart, 
  Clock, Flame, Layers, AlertCircle
} from 'lucide-react';

const FEED_PRESETS = [
  { name: 'Corn Silage (Farm-Prepared Pit)', type: 'Silage', category: 'Prepared', unit: 'Mann (40kg)', defaultDays: 120 },
  { name: 'Corn Silage (Commercial Bales)', type: 'Silage', category: 'Bought', unit: 'Mann (40kg)', defaultDays: 90 },
  { name: 'Sorghum / Jowar (Farm-Harvest)', type: 'Sorghum', category: 'Prepared', unit: 'Mann (40kg)', defaultDays: 60 },
  { name: 'Sorghum / Jowar Fodder (Bought)', type: 'Sorghum', category: 'Bought', unit: 'Mann (40kg)', defaultDays: 30 },
  { name: 'Dairy Wanda (50kg High Protein Bags)', type: 'Wanda / Concentrate', category: 'Bought', unit: 'Bags', defaultDays: 30 },
  { name: 'Wheat Straw / Bhoosa (Season Stock)', type: 'Wheat Straw', category: 'Bought', unit: 'Trailers', defaultDays: 180 },
  { name: 'Green Fodder (Makki / Barseem)', type: 'Green Fodder', category: 'Prepared', unit: 'Mann (40kg)', defaultDays: 15 },
  { name: 'Rhodes Grass / Hay Bales', type: 'Rhodes Grass', category: 'Bought', unit: 'KG', defaultDays: 60 },
];

const DURATION_SHORTCUTS = [
  { label: '15 Days', days: 15 },
  { label: '1 Month (30d)', days: 30 },
  { label: '2 Months (60d)', days: 60 },
  { label: '3 Months (90d)', days: 90 },
  { label: '4 Months (120d)', days: 120 },
  { label: '6 Months (180d)', days: 180 },
  { label: '1 Year (365d)', days: 365 },
];

export default function FeedManagementPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active Stock' | 'Depleted'>('All');

  const [isAdding, setIsAdding] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedLog | null>(null);

  const [feedForm, setFeedForm] = useState<Partial<FeedLog>>({
    feedName: 'Corn Silage (Farm Pit)',
    feedType: 'Silage',
    category: 'Prepared',
    quantity: 500,
    unit: 'Mann (40kg)',
    totalAmountPKR: 180000,
    date: new Date().toISOString().split('T')[0],
    durationDays: 120, // 4 months flexible stock default
    supplierOrField: 'Farm Pit #1',
    notes: 'Seasonal bulk silage prepared for 4 months'
  });

  const feedLogs = useLiveQuery(() => db.FeedLogs.toArray(), []);

  // Helper to compute batch lifecycle and status
  const getBatchStatus = (log: FeedLog) => {
    const start = new Date(log.date || log.startDate || Date.now());
    const duration = log.durationDays && log.durationDays > 0 ? log.durationDays : 30;
    const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
    const now = new Date();

    const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, duration - elapsedDays);
    const isActive = remainingDays > 0 && elapsedDays >= 0;
    const percentUsed = Math.min(100, Math.round((elapsedDays / duration) * 100));

    const dailyAmortizedCost = duration > 0 ? (log.totalAmountPKR || 0) / duration : 0;
    const remainingValue = (dailyAmortizedCost * remainingDays);

    return {
      duration,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      elapsedDays,
      remainingDays,
      isActive,
      percentUsed,
      dailyAmortizedCost,
      remainingValue
    };
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    if (!feedLogs) return { 
      totalSpent: 0, 
      activeStockValue: 0, 
      activeBatchesCount: 0, 
      dailyBurnRate: 0,
      silageTotal: 0,
      sorghumTotal: 0,
      wandaTotal: 0
    };

    let totalSpent = 0;
    let activeStockValue = 0;
    let activeBatchesCount = 0;
    let dailyBurnRate = 0;
    let silageTotal = 0;
    let sorghumTotal = 0;
    let wandaTotal = 0;

    feedLogs.forEach(item => {
      const amt = item.totalAmountPKR || 0;
      totalSpent += amt;

      const st = getBatchStatus(item);
      if (st.isActive) {
        activeStockValue += st.remainingValue;
        activeBatchesCount += 1;
        dailyBurnRate += st.dailyAmortizedCost;
      }

      if (item.feedType === 'Silage') silageTotal += amt;
      if (item.feedType === 'Sorghum') sorghumTotal += amt;
      if (item.feedType === 'Wanda / Concentrate') wandaTotal += amt;
    });

    return { totalSpent, activeStockValue, activeBatchesCount, dailyBurnRate, silageTotal, sorghumTotal, wandaTotal };
  }, [feedLogs]);

  // Filtered List
  const filteredFeedLogs = useMemo(() => {
    if (!feedLogs) return [];
    return feedLogs.filter(item => {
      const matchesSearch = 
        item.feedName.toLowerCase().includes(search.toLowerCase()) || 
        (item.supplierOrField && item.supplierOrField.toLowerCase().includes(search.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesType = typeFilter === 'All' || item.feedType === typeFilter;
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

      const st = getBatchStatus(item);
      let matchesStatus = true;
      if (statusFilter === 'Active Stock') matchesStatus = st.isActive;
      if (statusFilter === 'Depleted') matchesStatus = !st.isActive;

      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [feedLogs, search, typeFilter, categoryFilter, statusFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedForm.feedName && feedForm.totalAmountPKR !== undefined) {
      const durDays = Number(feedForm.durationDays) || 30;
      const start = feedForm.date || new Date().toISOString().split('T')[0];
      const end = new Date(new Date(start).getTime() + durDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await db.FeedLogs.add({
        feedName: feedForm.feedName,
        feedType: feedForm.feedType as any || 'Silage',
        category: feedForm.category as any || 'Prepared',
        quantity: Number(feedForm.quantity) || 0,
        unit: feedForm.unit as any || 'Mann (40kg)',
        costPerUnit: feedForm.quantity ? Number(feedForm.totalAmountPKR) / Number(feedForm.quantity) : undefined,
        totalAmountPKR: Number(feedForm.totalAmountPKR) || 0,
        date: start,
        durationDays: durDays,
        startDate: start,
        endDate: end,
        supplierOrField: feedForm.supplierOrField || '',
        notes: feedForm.notes || '',
        isSynced: false
      });
      setIsAdding(false);
      setFeedForm({
        feedName: 'Corn Silage (Farm Pit)',
        feedType: 'Silage',
        category: 'Prepared',
        quantity: 500,
        unit: 'Mann (40kg)',
        totalAmountPKR: 180000,
        date: new Date().toISOString().split('T')[0],
        durationDays: 120,
        supplierOrField: 'Farm Pit #1',
        notes: 'Seasonal bulk silage prepared for 4 months'
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFeed && editingFeed.id) {
      const durDays = Number(editingFeed.durationDays) || 30;
      const start = editingFeed.date || new Date().toISOString().split('T')[0];
      const end = new Date(new Date(start).getTime() + durDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await db.FeedLogs.update(editingFeed.id, {
        feedName: editingFeed.feedName,
        feedType: editingFeed.feedType,
        category: editingFeed.category,
        quantity: Number(editingFeed.quantity),
        unit: editingFeed.unit,
        costPerUnit: editingFeed.quantity ? Number(editingFeed.totalAmountPKR) / Number(editingFeed.quantity) : undefined,
        totalAmountPKR: Number(editingFeed.totalAmountPKR),
        date: start,
        durationDays: durDays,
        startDate: start,
        endDate: end,
        supplierOrField: editingFeed.supplierOrField,
        notes: editingFeed.notes,
      });
      setEditingFeed(null);
    }
  };

  const handleDelete = async (log: FeedLog) => {
    if (log.id && confirm('Are you sure you want to delete this feed expenditure record?')) {
      await trackLocalDeletion('feed_logs', log.uuid);
      await db.FeedLogs.delete(log.id);
    }
  };

  const applyPreset = (preset: typeof FEED_PRESETS[0], isEdit: boolean) => {
    if (isEdit && editingFeed) {
      setEditingFeed({
        ...editingFeed,
        feedName: preset.name,
        feedType: preset.type as any,
        category: preset.category as any,
        unit: preset.unit as any,
        durationDays: preset.defaultDays
      });
    } else {
      setFeedForm({
        ...feedForm,
        feedName: preset.name,
        feedType: preset.type as any,
        category: preset.category as any,
        unit: preset.unit as any,
        durationDays: preset.defaultDays
      });
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Wheat className="w-8 h-8 text-amber-600" /> Feed & Nutrition Inventory
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Flexible bulk tracking: program multi-month silage pits (e.g. 4 months), Wanda bags, and daily feed burn rates.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-5 h-5" /> Log Feed Batch
        </button>
      </div>

      {/* KPI Financial & Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Total Feed Capital</h3>
            <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">
            ₨ {metrics.totalSpent.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            All-time feed & silage purchases
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Active Stock Available</h3>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-700">
            ₨ {Math.round(metrics.activeStockValue).toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            {metrics.activeBatchesCount} batches currently active & in use
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Daily Feed Cost</h3>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-3xl font-black text-orange-700">
            ₨ {Math.round(metrics.dailyBurnRate).toLocaleString()} / day
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Amortized daily feed burn rate
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Silage & Fodder</h3>
            <Factory className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-teal-700">
            ₨ {(metrics.silageTotal + metrics.sorghumTotal).toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Silage pits & farm harvests
          </p>
        </div>
      </div>

      {/* Main Table Ledger Card */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
            <input 
              type="text"
              placeholder="Search feed, pit, field, supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:border-[var(--primary)] font-bold text-[var(--primary)]"
            >
              <option value="All">All Stock Statuses</option>
              <option value="Active Stock">Active Stock Only</option>
              <option value="Depleted">Depleted Stock</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="All">All Feed Types</option>
              <option value="Silage">Silage</option>
              <option value="Sorghum">Sorghum (Jowar)</option>
              <option value="Wanda / Concentrate">Wanda / Concentrate</option>
              <option value="Wheat Straw">Wheat Straw (Bhoosa)</option>
              <option value="Green Fodder">Green Fodder</option>
              <option value="Rhodes Grass">Rhodes Grass</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="All">All Sources (Bought & Prepared)</option>
              <option value="Prepared">Farm-Prepared</option>
              <option value="Bought">Bought / Commercial</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="pb-3 font-bold px-4">Date / Batch</th>
                <th className="pb-3 font-bold px-4">Feed & Source</th>
                <th className="pb-3 font-bold px-4">Quantity</th>
                <th className="pb-3 font-bold px-4">Stock Duration & Status</th>
                <th className="pb-3 font-bold px-4 text-right">Daily Cost</th>
                <th className="pb-3 font-bold px-4 text-right">Total Cost (PKR)</th>
                <th className="pb-3 font-bold px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredFeedLogs.map((log) => {
                const isPrepared = log.category === 'Prepared';
                const st = getBatchStatus(log);

                return (
                  <tr key={log.id} className="hover:bg-[var(--bg-main)] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-bold text-[var(--text-main)] text-sm">{new Date(log.date).toLocaleDateString()}</div>
                      <div className="text-xs text-[var(--text-muted)]">{log.supplierOrField || 'Farm Inventory'}</div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-[var(--text-main)] text-base">{log.feedName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {log.feedType}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isPrepared ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isPrepared ? 'Prepared' : 'Bought'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-[var(--text-main)] text-sm">
                        {log.quantity.toLocaleString()} {log.unit}
                      </div>
                      {log.costPerUnit && (
                        <div className="text-xs text-[var(--text-muted)]">
                          ₨ {Math.round(log.costPerUnit).toLocaleString()} / {log.unit}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 min-w-[200px]">
                      {st.isActive ? (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-amber-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Active Stock ({st.remainingDays}d left)
                            </span>
                            <span className="font-bold text-[var(--text-muted)] text-[11px]">
                              {st.duration}d total
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${st.percentUsed}%` }}></div>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            Until {new Date(st.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            Depleted ({st.duration} days stock finished)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="font-bold text-sm text-[var(--text-main)]">
                        ₨ {Math.round(st.dailyAmortizedCost).toLocaleString()}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">per day</div>
                    </td>

                    <td className="py-4 px-4 text-right font-black text-lg text-[var(--primary)]">
                      ₨ {log.totalAmountPKR?.toLocaleString()}
                    </td>

                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => setEditingFeed(log)}
                        className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredFeedLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-medium">
                    No feed inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Feed Expense */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Wheat className="w-6 h-6 text-amber-600" /> Log Feed Batch & Duration
            </h2>

            {/* Quick Presets */}
            <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">Quick Feed Presets</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {FEED_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p, false)}
                    className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-900 border border-[var(--border)] rounded-lg transition-colors"
                  >
                    {p.name} ({p.defaultDays}d)
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Feed Name / Batch</label>
                <input 
                  type="text" 
                  required 
                  value={feedForm.feedName} 
                  onChange={e => setFeedForm({ ...feedForm, feedName: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Corn Silage 2026 Batch" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Feed Type</label>
                <select 
                  value={feedForm.feedType} 
                  onChange={e => setFeedForm({ ...feedForm, feedType: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Silage">Silage</option>
                  <option value="Sorghum">Sorghum (Jowar)</option>
                  <option value="Wanda / Concentrate">Wanda / Concentrate</option>
                  <option value="Wheat Straw">Wheat Straw (Bhoosa)</option>
                  <option value="Green Fodder">Green Fodder (Makki / Barseem)</option>
                  <option value="Rhodes Grass">Rhodes Grass / Hay</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Category / Source</label>
                <select 
                  value={feedForm.category} 
                  onChange={e => setFeedForm({ ...feedForm, category: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Prepared">Farm-Prepared / Farm-Harvested</option>
                  <option value="Bought">Bought / Commercial Market</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Purchase / Harvest Date</label>
                <input 
                  type="date" 
                  required 
                  value={feedForm.date} 
                  onChange={e => setFeedForm({ ...feedForm, date: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Quantity</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="any"
                  value={feedForm.quantity ?? ''} 
                  onChange={e => setFeedForm({ ...feedForm, quantity: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Unit of Measurement</label>
                <select 
                  value={feedForm.unit} 
                  onChange={e => setFeedForm({ ...feedForm, unit: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Mann (40kg)">Mann (40 KG)</option>
                  <option value="KG">KG</option>
                  <option value="Tons">Tons (1000 KG)</option>
                  <option value="Bags">Bags (50 KG)</option>
                  <option value="Trailers">Trailers / Trolleys</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Amount Spent (PKR)</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  step="any"
                  value={feedForm.totalAmountPKR ?? ''} 
                  onChange={e => setFeedForm({ ...feedForm, totalAmountPKR: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-xl text-[var(--primary)] focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 180000" 
                />
              </div>

              {/* Expected Duration (Months / Days) */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Expected Duration (Stock Days)
                </label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={feedForm.durationDays ?? ''} 
                  onChange={e => setFeedForm({ ...feedForm, durationDays: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="120 (4 months)" 
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {DURATION_SHORTCUTS.map(sc => (
                    <button
                      key={sc.days}
                      type="button"
                      onClick={() => setFeedForm({ ...feedForm, durationDays: sc.days })}
                      className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md hover:bg-amber-100"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Pit / Field Name or Supplier (Optional)</label>
                <input 
                  type="text" 
                  value={feedForm.supplierOrField || ''} 
                  onChange={e => setFeedForm({ ...feedForm, supplierOrField: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Silage Pit #2 or Rehman Feed Mill" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes / Quality (Optional)</label>
                <input 
                  type="text" 
                  value={feedForm.notes || ''} 
                  onChange={e => setFeedForm({ ...feedForm, notes: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 68% Moisture, 10% protein" 
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Feed Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Feed */}
      {editingFeed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setEditingFeed(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-[var(--primary)]" /> Edit Feed Batch
            </h2>

            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Feed Name / Batch</label>
                <input 
                  type="text" 
                  required 
                  value={editingFeed.feedName} 
                  onChange={e => setEditingFeed({ ...editingFeed, feedName: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Feed Type</label>
                <select 
                  value={editingFeed.feedType} 
                  onChange={e => setEditingFeed({ ...editingFeed, feedType: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Silage">Silage</option>
                  <option value="Sorghum">Sorghum (Jowar)</option>
                  <option value="Wanda / Concentrate">Wanda / Concentrate</option>
                  <option value="Wheat Straw">Wheat Straw (Bhoosa)</option>
                  <option value="Green Fodder">Green Fodder (Makki / Barseem)</option>
                  <option value="Rhodes Grass">Rhodes Grass / Hay</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Category / Source</label>
                <select 
                  value={editingFeed.category} 
                  onChange={e => setEditingFeed({ ...editingFeed, category: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Prepared">Farm-Prepared / Farm-Harvested</option>
                  <option value="Bought">Bought / Commercial Market</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingFeed.date} 
                  onChange={e => setEditingFeed({ ...editingFeed, date: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Quantity</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="any"
                  value={editingFeed.quantity} 
                  onChange={e => setEditingFeed({ ...editingFeed, quantity: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Unit of Measurement</label>
                <select 
                  value={editingFeed.unit} 
                  onChange={e => setEditingFeed({ ...editingFeed, unit: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Mann (40kg)">Mann (40 KG)</option>
                  <option value="KG">KG</option>
                  <option value="Tons">Tons (1000 KG)</option>
                  <option value="Bags">Bags (50 KG)</option>
                  <option value="Trailers">Trailers / Trolleys</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Amount Spent (PKR)</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  step="any"
                  value={editingFeed.totalAmountPKR} 
                  onChange={e => setEditingFeed({ ...editingFeed, totalAmountPKR: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-xl text-[var(--primary)] focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Expected Duration (Stock Days)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={editingFeed.durationDays ?? ''} 
                  onChange={e => setEditingFeed({ ...editingFeed, durationDays: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {DURATION_SHORTCUTS.map(sc => (
                    <button
                      key={sc.days}
                      type="button"
                      onClick={() => setEditingFeed({ ...editingFeed, durationDays: sc.days })}
                      className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md hover:bg-amber-100"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Pit / Supplier</label>
                <input 
                  type="text" 
                  value={editingFeed.supplierOrField || ''} 
                  onChange={e => setEditingFeed({ ...editingFeed, supplierOrField: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes</label>
                <input 
                  type="text" 
                  value={editingFeed.notes || ''} 
                  onChange={e => setEditingFeed({ ...editingFeed, notes: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingFeed(null)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
