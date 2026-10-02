'use client';

import { useState } from 'react';
import { db } from '../../../../db/db';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function MedicalEntry() {
  const router = useRouter();
  const [tag, setTag] = useState('');
  const [condition, setCondition] = useState('');
  const [treatment, setTreatment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag || !condition || !treatment) return;
    
    setIsSubmitting(true);
    
    try {
      await db.MedicalLogs.add({
        tag: tag.toUpperCase(),
        condition,
        treatment,
        timestamp: new Date().toISOString(),
        isSynced: false // Will be synced by the background sync hook
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTag('');
        setCondition('');
        setTreatment('');
      }, 2000);
    } catch (error) {
      console.error('Failed to save log', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/portal/employee" className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">Medical Entry</h1>
          <p className="text-[var(--text-muted)] text-sm font-medium">Record health condition and treatment</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-md relative overflow-hidden">
        {success && (
          <div className="absolute inset-0 bg-green-500/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-white spring-transition">
            <CheckCircle2 className="w-16 h-16 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold">Saved Locally</h2>
            <p className="text-green-100 font-medium mt-1">Ready for next entry</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Cow Tag Number</label>
            <input 
              type="text" 
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. 1042"
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl p-4 text-xl font-bold focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all uppercase"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Condition / Symptoms</label>
            <input 
              type="text" 
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Mastitis, Limping"
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl p-4 text-lg font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Treatment Given</label>
            <textarea 
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="e.g. Administered 5ml antibiotics..."
              rows={3}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl p-4 text-lg font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all resize-none"
              required
            ></textarea>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-lg py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  )
}
