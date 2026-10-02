'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, VaccinationTask } from '../../../../db/db';
import { Syringe, Clock, CheckCircle2, CircleDashed, Calendar, X, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function AdminTasksHistory() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<VaccinationTask | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [rescheduledType, setRescheduledType] = useState('');

  const tasks = useLiveQuery(() => db.VaccinationTasks.toArray(), []);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered = tasks;
    if (filter !== 'all') {
      filtered = tasks.filter(t => t.status === filter);
    }
    // Sort by most recent first
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tasks, filter]);

  const handleCompleteTask = async () => {
    if (selectedTask && selectedTask.id) {
      await db.VaccinationTasks.update(selectedTask.id, { status: 'completed' });
      setSelectedTask(null);
      setIsRescheduling(false);
    }
  };

  const handleReschedule = async () => {
    if (selectedTask && selectedTask.id && rescheduledDate) {
      await db.VaccinationTasks.update(selectedTask.id, {
        date: rescheduledDate,
        type: rescheduledType || selectedTask.type
      });
      setSelectedTask({
        ...selectedTask,
        date: rescheduledDate,
        type: rescheduledType || selectedTask.type
      });
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Medical & Tasks History</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Complete log of all herd vaccinations and treatments</p>
        </div>
        <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
          {['all', 'pending', 'completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                filter === f 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="pb-3 font-bold px-4">Event Type</th>
                <th className="pb-3 font-bold px-4">Target Animal(s)</th>
                <th className="pb-3 font-bold px-4">Scheduled Date</th>
                <th className="pb-3 font-bold px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedTasks.map((task) => (
                <tr 
                  key={task.id} 
                  className="hover:bg-[var(--bg-main)] transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedTask(task);
                    setRescheduledDate(task.date);
                    setRescheduledType(task.type);
                    setIsRescheduling(false);
                  }}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Syringe className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-[var(--text-main)]">{task.type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-[var(--bg-main)] text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[var(--border)]">
                      {task.herdWide ? 'Entire Herd' : `Tag: ${task.tag}`}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium text-[var(--text-muted)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {new Date(task.date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      task.status === 'completed' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {task.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                      <span className="capitalize">{task.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[var(--text-muted)] font-medium">
                    No medical records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details / Reschedule Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative">
            <button 
              onClick={() => setSelectedTask(null)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            <div className="mb-6 flex flex-col items-center text-center mt-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Syringe className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)] mb-1">{selectedTask.type}</h2>
              <p className="text-sm font-bold text-[var(--text-muted)]">Target: {selectedTask.herdWide ? 'Entire Herd' : selectedTask.tag}</p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Scheduled Date</p>
                  <p className="font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" /> {new Date(selectedTask.date).toLocaleDateString()}
                  </p>
                </div>
                {selectedTask.status === 'pending' && !isRescheduling && (
                  <button
                    onClick={() => setIsRescheduling(true)}
                    className="text-xs font-bold text-[var(--primary)] hover:underline px-2.5 py-1 bg-white border border-[var(--border)] rounded-lg shadow-sm"
                  >
                    Edit / Reschedule
                  </button>
                )}
              </div>
            </div>

            {/* Reschedule Form */}
            {isRescheduling && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Reschedule Date / Name</h4>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Task Type</label>
                  <input 
                    type="text" 
                    value={rescheduledType} 
                    onChange={e => setRescheduledType(e.target.value)} 
                    className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">New Scheduled Date</label>
                  <input 
                    type="date" 
                    value={rescheduledDate} 
                    onChange={e => setRescheduledDate(e.target.value)} 
                    className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsRescheduling(false)} 
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleReschedule} 
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {selectedTask.status === 'completed' ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center text-sm font-bold text-green-700 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Task Already Completed
              </div>
            ) : (() => {
              const today = new Date();
              today.setHours(0,0,0,0);
              const taskDate = new Date(selectedTask.date);
              taskDate.setHours(0,0,0,0);
              const isFuture = taskDate.getTime() > today.getTime();

              if (isFuture) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        This vaccination is scheduled for a future date ({new Date(selectedTask.date).toLocaleDateString()}) and cannot be completed in advance. You can reschedule the date above if performed today.
                      </span>
                    </div>
                    <button 
                      disabled 
                      className="w-full py-3.5 rounded-xl font-bold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200 text-sm"
                    >
                      Cannot Complete Before Scheduled Date
                    </button>
                  </div>
                );
              }

              return (
                <button 
                  onClick={handleCompleteTask}
                  className="w-full py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" /> Mark as Completed
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
