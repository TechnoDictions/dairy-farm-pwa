'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Livestock } from '../../../../db/db';
import { ArrowLeft, CheckCircle2, Clock, Syringe, Plus } from 'lucide-react';
import Link from 'next/link';

export default function TasksChecklist() {
  const [successMsg, setSuccessMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ type: '', tag: '', herdWide: false, date: new Date().toISOString().split('T')[0] });

  const tasks = useLiveQuery(
    () => db.VaccinationTasks.where('status').equals('pending').toArray(),
    []
  );

  const cows = useLiveQuery(() => db.Livestock.toArray(), []);

  const handleMarkComplete = async (id: number) => {
    try {
      await db.VaccinationTasks.update(id, { status: 'completed', isSynced: false });
      setSuccessMsg('Task marked as completed!');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.type) {
      await db.VaccinationTasks.add({
        type: newTask.type,
        date: newTask.date,
        status: 'pending',
        isSynced: false,
        herdWide: newTask.herdWide,
        tag: newTask.herdWide ? undefined : newTask.tag
      });
      setSuccessMsg('Medical event logged successfully!');
      setIsAdding(false);
      setNewTask({ type: '', tag: '', herdWide: false, date: new Date().toISOString().split('T')[0] });
      setTimeout(() => setSuccessMsg(''), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal/employee" className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">Operational Tasks</h1>
            <p className="text-[var(--text-muted)] text-sm font-medium">Daily checklist and health schedule</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[var(--primary)] text-white p-2.5 rounded-xl flex items-center gap-2 shadow-sm hover:bg-[var(--primary-hover)] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline font-bold">Add Event</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 spring-transition">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {isAdding && (
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Log Medical / Vaccination Event</h3>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Event Type / Name</label>
              <input type="text" required placeholder="e.g. FMD Vaccine, Mastitis Check" value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)]" />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" id="herdWide" checked={newTask.herdWide} onChange={e => setNewTask({...newTask, herdWide: e.target.checked})} className="w-4 h-4 text-[var(--primary)] rounded border-gray-300 focus:ring-[var(--primary)]" />
              <label htmlFor="herdWide" className="text-sm font-bold text-[var(--text-main)]">Apply to Entire Herd</label>
            </div>

            {!newTask.herdWide && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Select Animal Tag</label>
                <select required value={newTask.tag} onChange={e => setNewTask({...newTask, tag: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)]">
                  <option value="" disabled>-- Select a tag --</option>
                  {cows?.map(c => <option key={c.id} value={c.tag}>{c.tag} - {c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Scheduled Date</label>
              <input type="date" required value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)]" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">Cancel</button>
              <button type="submit" className="px-5 py-2.5 font-bold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-hover)]">Log Event</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {tasks && tasks.length > 0 ? (
          tasks.map(task => (
            <div key={task.id} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] luxury-shadow flex items-center justify-between group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">{task.type}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {task.herdWide ? 'Entire Herd' : `Tag: ${task.tag}`}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                      <Clock className="w-3.5 h-3.5" />
                      Due: {new Date(task.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleMarkComplete(task.id!)}
                className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-300 hover:border-green-500 hover:text-green-500 hover:bg-green-50 transition-all shrink-0"
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
            </div>
          ))
        ) : (
          <div className="bg-[var(--bg-card)] rounded-3xl p-12 border border-[var(--border)] text-center luxury-shadow">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)]">All Caught Up!</h3>
            <p className="text-[var(--text-muted)] mt-2">There are no pending operational tasks.</p>
          </div>
        )}
      </div>
    </div>
  )
}
