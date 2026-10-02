'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Livestock, VaccinationTask, MilkingLog, MedicalLog } from '../../../../../db/db';
import { 
  ArrowLeft, Syringe, Clock, Activity, Edit2, Plus, X, Upload, 
  Calendar, AlertCircle, CheckCircle2, Milk, HeartPulse, Sparkles, 
  Baby, Search, ChevronRight, TrendingUp, Award, DollarSign, 
  Droplets, FileText, Trash2, Check
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceArea 
} from 'recharts';

export default function CowProfile() {
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'milking' | 'medical' | 'calving'>('overview');
  const [graphFilter, setGraphFilter] = useState<'Today' | '7D' | '30D' | '90D' | 'Year' | 'All'>('30D');
  const [chartViewType, setChartViewType] = useState<'area' | 'line'>('area');
  const [milkingSearch, setMilkingSearch] = useState('');

  // Modals state
  const [isEditing, setIsEditing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isLoggingMilk, setIsLoggingMilk] = useState(false);
  const [isLoggingMedical, setIsLoggingMedical] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<VaccinationTask | null>(null);
  const [isReschedulingTask, setIsReschedulingTask] = useState(false);

  // Form states
  const [editCow, setEditCow] = useState<Partial<Livestock>>({});
  const [newTask, setNewTask] = useState<Partial<VaccinationTask>>({ type: '', date: '', status: 'pending' });
  const [newMilkYield, setNewMilkYield] = useState<string>('');
  const [newMilkTime, setNewMilkTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [newMedicalCondition, setNewMedicalCondition] = useState('');
  const [newMedicalTreatment, setNewMedicalTreatment] = useState('');
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [rescheduledType, setRescheduledType] = useState('');

  // Database Queries
  const cow = useLiveQuery(() => db.Livestock.where('tag').equalsIgnoreCase(tag).first(), [tag]);
  const rawMilkingLogs = useLiveQuery(() => db.MilkingLogs.where('tag').equalsIgnoreCase(tag).toArray(), [tag]);
  const tasks = useLiveQuery(() => db.VaccinationTasks.where('tag').equalsIgnoreCase(tag).toArray(), [tag]);
  const medicalLogs = useLiveQuery(() => db.MedicalLogs.where('tag').equalsIgnoreCase(tag).toArray(), [tag]);
  
  // Offspring calves (animals whose mother or father tag matches this cow)
  const offspring = useLiveQuery(
    () => db.Livestock.filter(c => (c.motherTag?.toLowerCase() === tag.toLowerCase()) || (c.fatherTag?.toLowerCase() === tag.toLowerCase())).toArray(),
    [tag]
  );

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (!rawMilkingLogs || rawMilkingLogs.length === 0) {
      return { totalLifetimeYield: 0, avgDailyYield: 0, peakYield: 0, totalSessions: 0, estimatedRevenue: 0 };
    }

    const totalLifetimeYield = rawMilkingLogs.reduce((acc, log) => acc + (log.yieldLiters || 0), 0);
    const peakYield = Math.max(...rawMilkingLogs.map(l => l.yieldLiters || 0));
    const totalSessions = rawMilkingLogs.length;

    // Calculate last 7 days average
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = rawMilkingLogs.filter(l => new Date(l.timestamp) >= sevenDaysAgo);
    const recentTotal = recentLogs.reduce((acc, log) => acc + (log.yieldLiters || 0), 0);
    const avgDailyYield = recentTotal > 0 ? (recentTotal / 7) : (totalLifetimeYield / Math.max(1, Math.ceil(rawMilkingLogs.length / 2)));

    // Estimated revenue @ PKR 190 avg market rate
    const estimatedRevenue = Math.round(totalLifetimeYield * 190);

    return {
      totalLifetimeYield: Number(totalLifetimeYield.toFixed(1)),
      avgDailyYield: Number(avgDailyYield.toFixed(1)),
      peakYield: Number(peakYield.toFixed(1)),
      totalSessions,
      estimatedRevenue
    };
  }, [rawMilkingLogs]);

  // Gestation calculation if pregnant
  const gestationInfo = useMemo(() => {
    if (cow?.status !== 'Pregnant' || !cow?.pregnancyStartDate) return null;
    const start = new Date(cow.pregnancyStartDate);
    const now = new Date();
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
    const totalGestation = 283; // Average cattle gestation
    const remainingDays = Math.max(0, totalGestation - elapsedDays);
    const progressPercent = Math.min(100, Math.round((elapsedDays / totalGestation) * 100));

    return {
      elapsedDays,
      remainingDays,
      progressPercent,
      expectedDate: cow.expectedCalvingDate ? new Date(cow.expectedCalvingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'
    };
  }, [cow]);

  // Interactive Chart Data
  const chartData = useMemo(() => {
    if (!rawMilkingLogs || rawMilkingLogs.length === 0) return [];
    
    const now = new Date();
    let cutoff = new Date(0); // All time default
    
    if (graphFilter === 'Today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (graphFilter === '7D') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (graphFilter === '30D') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (graphFilter === '90D') {
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (graphFilter === 'Year') {
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const filteredLogs = rawMilkingLogs.filter(log => new Date(log.timestamp) >= cutoff);
    const sortedLogs = [...filteredLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return sortedLogs.map((log) => {
      const d = new Date(log.timestamp);
      const isDry = log.yieldLiters === 0;
      const hour = d.getHours();
      const sessionName = hour < 12 ? 'Morning (AM)' : 'Evening (PM)';
      
      let label = `${d.getDate()}/${d.getMonth()+1}`;
      if (graphFilter === 'Today') {
        label = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      } else if (graphFilter === '7D' || graphFilter === '30D') {
        label = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} (${sessionName[0]})`;
      }

      return {
        date: label,
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        yield: log.yieldLiters,
        session: sessionName,
        timestamp: d.getTime(),
        status: isDry ? 'Dry' : (cow?.status || 'Lactating'),
      };
    });
  }, [rawMilkingLogs, graphFilter, cow?.status]);

  // Handlers
  const handleEditOpen = () => {
    if (cow) {
      setEditCow({ ...cow });
      setIsEditing(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCow({ ...editCow, picture_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cow && cow.id) {
      let expectedCalvingDate = editCow.expectedCalvingDate;
      if (editCow.status === 'Pregnant' && editCow.pregnancyStartDate) {
        const start = new Date(editCow.pregnancyStartDate);
        const expected = new Date(start.getTime() + 283 * 24 * 60 * 60 * 1000);
        expectedCalvingDate = expected.toISOString().split('T')[0];
      }

      await db.Livestock.update(cow.id, {
        name: editCow.name,
        gender: editCow.gender,
        breed: editCow.breed,
        status: editCow.status,
        birthDate: editCow.birthDate,
        picture_url: editCow.picture_url,
        noOfCalves: editCow.gender === 'Female' ? editCow.noOfCalves : 0,
        motherTag: editCow.motherTag || undefined,
        fatherTag: editCow.fatherTag || undefined,
        pregnancyStartDate: editCow.status === 'Pregnant' ? editCow.pregnancyStartDate : undefined,
        expectedCalvingDate: editCow.status === 'Pregnant' ? expectedCalvingDate : undefined,
        upcomingCalfBreed: editCow.status === 'Pregnant' ? editCow.upcomingCalfBreed : undefined,
        updatedAt: new Date().toISOString(),
        isSynced: false
      });
      setIsEditing(false);
    }
  };

  const handleAddMilkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const yieldNum = parseFloat(newMilkYield);
    if (!isNaN(yieldNum) && yieldNum >= 0) {
      await db.MilkingLogs.add({
        tag: cow!.tag,
        yieldLiters: yieldNum,
        timestamp: new Date(newMilkTime).toISOString(),
        isSynced: false,
        updatedAt: new Date().toISOString()
      });
      setNewMilkYield('');
      setIsLoggingMilk(false);
    }
  };

  const handleDeleteMilkLog = async (id?: number) => {
    if (id && confirm('Are you sure you want to delete this milk log?')) {
      await db.MilkingLogs.delete(id);
    }
  };

  const handleAddMedicalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMedicalCondition && newMedicalTreatment) {
      await db.MedicalLogs.add({
        tag: cow!.tag,
        condition: newMedicalCondition,
        treatment: newMedicalTreatment,
        timestamp: new Date().toISOString(),
        isSynced: false,
        updatedAt: new Date().toISOString()
      });
      setNewMedicalCondition('');
      setNewMedicalTreatment('');
      setIsLoggingMedical(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.type && newTask.date) {
      await db.VaccinationTasks.add({
        tag: cow!.tag,
        herdWide: false,
        type: newTask.type,
        date: newTask.date,
        status: 'pending',
        isSynced: false,
        updatedAt: new Date().toISOString()
      });
      setIsScheduling(false);
      setNewTask({ type: '', date: '', status: 'pending' });
    }
  };

  const handleCompleteTask = async () => {
    if (selectedTaskForEdit && selectedTaskForEdit.id) {
      await db.VaccinationTasks.update(selectedTaskForEdit.id, { 
        status: 'completed',
        updatedAt: new Date().toISOString(),
        isSynced: false 
      });
      setSelectedTaskForEdit(null);
      setIsReschedulingTask(false);
    }
  };

  const handleReschedule = async () => {
    if (selectedTaskForEdit && selectedTaskForEdit.id && rescheduledDate) {
      await db.VaccinationTasks.update(selectedTaskForEdit.id, {
        date: rescheduledDate,
        type: rescheduledType || selectedTaskForEdit.type,
        updatedAt: new Date().toISOString(),
        isSynced: false
      });
      setSelectedTaskForEdit(null);
      setIsReschedulingTask(false);
    }
  };

  if (!cow) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#0B6AB5] border-t-transparent animate-spin mx-auto"></div>
        <p className="text-sm font-bold text-[var(--text-muted)]">Loading livestock records...</p>
      </div>
    );
  }

  const age = cow.birthDate ? `${Math.abs(new Date(Date.now() - new Date(cow.birthDate).getTime()).getUTCFullYear() - 1970)} yrs` : 'Unknown';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link 
            href="/portal/admin/cows" 
            className="p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[#0B6AB5] hover:border-[#0B6AB5] transition-all card-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-main)]">{cow.name}</h1>
              <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-[#0B6AB5]/10 text-[#0B6AB5] border border-[#0B6AB5]/20">
                Tag {cow.tag}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
              {cow.breed} • {cow.gender || 'Female'} • Registered Livestock
            </p>
          </div>
        </div>

        {/* Quick Actions Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {cow.gender !== 'Male' && (
            <button
              onClick={() => setIsLoggingMilk(true)}
              className="px-4 py-2 rounded-xl bg-[#0B6AB5] hover:bg-[#085491] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Droplets className="w-3.5 h-3.5" /> Log Milk
            </button>
          )}

          <button
            onClick={() => setIsLoggingMedical(true)}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-600" /> Log Treatment
          </button>

          <button
            onClick={() => setIsScheduling(true)}
            className="px-4 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-slate-100 text-[var(--text-main)] border border-[var(--border)] text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Syringe className="w-3.5 h-3.5 text-amber-600" /> Schedule Task
          </button>

          <button
            onClick={handleEditOpen}
            className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-slate-100 text-[var(--text-muted)] border border-[var(--border)] transition-all"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Profile Details + Key KPI cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column Profile Card */}
        <div className="lg:col-span-1 bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="relative w-36 h-36 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-6xl overflow-hidden shadow-inner border-2 border-[var(--border)]">
              {cow.picture_url ? (
                <img src={cow.picture_url} className="w-full h-full object-cover" alt={cow.name} />
              ) : (
                '🐄'
              )}
              <span className={`absolute bottom-2 right-2 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                cow.status === 'Lactating' ? 'bg-emerald-500 text-white shadow-sm' :
                cow.status === 'Pregnant' ? 'bg-blue-500 text-white shadow-sm' :
                cow.status === 'Sold' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-600 text-white'
              }`}>
                {cow.status}
              </span>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-black text-[var(--text-main)]">{cow.name}</h2>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Tag #{cow.tag}</p>
            </div>

            {/* Quick Profile Attribute Rows */}
            <div className="space-y-2.5 pt-2 text-xs border-t border-[var(--border)]">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">Breed</span>
                <span className="font-extrabold text-[var(--text-main)]">{cow.breed}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">Gender</span>
                <span className="font-extrabold text-[var(--text-main)]">{cow.gender || 'Female'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">Age</span>
                <span className="font-extrabold text-[var(--text-main)]">{age}</span>
              </div>
              {cow.birthDate && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">DOB</span>
                  <span className="font-bold text-[var(--text-main)]">{new Date(cow.birthDate).toLocaleDateString()}</span>
                </div>
              )}
              {cow.gender !== 'Male' && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">Calvings</span>
                  <span className="font-extrabold text-[#0B6AB5]">{cow.noOfCalves || 0} Calves</span>
                </div>
              )}
            </div>
          </div>

          {/* Sold Status Card if Sold */}
          {cow.status === 'Sold' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <span className="font-black text-amber-900 uppercase tracking-wider block text-[10px]">Sold Record</span>
              <p className="font-extrabold text-amber-950">Sale Price: ₨ {(cow.salePricePKR || 0).toLocaleString()}</p>
              <p className="text-amber-800 text-[11px]">Buyer: {cow.soldTo || 'Private'}</p>
              <p className="text-amber-750 text-[11px] italic">&quot;{cow.soldReasonOrCondition || 'Sold'}&quot;</p>
            </div>
          )}

          {/* Gestational Progress Card if Pregnant */}
          {gestationInfo && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <Baby className="w-3.5 h-3.5 text-blue-700" /> Pregnant
                </span>
                <span className="font-extrabold text-blue-800">{gestationInfo.progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-blue-200 overflow-hidden">
                <div className="h-full bg-[#0B6AB5] rounded-full transition-all duration-500" style={{ width: `${gestationInfo.progressPercent}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-blue-900 pt-0.5">
                <span>Day {gestationInfo.elapsedDays}</span>
                <span>Due: {gestationInfo.expectedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right 3-Columns: KPI Cards + Interactive Analytics */}
        <div className="lg:col-span-3 space-y-6">
          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] luxury-shadow card-hover">
              <span className="text-[11px] font-bold text-[#0B6AB5] uppercase tracking-wider block flex items-center gap-1">
                <Milk className="w-3.5 h-3.5 text-[#0B6AB5]" /> Lifetime Yield
              </span>
              <span className="text-2xl font-black text-[var(--text-main)] mt-1 block">
                {summaryMetrics.totalLifetimeYield} L
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {summaryMetrics.totalSessions} Sessions Logged
              </span>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] luxury-shadow card-hover">
              <span className="text-[11px] font-bold text-[#249D4A] uppercase tracking-wider block flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#249D4A]" /> Daily Average
              </span>
              <span className="text-2xl font-black text-[#249D4A] mt-1 block">
                {summaryMetrics.avgDailyYield} L/d
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                7-Day Moving Yield
              </span>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] luxury-shadow card-hover">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Peak Yield
              </span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {summaryMetrics.peakYield} L
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                Single Session Highest
              </span>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] luxury-shadow card-hover">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Est. Revenue
              </span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                ₨ {summaryMetrics.estimatedRevenue.toLocaleString()}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                @ ₨ 190/L Farm Value
              </span>
            </div>
          </div>

          {/* Interactive Yield Chart */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] luxury-shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#0B6AB5]" />
                  Interactive Milk Yield Analytics
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  Track historical daily and session variations with exact timestamps
                </p>
              </div>

              {/* Timeframe Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                {(['Today', '7D', '30D', '90D', 'Year', 'All'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setGraphFilter(f)}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                      graphFilter === f 
                        ? 'bg-[#0B6AB5] text-white shadow-sm' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="milkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B6AB5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#249D4A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={{ stroke: '#E2E8F0' }} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} 
                      dy={8}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} 
                      unit=" L"
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[var(--border)] shadow-xl text-xs space-y-1">
                              <p className="font-extrabold text-[var(--text-main)]">{data.fullDate}</p>
                              <div className="flex items-center justify-between gap-4 pt-1">
                                <span className="text-[var(--text-muted)] font-bold">Session Yield:</span>
                                <span className="text-base font-black text-[#0B6AB5]">{data.yield} Liters</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-[11px]">
                                <span className="text-[var(--text-muted)]">Session:</span>
                                <span className="font-bold text-[var(--text-main)]">{data.session}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-[11px]">
                                <span className="text-[var(--text-muted)]">Herd Status:</span>
                                <span className="font-bold text-emerald-700">{data.status}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="yield" 
                      stroke="#0B6AB5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#milkGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-2xl text-center p-6 space-y-2">
                <Milk className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-bold text-[var(--text-main)]">No milking logs for this timeframe</p>
                <p className="text-xs text-[var(--text-muted)]">Log a new morning or evening milk yield to start tracking trends.</p>
                <button
                  onClick={() => setIsLoggingMilk(true)}
                  className="mt-2 px-4 py-2 bg-[#0B6AB5] hover:bg-[#085491] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  + Record Milk Yield
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation for Full Records */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] luxury-shadow overflow-hidden">
        <div className="flex border-b border-[var(--border)] bg-slate-50/70 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview' 
                ? 'bg-white text-[#0B6AB5] shadow-sm border border-[var(--border)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Activity className="w-4 h-4" /> All Records Summary
          </button>

          <button
            onClick={() => setActiveTab('milking')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'milking' 
                ? 'bg-white text-[#0B6AB5] shadow-sm border border-[var(--border)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Milk className="w-4 h-4 text-[#0B6AB5]" /> Milking Ledger ({rawMilkingLogs?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('medical')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'medical' 
                ? 'bg-white text-rose-700 shadow-sm border border-[var(--border)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-600" /> Medical & Tasks ({(tasks?.length || 0) + (medicalLogs?.length || 0)})
          </button>

          <button
            onClick={() => setActiveTab('calving')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'calving' 
                ? 'bg-white text-[#249D4A] shadow-sm border border-[var(--border)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Baby className="w-4 h-4 text-[#249D4A]" /> Calving & Offspring ({offspring?.length || 0})
          </button>
        </div>

        {/* Tab 1: Overview Summary */}
        {activeTab === 'overview' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Milking Records Card */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                    <Milk className="w-4 h-4 text-[#0B6AB5]" /> Recent Milking Sessions
                  </h3>
                  <button onClick={() => setActiveTab('milking')} className="text-xs font-bold text-[#0B6AB5] hover:underline">
                    View All ({rawMilkingLogs?.length || 0}) →
                  </button>
                </div>

                <div className="space-y-2">
                  {rawMilkingLogs && rawMilkingLogs.length > 0 ? (
                    [...rawMilkingLogs]
                      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 5)
                      .map(log => (
                        <div key={log.id} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                          <div>
                            <span className="font-extrabold text-[var(--text-main)] block">
                              {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).getHours() < 12 ? 'Morning' : 'Evening'} Session
                            </span>
                          </div>
                          <span className="text-sm font-black text-[#0B6AB5] bg-white px-3 py-1 rounded-xl border border-slate-200">
                            {log.yieldLiters} Liters
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">No milking logs recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Health & Vaccination Tasks */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-rose-600" /> Medical & Vaccination Status
                  </h3>
                  <button onClick={() => setActiveTab('medical')} className="text-xs font-bold text-rose-700 hover:underline">
                    Manage Tasks →
                  </button>
                </div>

                <div className="space-y-2">
                  {tasks && tasks.length > 0 ? (
                    [...tasks]
                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map(task => (
                        <div 
                          key={task.id} 
                          onClick={() => {
                            setSelectedTaskForEdit(task);
                            setRescheduledDate(task.date);
                            setRescheduledType(task.type);
                            setIsReschedulingTask(false);
                          }}
                          className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div>
                            <span className="font-extrabold text-[var(--text-main)] block">{task.type}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">Scheduled: {new Date(task.date).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">No vaccination tasks recorded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lineage & Pedigree */}
            {(cow.motherTag || cow.fatherTag || (offspring && offspring.length > 0)) && (
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                  <Baby className="w-4 h-4 text-[#249D4A]" /> Lineage & Registered Farm Offspring
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Parents (Pedigree)</span>
                    <p className="font-extrabold text-[var(--text-main)] mt-1">
                      Mother / Dam: <span className="text-[#0B6AB5]">{cow.motherTag || 'Unspecified'}</span>
                    </p>
                    <p className="font-extrabold text-[var(--text-main)] mt-0.5">
                      Father / Sire: <span className="text-[#0B6AB5]">{cow.fatherTag || 'Unspecified'}</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Registered Offspring in Farm</span>
                    {offspring && offspring.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {offspring.map(child => (
                          <Link 
                            key={child.id} 
                            href={`/portal/admin/cows/${child.tag}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-[#0B6AB5] hover:text-white rounded-xl font-black text-xs transition-colors"
                          >
                            Tag {child.tag} ({child.name})
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] mt-1">No recorded calves born on this farm yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Complete Milking Ledger Table */}
        {activeTab === 'milking' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text-main)]">Complete Milking History</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Total of {rawMilkingLogs?.length || 0} milking sessions logged for this animal
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by date..."
                    value={milkingSearch}
                    onChange={e => setMilkingSearch(e.target.value)}
                    className="w-full bg-white border border-[var(--border)] rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:outline-none focus:border-[#0B6AB5]"
                  />
                </div>

                <button
                  onClick={() => setIsLoggingMilk(true)}
                  className="px-4 py-2 bg-[#0B6AB5] hover:bg-[#085491] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Log
                </button>
              </div>
            </div>

            {rawMilkingLogs && rawMilkingLogs.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[var(--text-muted)] uppercase tracking-wider font-bold text-[10px] border-b border-[var(--border)]">
                    <tr>
                      <th className="p-3.5">Session Date & Time</th>
                      <th className="p-3.5">Session</th>
                      <th className="p-3.5">Yield (Liters)</th>
                      <th className="p-3.5">Est. Value (₨)</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {[...rawMilkingLogs]
                      .filter(l => !milkingSearch || new Date(l.timestamp).toLocaleDateString().includes(milkingSearch))
                      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(log => {
                        const dateObj = new Date(log.timestamp);
                        const isMorning = dateObj.getHours() < 12;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-bold text-[var(--text-main)]">
                              {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              <span className="text-[11px] text-[var(--text-muted)] block font-normal">
                                {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                isMorning ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                {isMorning ? '🌅 Morning' : '🌆 Evening'}
                              </span>
                            </td>
                            <td className="p-3.5 font-black text-sm text-[#0B6AB5]">
                              {log.yieldLiters} L
                            </td>
                            <td className="p-3.5 font-bold text-emerald-700">
                              ₨ {Math.round(log.yieldLiters * 190).toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleDeleteMilkLog(log.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] font-medium">
                No milking logs found for this animal.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Medical & Health Tasks */}
        {activeTab === 'medical' && (
          <div className="p-6 sm:p-8 space-y-8">
            {/* Scheduled Vaccinations */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-amber-600" /> Vaccination & Prevention Tasks
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Scheduled and completed vaccination shots</p>
                </div>

                <button
                  onClick={() => setIsScheduling(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Vaccination
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks && tasks.length > 0 ? (
                  tasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskForEdit(task);
                        setRescheduledDate(task.date);
                        setRescheduledType(task.type);
                        setIsReschedulingTask(false);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center cursor-pointer hover:border-[#0B6AB5] transition-all card-hover"
                    >
                      <div className="space-y-1">
                        <span className="font-extrabold text-sm text-[var(--text-main)] block">{task.type}</span>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(task.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)] col-span-2 py-6 text-center">No vaccination tasks scheduled.</p>
                )}
              </div>
            </div>

            {/* Medical Treatment Checkups */}
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600" /> Veterinary Treatments & Clinical Notes
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Historical illnesses, antibiotic doses, and veterinary checkups</p>
                </div>

                <button
                  onClick={() => setIsLoggingMedical(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Treatment
                </button>
              </div>

              <div className="space-y-3">
                {medicalLogs && medicalLogs.length > 0 ? (
                  medicalLogs.map(med => (
                    <div key={med.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-rose-800 text-sm">{med.condition}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">{new Date(med.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[var(--text-main)] font-medium">
                        <strong>Treatment Administered:</strong> {med.treatment}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">No medical treatments logged for this cow.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Calving & Lineage */}
        {activeTab === 'calving' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-[var(--text-main)]">Calving & Reproductive Record</h3>
              <p className="text-xs text-[var(--text-muted)]">Total calves delivered, pregnancy milestones, and farm descendants</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reproductive Summary */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <span className="font-black text-[#0B6AB5] uppercase tracking-wider text-[11px] block">Breeding Summary</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-[var(--text-muted)] font-bold">Total Calves:</span>
                  <span className="font-extrabold text-[var(--text-main)]">{cow.noOfCalves || 0} Calves</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-[var(--text-muted)] font-bold">Current Status:</span>
                  <span className="font-extrabold text-[#0B6AB5]">{cow.status}</span>
                </div>
                {cow.pregnancyStartDate && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-[var(--text-muted)] font-bold">Pregnancy Insemination Date:</span>
                    <span className="font-extrabold text-[var(--text-main)]">{new Date(cow.pregnancyStartDate).toLocaleDateString()}</span>
                  </div>
                )}
                {cow.expectedCalvingDate && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-[var(--text-muted)] font-bold">Expected Calving Date:</span>
                    <span className="font-extrabold text-blue-900">{new Date(cow.expectedCalvingDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Registered Descendants */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <span className="font-black text-[#249D4A] uppercase tracking-wider text-[11px] block">Registered Calves on Farm</span>
                {offspring && offspring.length > 0 ? (
                  <div className="space-y-2">
                    {offspring.map(child => (
                      <Link 
                        key={child.id} 
                        href={`/portal/admin/cows/${child.tag}`}
                        className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#0B6AB5] transition-all card-hover"
                      >
                        <div>
                          <span className="font-extrabold text-[var(--text-main)] block">Tag #{child.tag} ({child.name})</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{child.breed} • {child.gender || 'Female'}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] py-4">No registered offspring recorded in livestock directory.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Quick Log Milk */}
      {isLoggingMilk && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative animate-slide-up">
            <button onClick={() => setIsLoggingMilk(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0B6AB5] flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[var(--text-main)]">Log Milk Yield</h2>
                <p className="text-xs text-[var(--text-muted)]">Record yield for Tag {cow.tag}</p>
              </div>
            </div>

            <form onSubmit={handleAddMilkLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Yield (in Liters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0"
                  autoFocus
                  value={newMilkYield}
                  onChange={e => setNewMilkYield(e.target.value)}
                  placeholder="e.g. 14.5"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 text-lg font-black text-[var(--text-main)] focus:outline-none focus:border-[#0B6AB5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Session Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newMilkTime}
                  onChange={e => setNewMilkTime(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none focus:border-[#0B6AB5]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsLoggingMilk(false)} className="px-5 py-2.5 font-bold text-xs text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 font-bold text-xs text-white bg-[#0B6AB5] hover:bg-[#085491] rounded-xl shadow-md transition-all">
                  Save Milk Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick Log Treatment */}
      {isLoggingMedical && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative animate-slide-up">
            <button onClick={() => setIsLoggingMedical(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[var(--text-main)]">Record Medical Treatment</h2>
                <p className="text-xs text-[var(--text-muted)]">Clinical notes for Tag {cow.tag}</p>
              </div>
            </div>

            <form onSubmit={handleAddMedicalLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Condition / Diagnosis
                </label>
                <input
                  type="text"
                  required
                  value={newMedicalCondition}
                  onChange={e => setNewMedicalCondition(e.target.value)}
                  placeholder="e.g. Mastitis, Fever, Hoof Trim"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Treatment / Medication Administered
                </label>
                <textarea
                  required
                  rows={3}
                  value={newMedicalTreatment}
                  onChange={e => setNewMedicalTreatment(e.target.value)}
                  placeholder="e.g. Antibiotic 10ml, Anti-inflammatory injection..."
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsLoggingMedical(false)} className="px-5 py-2.5 font-bold text-xs text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all">
                  Save Medical Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Profile */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative animate-slide-up">
            <button onClick={() => setIsEditing(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6">Edit Animal: {cow.tag}</h2>
            
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-4xl overflow-hidden mb-4 relative group">
                  {editCow.picture_url ? (
                    <img src={editCow.picture_url} className="w-full h-full object-cover" alt="Preview" />
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
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Name</label>
                <input type="text" required value={editCow.name || ''} onChange={e => setEditCow({...editCow, name: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[#0B6AB5]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Gender</label>
                <select 
                  value={editCow.gender || 'Female'} 
                  onChange={e => {
                    const g = e.target.value as 'Female' | 'Male';
                    setEditCow({
                      ...editCow, 
                      gender: g,
                      status: g === 'Male' ? 'Male' : (editCow.status === 'Male' ? 'Lactating' : editCow.status)
                    });
                  }} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[#0B6AB5]"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Breed</label>
                <input type="text" value={editCow.breed || ''} onChange={e => setEditCow({...editCow, breed: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[#0B6AB5]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Birth Date</label>
                <input type="date" required value={editCow.birthDate || ''} onChange={e => setEditCow({...editCow, birthDate: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[#0B6AB5]" />
              </div>
              
              {editCow.gender === 'Female' ? (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</label>
                  <select value={editCow.status || 'Lactating'} onChange={e => setEditCow({...editCow, status: e.target.value as any})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[#0B6AB5]">
                    <option value="Lactating">Lactating</option>
                    <option value="Dry">Dry</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Colostrum">Colostrum</option>
                    <option value="Heifer">Heifer (Non-Lactating)</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Registered as Male Livestock</span>
                </div>
              )}

              {editCow.gender === 'Female' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Number of Calves</label>
                  <input type="number" min="0" value={editCow.noOfCalves || 0} onChange={e => setEditCow({...editCow, noOfCalves: Number(e.target.value)})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[#0B6AB5]" />
                </div>
              )}

              {/* Pedigree Dam & Sire Edit */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Mother / Dam Tag (Optional)</label>
                  <input 
                    type="text" 
                    value={editCow.motherTag || ''} 
                    onChange={e => setEditCow({...editCow, motherTag: e.target.value})} 
                    className="w-full bg-white border border-[var(--border)] rounded-xl py-2.5 px-3.5 text-sm font-bold focus:outline-none focus:border-[#0B6AB5]" 
                    placeholder="e.g. T-045" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Father / Sire Tag or Breed (Optional)</label>
                  <input 
                    type="text" 
                    value={editCow.fatherTag || ''} 
                    onChange={e => setEditCow({...editCow, fatherTag: e.target.value})} 
                    className="w-full bg-white border border-[var(--border)] rounded-xl py-2.5 px-3.5 text-sm font-bold focus:outline-none focus:border-[#0B6AB5]" 
                    placeholder="e.g. Bull-02 / Sahiwal Sire" 
                  />
                </div>
              </div>

              {/* Pregnancy Settings */}
              {editCow.gender === 'Female' && editCow.status === 'Pregnant' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <div className="md:col-span-2">
                    <h4 className="font-bold text-blue-900 mb-1">Pregnancy Details</h4>
                    <p className="text-xs text-blue-700">Expected calving date will be calculated automatically (~283 days from start).</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Pregnancy Start Date</label>
                    <input type="date" required value={editCow.pregnancyStartDate || ''} onChange={e => setEditCow({...editCow, pregnancyStartDate: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Sire/Upcoming Breed (Optional)</label>
                    <input type="text" value={editCow.upcomingCalfBreed || ''} onChange={e => setEditCow({...editCow, upcomingCalfBreed: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500" placeholder="e.g. Sahiwal" />
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[#0B6AB5] hover:bg-[#085491] rounded-xl shadow-md transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Schedule Vaccination */}
      {isScheduling && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative animate-slide-up">
            <button onClick={() => setIsScheduling(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Syringe className="w-5 h-5 text-amber-600" />
              Schedule Task for Tag {cow.tag}
            </h2>
            
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Task Type (e.g., FMD Vaccine, Deworming)</label>
                <input type="text" required value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500" placeholder="Vaccination / Task Name..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Scheduled Date</label>
                <input type="date" required value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsScheduling(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all">Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Task Completion / Rescheduling */}
      {selectedTaskForEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative animate-slide-up">
            <button 
              onClick={() => { setSelectedTaskForEdit(null); setIsReschedulingTask(false); }} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            <div className="mb-6 flex flex-col items-center text-center mt-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-3">
                <Syringe className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-[var(--text-main)] mb-0.5">{selectedTaskForEdit.type}</h2>
              <p className="text-xs font-bold text-[var(--text-muted)]">Target Livestock: Tag #{selectedTaskForEdit.tag}</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Scheduled Date</p>
                  <p className="font-extrabold text-sm text-[var(--text-main)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" /> {new Date(selectedTaskForEdit.date).toLocaleDateString()}
                  </p>
                </div>
                {selectedTaskForEdit.status === 'pending' && !isReschedulingTask && (
                  <button
                    onClick={() => setIsReschedulingTask(true)}
                    className="text-xs font-bold text-[#0B6AB5] hover:underline px-2.5 py-1 bg-white border border-[var(--border)] rounded-lg shadow-sm"
                  >
                    Edit / Reschedule
                  </button>
                )}
              </div>
            </div>

            {/* Reschedule Form */}
            {isReschedulingTask && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Reschedule Date / Name</h4>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Task Type</label>
                  <input 
                    type="text" 
                    value={rescheduledType} 
                    onChange={e => setRescheduledType(e.target.value)} 
                    className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">New Scheduled Date</label>
                  <input 
                    type="date" 
                    value={rescheduledDate} 
                    onChange={e => setRescheduledDate(e.target.value)} 
                    className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsReschedulingTask(false)} 
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleReschedule} 
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#0B6AB5] hover:bg-[#085491] rounded-lg shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {selectedTaskForEdit.status === 'completed' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Task Already Completed
              </div>
            ) : (() => {
              const today = new Date();
              today.setHours(0,0,0,0);
              const taskDate = new Date(selectedTaskForEdit.date);
              taskDate.setHours(0,0,0,0);
              const isFuture = taskDate.getTime() > today.getTime();

              if (isFuture) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        This vaccination is scheduled for a future date ({new Date(selectedTaskForEdit.date).toLocaleDateString()}). You can reschedule the date above if performed today.
                      </span>
                    </div>
                    <button 
                      disabled 
                      className="w-full py-3 rounded-xl font-bold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200 text-xs"
                    >
                      Cannot Complete Before Scheduled Date
                    </button>
                  </div>
                );
              }

              return (
                <button 
                  onClick={handleCompleteTask}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Completed
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
