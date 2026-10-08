'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Milk, Wheat, Users, ReceiptText, Activity, TrendingUp,
  ArrowRight, Check, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const TOUR_STEPS = [
  {
    icon: TrendingUp,
    iconColor: 'text-[#0B6AB5]',
    iconBg: 'bg-blue-50',
    title: 'Your Farm Command Center',
    desc: 'This dashboard shows your real-time P&L — today\'s milk yield, cash collected, feed cost, and net profit margin — all updated the moment your staff logs data.',
    action: 'From here, click any metric card to drill into details.',
  },
  {
    icon: Milk,
    iconColor: 'text-[#249D4A]',
    iconBg: 'bg-emerald-50',
    title: 'Log Milking Sessions',
    desc: 'Go to Milking to record morning and evening yields per cow. The system auto-ranks your top producers and flags any sudden yield drop so you catch illness early.',
    action: 'Navigate via the sidebar: Milking Station.',
  },
  {
    icon: Wheat,
    iconColor: 'text-amber-700',
    iconBg: 'bg-amber-50',
    title: 'Feed & Silage Inventory',
    desc: 'Add your silage pit, sorghum bales, or concentrate bags here. Set the total cost and duration — Lactis automatically amortizes the cost per day so your P&L stays accurate.',
    action: 'Navigate to Feed Inventory to add your first stock.',
  },
  {
    icon: ReceiptText,
    iconColor: 'text-purple-700',
    iconBg: 'bg-purple-50',
    title: 'Customer Khata & Dispatch',
    desc: 'Each customer gets a running ledger. Record daily milk dispatches, mark cash collected, and see outstanding credit balances at a glance — no paper needed.',
    action: 'Open Customers to add your first buyer.',
  },
  {
    icon: Activity,
    iconColor: 'text-rose-700',
    iconBg: 'bg-rose-50',
    title: 'Health, Calving & Vaccines',
    desc: 'Schedule FMD, Anthrax, and deworming tasks. Lactis sends you automated alerts 30 days before a cow\'s expected calving so you can prepare colostrum care in time.',
    action: 'Visit Tasks to schedule your first vaccination.',
  },
  {
    icon: Users,
    iconColor: 'text-teal-700',
    iconBg: 'bg-teal-50',
    title: 'Staff & Employee Portal',
    desc: 'Add your milkers and feeders as employees. They log in via the Employee Kiosk (no full admin access) and can record milking sessions and mark tasks complete.',
    action: 'Go to Employees to add your first staff member.',
  },
];

const TOUR_KEY = 'lactis_welcome_tour_done';

export default function WelcomeTour() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Small delay so dashboard renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 tour-backdrop" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 space-y-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Step {step + 1} of {TOUR_STEPS.length}
            </span>
            <button onClick={dismiss} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${current.iconColor}`} />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-black text-[var(--text-main)]">{current.title}</h3>
            <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">{current.desc}</p>
          </div>

          {/* Action hint */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#0B6AB5]/6 border border-[#0B6AB5]/15">
            <ArrowRight className="w-4 h-4 text-[#0B6AB5] shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-[#0B6AB5]">{current.action}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 h-2 bg-[#0B6AB5]' : i < step ? 'w-2 h-2 bg-[#249D4A]' : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-1">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0B6AB5] to-[#249D4A] text-white font-black text-xs tracking-wide shadow-md hover:opacity-95 transition-all active:scale-95"
            >
              {isLast ? (
                <><Check className="w-4 h-4" /> Start Managing My Farm</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {!isLast && (
            <button onClick={dismiss} className="w-full text-center text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium transition-colors">
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
