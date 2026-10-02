'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Livestock, trackLocalDeletion } from '../../../../db/db';
import Link from 'next/link';
import { 
  Search, Plus, Filter, X, Trash2, Upload, Users, Heart, Activity, 
  Baby, Sparkles, Clock, AlertCircle, DollarSign, Tag, CheckCircle2, 
  RotateCcw, ShieldAlert, ShoppingBag 
} from 'lucide-react';
import { useState, useMemo } from 'react';

export default function CowsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCow, setSelectedCow] = useState<Livestock | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [sellingCow, setSellingCow] = useState<Livestock | null>(null);
  const [sellForm, setSellForm] = useState<{
    soldDate: string;
    salePricePKR: number | undefined;
    soldTo: string;
    soldReasonOrCondition: string;
  }>({
    soldDate: new Date().toISOString().split('T')[0],
    salePricePKR: undefined,
    soldTo: '',
    soldReasonOrCondition: 'Healthy Dairy Animal'
  });

  const [newCow, setNewCow] = useState<Partial<Livestock>>({
    tag: '',
    name: '',
    gender: 'Female',
    breed: '',
    status: 'Lactating',
    birthDate: '',
    picture_url: '',
    noOfCalves: 0,
    motherTag: '',
    fatherTag: ''
  });

  const cows = useLiveQuery(() => db.Livestock.toArray(), []);
  const milkingLogs = useLiveQuery(() => db.MilkingLogs.toArray(), []);

  // Map each cow's latest milking timestamp & recent activity (last 5 days)
  const cowMilkingInfoMap = useMemo(() => {
    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const map: Record<string, { latestDate: Date | null; hasRecentMilk: boolean; lastYield: number }> = {};

    if (milkingLogs) {
      milkingLogs.forEach(l => {
        const t = new Date(l.timestamp);
        if (!map[l.tag] || (map[l.tag].latestDate && t > map[l.tag].latestDate!)) {
          const isRecent = (now - t.getTime()) <= fiveDaysMs && l.yieldLiters > 0;
          map[l.tag] = {
            latestDate: t,
            hasRecentMilk: isRecent,
            lastYield: l.yieldLiters
          };
        }
      });
    }
    return map;
  }, [milkingLogs]);

  // Helper to determine all matching categories for a cow
  const getCowCategories = (cow: Livestock): string[] => {
    if (cow.status === 'Sold') {
      return ['Sold'];
    }

    const isMale = cow.gender === 'Male';
    if (isMale) return ['Males'];

    const now = Date.now();
    let ageYears = 0;
    if (cow.birthDate) {
      ageYears = (now - new Date(cow.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    }
    if (ageYears > 0 && ageYears <= 1) {
      return ['Calves'];
    }

    const st = (cow.status || '').toLowerCase();
    const milkingInfo = cowMilkingInfoMap[cow.tag];
    const hasRecentMilk = milkingInfo ? milkingInfo.hasRecentMilk : false;

    // Explicit or deduced Non-Lactating Heifer
    if (st === 'heifer' || st === 'non-lactating heifer' || st === 'non-lactating') {
      return ['Heifers'];
    }

    // Heifer by age (>1 yr, 0 calves, never lactated or pregnant)
    if (ageYears > 1 && (!cow.noOfCalves || cow.noOfCalves === 0) && st !== 'lactating' && st !== 'pregnant' && st !== 'colostrum' && !hasRecentMilk) {
      return ['Heifers'];
    }

    const categories: string[] = [];

    // Pregnant Cow Dynamic Lifecycle:
    if (st === 'pregnant') {
      categories.push('Pregnant');

      let daysRemaining = 999;
      if (cow.expectedCalvingDate) {
        daysRemaining = (new Date(cow.expectedCalvingDate).getTime() - now) / (1000 * 60 * 60 * 24);
      }

      // Last month of pregnancy (<= 30 days remaining): in Dry and Colostrum as well!
      if (daysRemaining <= 30) {
        categories.push('Dry');
        categories.push('Colostrum');
      } else {
        if (hasRecentMilk) {
          categories.push('Lactating');
        } else {
          categories.push('Dry');
        }
      }
      return categories;
    }

    // Colostrum Cow
    if (st === 'colostrum') {
      categories.push('Colostrum');
      categories.push('Dry');
      return categories;
    }

    // Lactating Cow
    if (st === 'lactating') {
      if (hasRecentMilk) {
        categories.push('Lactating');
      } else {
        categories.push('Dry');
      }
      return categories;
    }

    // Dry Cow
    if (st === 'dry') {
      categories.push('Dry');
      return categories;
    }

    // Default fallback
    categories.push('Dry');
    return categories;
  };

  // Category counts calculation
  const categoryStats = useMemo(() => {
    if (!cows) return { totalActive: 0, lactating: 0, dry: 0, pregnant: 0, colostrum: 0, heifers: 0, males: 0, calves: 0, sold: 0 };
    
    let totalActive = 0;
    let lactating = 0;
    let dry = 0;
    let pregnant = 0;
    let colostrum = 0;
    let heifers = 0;
    let males = 0;
    let calves = 0;
    let sold = 0;

    cows.forEach(c => {
      if (c.status === 'Sold') {
        sold++;
        return;
      }

      totalActive++;
      const cats = getCowCategories(c);
      if (cats.includes('Lactating')) lactating++;
      if (cats.includes('Dry')) dry++;
      if (cats.includes('Pregnant')) pregnant++;
      if (cats.includes('Colostrum')) colostrum++;
      if (cats.includes('Heifers')) heifers++;
      if (cats.includes('Males')) males++;
      if (cats.includes('Calves')) calves++;
    });

    return { totalActive, lactating, dry, pregnant, colostrum, heifers, males, calves, sold };
  }, [cows, cowMilkingInfoMap]);

  const filteredCows = useMemo(() => {
    if (!cows) return [];
    let filtered = cows.filter(cow => {
      const matchesSearch = cow.tag.toLowerCase().includes(search.toLowerCase()) || cow.name.toLowerCase().includes(search.toLowerCase());
      
      const cowCats = getCowCategories(cow);

      if (statusFilter === 'Sold') {
        return matchesSearch && cow.status === 'Sold';
      }

      // If not viewing Sold tab, filter out sold animals from active herd!
      if (cow.status === 'Sold') return false;

      let matchesStatus = true;
      if (statusFilter !== 'All') {
        matchesStatus = cowCats.includes(statusFilter);
      }

      return matchesSearch && matchesStatus;
    });

    // Sort by Tag number (plain numeric / natural order)
    filtered.sort((a, b) => {
      const numA = parseInt(a.tag.replace(/\D/g, ''), 10);
      const numB = parseInt(b.tag.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.tag.localeCompare(b.tag, undefined, { numeric: true, sensitivity: 'base' });
    });

    return filtered;
  }, [cows, search, statusFilter, cowMilkingInfoMap]);

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return 'Unknown';
    const ageDifMs = Date.now() - new Date(birthDate).getTime();
    const ageDate = new Date(ageDifMs);
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    const months = Math.floor((ageDifMs / (1000 * 60 * 60 * 24 * 30.4375)) % 12);
    if (years === 0) {
      return `${Math.max(1, months)} mos`;
    }
    return `${years} yrs`;
  };

  const handleRemove = async (cow: Livestock) => {
    if (cow.id && confirm(`Are you sure you want to remove ${cow.name} (Tag: ${cow.tag})? This will erase its milk yields and medical logs, while keeping any existing calves intact.`)) {
      await trackLocalDeletion('livestock', cow.uuid, cow.tag);
      await db.Livestock.delete(cow.id);
      await db.MilkingLogs.where('tag').equals(cow.tag).delete();
      await db.MedicalLogs.where('tag').equals(cow.tag).delete();
      await db.VaccinationTasks.where('tag').equals(cow.tag).delete();
      if (selectedCow?.id === cow.id) {
        setSelectedCow(null);
      }
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sellingCow && sellingCow.id) {
      await db.Livestock.update(sellingCow.id, {
        status: 'Sold',
        soldDate: sellForm.soldDate || new Date().toISOString().split('T')[0],
        salePricePKR: sellForm.salePricePKR ? Number(sellForm.salePricePKR) : 0,
        soldTo: sellForm.soldTo || 'Direct Sale',
        soldReasonOrCondition: sellForm.soldReasonOrCondition || 'Sold from farm'
      });
      setSellingCow(null);
      if (selectedCow?.id === sellingCow.id) {
        setSelectedCow(null);
      }
    }
  };

  const handleRestoreAnimal = async (cow: Livestock) => {
    if (cow.id && confirm(`Restore ${cow.name} (Tag: ${cow.tag}) back to Active Herd?`)) {
      const defaultStatus = cow.gender === 'Male' ? 'Male' : 'Lactating';
      await db.Livestock.update(cow.id, {
        status: defaultStatus,
        soldDate: undefined,
        salePricePKR: undefined,
        soldTo: undefined,
        soldReasonOrCondition: undefined
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCow({ ...newCow, picture_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCow.tag && newCow.name) {
      const statusToSave = newCow.gender === 'Male' ? 'Male' : (newCow.status || 'Lactating');

      await db.Livestock.add({
        tag: newCow.tag,
        name: newCow.name,
        gender: newCow.gender,
        breed: newCow.breed || 'Unknown',
        status: statusToSave,
        birthDate: newCow.birthDate,
        picture_url: newCow.picture_url,
        noOfCalves: newCow.gender === 'Female' ? newCow.noOfCalves : 0,
        motherTag: newCow.motherTag || undefined,
        fatherTag: newCow.fatherTag || undefined
      });
      setIsAdding(false);
      setNewCow({ 
        tag: '', 
        name: '', 
        gender: 'Female', 
        breed: '', 
        status: 'Lactating', 
        birthDate: '', 
        picture_url: '', 
        noOfCalves: 0,
        motherTag: '',
        fatherTag: ''
      });
    }
  };

  const categories = [
    { label: 'All', count: categoryStats.totalActive, color: 'border-[var(--primary)]', bg: 'bg-[var(--primary)]/5' },
    { label: 'Lactating', count: categoryStats.lactating, color: 'border-green-300', bg: 'bg-green-50' },
    { label: 'Dry', count: categoryStats.dry, color: 'border-amber-300', bg: 'bg-amber-50' },
    { label: 'Pregnant', count: categoryStats.pregnant, color: 'border-blue-300', bg: 'bg-blue-50' },
    { label: 'Colostrum', count: categoryStats.colostrum, color: 'border-orange-300', bg: 'bg-orange-50' },
    { label: 'Heifers', count: categoryStats.heifers, color: 'border-teal-300', bg: 'bg-teal-50' },
    { label: 'Males', count: categoryStats.males, color: 'border-purple-300', bg: 'bg-purple-50' },
    { label: 'Calves', count: categoryStats.calves, color: 'border-rose-300', bg: 'bg-rose-50' },
    { label: 'Sold', count: categoryStats.sold, color: 'border-gray-400', bg: 'bg-gray-100' },
  ];

  const isViewingSold = statusFilter === 'Sold';

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Livestock Directory</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Dynamic herd categories, reproductive lifecycle, and sold animals archive (Sorted by Tag #)
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Animal
          </button>
        </div>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        {categories.map(cat => {
          const isSelected = statusFilter === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => setStatusFilter(cat.label)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${cat.bg} ${isSelected ? 'ring-2 ring-[var(--primary)] shadow-md border-[var(--primary)]' : 'border-[var(--border)] hover:border-gray-300'}`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">
                {cat.label === 'All' ? 'All Active' : cat.label}
              </div>
              <div className="text-2xl font-black text-[var(--text-main)] mt-1">
                {cat.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Animal Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6">Add New Animal</h2>
            
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-4xl overflow-hidden mb-4 relative group">
                  {newCow.picture_url ? (
                    <img src={newCow.picture_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    '🐄'
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Tag Number</label>
                <input type="text" required value={newCow.tag} onChange={e => setNewCow({...newCow, tag: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold" placeholder="e.g. 101" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Name</label>
                <input type="text" required value={newCow.name} onChange={e => setNewCow({...newCow, name: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold" placeholder="e.g. Bella" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Gender</label>
                <select 
                  value={newCow.gender} 
                  onChange={e => {
                    const nextGender = e.target.value as 'Female' | 'Male';
                    setNewCow({
                      ...newCow, 
                      gender: nextGender,
                      status: nextGender === 'Male' ? 'Male' : 'Lactating',
                      noOfCalves: nextGender === 'Male' ? 0 : newCow.noOfCalves
                    });
                  }} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold"
                >
                  <option value="Female">Female (Cow / Heifer)</option>
                  <option value="Male">Male (Bull / Steer)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Breed</label>
                <input type="text" value={newCow.breed} onChange={e => setNewCow({...newCow, breed: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold" placeholder="e.g. Sahiwal, Holstein" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Birth Date (Age)</label>
                <input type="date" required value={newCow.birthDate} onChange={e => setNewCow({...newCow, birthDate: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold" />
              </div>
              
              {newCow.gender === 'Female' ? (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Category / Status</label>
                  <select value={newCow.status} onChange={e => setNewCow({...newCow, status: e.target.value as any})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold">
                    <option value="Lactating">Lactating</option>
                    <option value="Dry">Dry</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Colostrum">Colostrum</option>
                    <option value="Heifer">Heifer (Non-Lactating)</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Registered as Male Livestock</span>
                </div>
              )}

              {newCow.gender === 'Female' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Number of Calves</label>
                  <input type="number" min="0" value={newCow.noOfCalves} onChange={e => setNewCow({...newCow, noOfCalves: Number(e.target.value)})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)]" />
                </div>
              )}

              {/* Optional Parentage / Pedigree */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Mother / Dam Tag (Optional)</label>
                  <input 
                    type="text" 
                    value={newCow.motherTag || ''} 
                    onChange={e => setNewCow({...newCow, motherTag: e.target.value})} 
                    className="w-full bg-white border border-[var(--border)] rounded-xl py-2.5 px-3.5 text-sm font-bold focus:outline-none focus:border-[var(--primary)]" 
                    placeholder="e.g. 45" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Father / Sire Tag or Breed (Optional)</label>
                  <input 
                    type="text" 
                    value={newCow.fatherTag || ''} 
                    onChange={e => setNewCow({...newCow, fatherTag: e.target.value})} 
                    className="w-full bg-white border border-[var(--border)] rounded-xl py-2.5 px-3.5 text-sm font-bold focus:outline-none focus:border-[var(--primary)]" 
                    placeholder="e.g. Bull-02 / Sahiwal Sire" 
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Animal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Directory Table Card */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by tag number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="text-[var(--text-muted)] w-5 h-5" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)] text-[var(--text-main)] font-bold"
            >
              <option value="All">All Active Livestock ({categoryStats.totalActive})</option>
              <option value="Lactating">Lactating ({categoryStats.lactating})</option>
              <option value="Dry">Dry ({categoryStats.dry})</option>
              <option value="Pregnant">Pregnant ({categoryStats.pregnant})</option>
              <option value="Colostrum">Colostrum ({categoryStats.colostrum})</option>
              <option value="Heifers">Heifers ({categoryStats.heifers})</option>
              <option value="Males">Males ({categoryStats.males})</option>
              <option value="Calves">Calves ({categoryStats.calves})</option>
              <option value="Sold">Sold Animals ({categoryStats.sold})</option>
            </select>
          </div>
        </div>

        {/* Livestock Table (Active or Sold) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="pb-3 font-bold px-4">Profile</th>
                <th className="pb-3 font-bold px-4">Tag</th>
                <th className="pb-3 font-bold px-4">Details</th>
                <th className="pb-3 font-bold px-4">{isViewingSold ? 'Sale Date' : 'Age'}</th>
                <th className="pb-3 font-bold px-4">{isViewingSold ? 'Buyer & Condition' : 'Category Badges'}</th>
                {isViewingSold && <th className="pb-3 font-bold px-4 text-right">Sale Price</th>}
                <th className="pb-3 font-bold px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredCows?.map((cow) => {
                const isMale = cow.gender === 'Male';
                const cowCats = getCowCategories(cow);
                const milkingInfo = cowMilkingInfoMap[cow.tag];

                if (isViewingSold) {
                  return (
                    <tr key={cow.id} className="hover:bg-[var(--bg-main)] transition-colors group cursor-pointer" onClick={() => setSelectedCow(cow)}>
                      <td className="py-4 px-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl shadow-sm border border-gray-300 overflow-hidden grayscale">
                          {cow.picture_url ? <img src={cow.picture_url} className="w-full h-full object-cover" /> : (isMale ? '🐂' : '🐄')}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-black text-[var(--text-main)] text-base">
                        {cow.tag}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-[var(--text-main)]">{cow.name}</div>
                        <div className="text-xs font-medium text-[var(--text-muted)]">{cow.breed} • {cow.gender || 'Unknown'}</div>
                      </td>

                      <td className="py-4 px-4 font-medium text-sm text-[var(--text-main)]">
                        {cow.soldDate ? new Date(cow.soldDate).toLocaleDateString() : '-'}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-sm text-[var(--text-main)]">
                          {cow.soldTo || 'Market / Direct Buyer'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] italic">
                          &quot;{cow.soldReasonOrCondition || 'Sold'}&quot;
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-black text-lg text-green-700">
                        ₨ {(cow.salePricePKR || 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleRestoreAnimal(cow)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                          title="Restore back to Active Herd"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <Link 
                          href={`/portal/admin/cows/${cow.tag}`}
                          className="text-sm font-bold text-[var(--primary)] hover:underline"
                        >
                          History →
                        </Link>
                      </td>
                    </tr>
                  );
                }

                // Active Cow Row
                return (
                  <tr key={cow.id} className="hover:bg-[var(--bg-main)] transition-colors group cursor-pointer" onClick={() => setSelectedCow(cow)}>
                    <td className="py-4 px-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-2xl shadow-sm border border-[var(--border)] overflow-hidden">
                        {cow.picture_url ? <img src={cow.picture_url} className="w-full h-full object-cover" /> : (isMale ? '🐂' : '🐄')}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-[var(--text-main)] text-base">{cow.tag}</td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-[var(--text-main)]">{cow.name}</div>
                      <div className="text-xs font-medium text-[var(--text-muted)]">{cow.breed} • {cow.gender || 'Unknown'}</div>
                    </td>
                    <td className="py-4 px-4 font-medium text-[var(--text-muted)]">
                      {calculateAge(cow.birthDate)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {isMale ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-200">
                            Male / Bull
                          </span>
                        ) : (
                          cowCats.map(cat => {
                            if (cat === 'Lactating') {
                              return (
                                <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
                                  Lactating
                                </span>
                              );
                            }
                            if (cat === 'Dry') {
                              const isAutoDry = cow.status?.toLowerCase() === 'lactating' && !milkingInfo?.hasRecentMilk;
                              return (
                                <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                  {isAutoDry ? 'Dry (No milk in 5d)' : 'Dry'}
                                </span>
                              );
                            }
                            if (cat === 'Pregnant') {
                              return (
                                <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                  Pregnant
                                </span>
                              );
                            }
                            if (cat === 'Colostrum') {
                              return (
                                <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200">
                                  Colostrum
                                </span>
                              );
                            }
                            if (cat === 'Heifers') {
                              return (
                                <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-200">
                                  Heifer (Non-Lactating)
                                </span>
                              );
                            }
                            if (cat === 'Calves') {
                              return (
                                <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200">
                                  Calf
                                </span>
                              );
                            }
                            return null;
                          })
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setSellingCow(cow);
                          setSellForm({
                            soldDate: new Date().toISOString().split('T')[0],
                            salePricePKR: undefined,
                            soldTo: '',
                            soldReasonOrCondition: 'Healthy Dairy Animal'
                          });
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition-colors"
                        title="Sell this animal"
                      >
                        🏷️ Sell
                      </button>

                      <button 
                        onClick={() => handleRemove(cow)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block"
                        title="Remove animal and erase its data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Link 
                        href={`/portal/admin/cows/${cow.tag}`}
                        className="text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] inline-block"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              
              {!filteredCows?.length && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-medium">
                    No livestock found in category &quot;{statusFilter}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sell Animal Modal */}
      {sellingCow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative">
            <button onClick={() => setSellingCow(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
              <Tag className="w-6 h-6 text-amber-600" /> Mark Animal as Sold
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Animal {sellingCow.name} (Tag: {sellingCow.tag}) will be archived into the Sold Animals ledger while retaining its historical records.
            </p>

            <form onSubmit={handleSellSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Sale Date</label>
                <input 
                  type="date" 
                  required 
                  value={sellForm.soldDate} 
                  onChange={e => setSellForm({ ...sellForm, soldDate: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Sale Price Received (PKR)</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  step="any"
                  value={sellForm.salePricePKR ?? ''} 
                  onChange={e => setSellForm({ ...sellForm, salePricePKR: e.target.value === '' ? undefined : Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-2xl text-green-700 focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 250000" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Sold To / Buyer Name / Market</label>
                <input 
                  type="text" 
                  value={sellForm.soldTo} 
                  onChange={e => setSellForm({ ...sellForm, soldTo: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Chaudhry Dairy or Local Mandi" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Condition at Sale / Reason</label>
                <input 
                  type="text" 
                  value={sellForm.soldReasonOrCondition} 
                  onChange={e => setSellForm({ ...sellForm, soldReasonOrCondition: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Sold as high-yield cow / low yield / meat" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setSellingCow(null)} className="px-5 py-2.5 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all">Confirm Animal Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Drawer for Quick Details */}
      {selectedCow && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedCow(null)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg-card)] shadow-2xl z-50 border-l border-[var(--border)] p-6 overflow-y-auto transform transition-transform">
            <button onClick={() => setSelectedCow(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            
            <div className="flex flex-col items-center mt-8 mb-6">
              <div className="w-32 h-32 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-6xl shadow-md border-4 border-white overflow-hidden">
                {selectedCow.picture_url ? <img src={selectedCow.picture_url} className="w-full h-full object-cover" /> : (selectedCow.gender === 'Male' ? '🐂' : '🐄')}
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)] mt-4">{selectedCow.name}</h2>
              <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mt-2">{selectedCow.tag}</span>
            </div>

            <div className="space-y-4">
              {selectedCow.status === 'Sold' ? (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">Sold Animal Record</span>
                  <div className="text-sm font-bold text-amber-950">
                    Sold Price: ₨ {(selectedCow.salePricePKR || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-amber-800">
                    Date: {selectedCow.soldDate ? new Date(selectedCow.soldDate).toLocaleDateString() : '-'}
                  </div>
                  <div className="text-xs text-amber-800">
                    Buyer: {selectedCow.soldTo || '-'}
                  </div>
                  <div className="text-xs text-amber-800 italic">
                    Condition: &quot;{selectedCow.soldReasonOrCondition || 'Sold'}&quot;
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Category Membership</p>
                  <div className="flex flex-wrap gap-2">
                    {getCowCategories(selectedCow).map(cat => (
                      <span key={cat} className="px-3 py-1 bg-white border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--primary)] shadow-sm">
                        {cat === 'Heifers' ? 'Heifer (Non-Lactating)' : cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Breed</p>
                  <p className="font-bold text-[var(--text-main)]">{selectedCow.breed}</p>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Age</p>
                  <p className="font-bold text-[var(--text-main)]">{calculateAge(selectedCow.birthDate)}</p>
                </div>
              </div>

              {/* Pedigree: Dam / Sire */}
              {(selectedCow.motherTag || selectedCow.fatherTag) && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Pedigree / Parentage</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-[var(--text-muted)] block">Mother (Dam):</span>
                      <span className="font-bold text-[var(--text-main)]">{selectedCow.motherTag || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--text-muted)] block">Father (Sire):</span>
                      <span className="font-bold text-[var(--text-main)]">{selectedCow.fatherTag || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedCow.gender === 'Female' && (
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Number of Calves</p>
                  <p className="font-bold text-[var(--text-main)]">{selectedCow.noOfCalves || 0} Calves</p>
                </div>
              )}

              {selectedCow.status === 'Pregnant' && selectedCow.expectedCalvingDate && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Expected Calving</p>
                  <p className="font-bold text-blue-900">{new Date(selectedCow.expectedCalvingDate).toLocaleDateString()}</p>
                  <p className="text-xs text-blue-700 mt-1">Sire: {selectedCow.upcomingCalfBreed || 'Unknown'}</p>
                </div>
              )}
              
              <Link href={`/portal/admin/cows/${selectedCow.tag}`} className="block w-full text-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-3 rounded-xl transition-colors mt-6 shadow-md">
                View Full Medical & Yield History
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
