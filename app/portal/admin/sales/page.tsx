'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../../../../db/db';
import { useState, useMemo } from 'react';
import { BadgeDollarSign, Truck, CheckCircle2, AlertCircle, Milk, Info } from 'lucide-react';

export default function SalesDispatch() {
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  const [volume, setVolume] = useState<number | ''>('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const customers = useLiveQuery(() => db.Customers.toArray(), []);
  const milkingLogs = useLiveQuery(() => db.MilkingLogs.toArray(), []);
  const allSalesLogs = useLiveQuery(() => db.SalesLogs.toArray(), []);

  const activeCustomer = customers?.find(c => c.id === selectedCustomer);

  // Calculate live inventory stock
  const { totalProducedMilk, totalDispatchedMilk, availableStock } = useMemo(() => {
    const produced = milkingLogs ? milkingLogs.reduce((sum, l) => sum + (l.yieldLiters || 0), 0) : 0;
    const dispatched = allSalesLogs ? allSalesLogs.reduce((sum, s) => sum + (s.volumeLiters || (s as any).litersSold || 0), 0) : 0;
    const available = Math.max(0, produced - dispatched);
    return {
      totalProducedMilk: produced,
      totalDispatchedMilk: dispatched,
      availableStock: available
    };
  }, [milkingLogs, allSalesLogs]);

  const calculateTotal = () => {
    if (activeCustomer && volume) {
      return activeCustomer.customRate * Number(volume);
    }
    return 0;
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const requestedVolume = Number(volume);
    if (!selectedCustomer || !requestedVolume) return;

    if (requestedVolume > availableStock) {
      setErrorMsg(`Dispatch volume exceeds available milk in stock! You only have ${availableStock.toLocaleString()} Liters available.`);
      return;
    }

    const totalPKR = calculateTotal();
    await db.SalesLogs.add({
      customerId: Number(selectedCustomer),
      volumeLiters: requestedVolume,
      totalPKR,
      timestamp: new Date().toISOString(),
      isSynced: false
    });

    setSuccessMsg(`Successfully dispatched ${requestedVolume} L to ${activeCustomer?.name}. Total: ₨ ${totalPKR.toLocaleString()}`);
    setSelectedCustomer('');
    setVolume('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const isVolumeExceeded = Number(volume) > availableStock;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Sales Dispatch</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Log outgoing milk shipments with live stock tracking</p>
      </div>

      {/* Stock Summary Banner */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border)]">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Total Yield</span>
          <span className="text-xl font-black text-[var(--text-main)] mt-1 block">{totalProducedMilk.toLocaleString()} L</span>
        </div>
        <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border)]">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Sold to Date</span>
          <span className="text-xl font-black text-amber-700 mt-1 block">{totalDispatchedMilk.toLocaleString()} L</span>
        </div>
        <div className="p-3 bg-green-50 rounded-2xl border border-green-200">
          <span className="text-[11px] font-bold text-green-800 uppercase tracking-wider block">Available Stock</span>
          <span className="text-xl font-black text-green-700 mt-1 block">{availableStock.toLocaleString()} L</span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl flex items-center gap-3 spring-transition shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-3 spring-transition shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm">{errorMsg}</span>
        </div>
      )}

      <div className="bg-[var(--bg-card)] rounded-3xl p-8 border border-[var(--border)] luxury-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--accent-light)] opacity-20 rounded-bl-full pointer-events-none"></div>
        
        <form onSubmit={handleDispatch} className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-bold text-[var(--text-main)] mb-2">Select Customer</label>
            <select 
              required
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(Number(e.target.value) || '')}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-4 px-4 text-lg font-medium focus:outline-none focus:border-[var(--primary)] text-[var(--text-main)]"
            >
              <option value="" disabled>-- Choose a customer --</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone}) - ₨ {c.customRate}/L</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-[var(--text-main)]">Volume Dispatched (Liters)</label>
              <span className={`text-xs font-bold ${isVolumeExceeded ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
                Max Available: {availableStock.toLocaleString()} L
              </span>
            </div>
            <input 
              type="number" 
              required
              step="0.5"
              min="0.5"
              max={availableStock}
              value={volume}
              onChange={(e) => {
                setErrorMsg('');
                setVolume(Number(e.target.value) || '');
              }}
              placeholder={`Max: ${availableStock}`}
              className={`w-full bg-[var(--bg-main)] border rounded-xl py-4 px-4 text-2xl font-black focus:outline-none transition-colors ${
                isVolumeExceeded 
                  ? 'border-red-500 text-red-700 focus:border-red-600' 
                  : 'border-[var(--border)] text-[var(--text-main)] focus:border-[var(--primary)]'
              }`}
            />
            {isVolumeExceeded && (
              <p className="text-xs font-bold text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Entered volume exceeds total milk available ({availableStock.toLocaleString()} L).
              </p>
            )}
          </div>

          {activeCustomer && (
            <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-wider">Agreed Rate</span>
                <span className="font-black text-[var(--text-main)]">₨ {activeCustomer.customRate} / L</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                <span className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-wider">Total Value</span>
                <span className="text-3xl font-black text-[var(--primary)]">
                  ₨ {calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={!selectedCustomer || !volume || isVolumeExceeded || availableStock <= 0}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 text-lg mt-4"
          >
            <Truck className="w-6 h-6" />
            {availableStock <= 0 ? 'No Stock Available' : isVolumeExceeded ? 'Volume Exceeds Stock' : 'Confirm Dispatch'}
          </button>
        </form>
      </div>
    </div>
  );
}
