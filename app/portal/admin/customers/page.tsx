'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer, SalesLog, CustomerPayment, trackLocalDeletion } from '../../../../db/db';
import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Trash2, Edit, ChevronDown, ChevronUp, TrendingUp, 
  DollarSign, Milk, CreditCard, Receipt, X, ArrowDownLeft, ArrowUpRight, 
  CheckCircle2, Clock, Wallet, Phone, MapPin, Sparkles, Building2 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CustomersRoster() {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', phone: '', address: '', customRate: 150 });
  
  // Ledger / Khata Drawer State
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  
  // Payment Receipt Modal State
  const [isReceivingPayment, setIsReceivingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    customerId: number | null;
    amountPKR: number | undefined;
    paymentDate: string;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'JazzCash / EasyPaisa' | 'Other';
    notes: string;
  }>({
    customerId: null,
    amountPKR: undefined,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    notes: ''
  });

  const customers = useLiveQuery(() => db.Customers.toArray(), []);
  const allSalesLogs = useLiveQuery(() => db.SalesLogs.toArray(), []);
  const allPayments = useLiveQuery(() => db.CustomerPayments.toArray(), []);

  // Map customer finances
  const customerFinancials = useMemo(() => {
    const map: Record<number, { totalBilled: number; totalVolume: number; totalPaid: number; balanceDue: number; dispatchesCount: number }> = {};
    
    if (customers) {
      customers.forEach(c => {
        if (c.id) {
          map[c.id] = { totalBilled: 0, totalVolume: 0, totalPaid: 0, balanceDue: 0, dispatchesCount: 0 };
        }
      });
    }

    if (allSalesLogs) {
      allSalesLogs.forEach(s => {
        if (s.customerId && map[s.customerId]) {
          const amt = s.totalPKR || 0;
          const vol = (s.volumeLiters ?? (s as any).litersSold ?? 0) as number;
          map[s.customerId].totalBilled += amt;
          map[s.customerId].totalVolume += vol;
          map[s.customerId].dispatchesCount += 1;
        }
      });
    }

    if (allPayments) {
      allPayments.forEach(p => {
        if (p.customerId && map[p.customerId]) {
          map[p.customerId].totalPaid += (p.amountPKR || 0);
        }
      });
    }

    // Compute balance due (Billed - Paid)
    Object.keys(map).forEach(key => {
      const id = Number(key);
      map[id].balanceDue = map[id].totalBilled - map[id].totalPaid;
    });

    return map;
  }, [customers, allSalesLogs, allPayments]);

  // Overall Financial Totals
  const overallMetrics = useMemo(() => {
    let grandBilled = 0;
    let grandPaid = 0;
    let grandVolume = 0;
    let grandDue = 0;

    Object.values(customerFinancials).forEach(f => {
      grandBilled += f.totalBilled;
      grandPaid += f.totalPaid;
      grandVolume += f.totalVolume;
      grandDue += f.balanceDue;
    });

    return { grandBilled, grandPaid, grandVolume, grandDue, customerCount: customers?.length || 0 };
  }, [customerFinancials, customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
    );
  }, [customers, search]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomer.name && newCustomer.phone) {
      await db.Customers.add(newCustomer as Customer);
      setIsAdding(false);
      setNewCustomer({ name: '', phone: '', address: '', customRate: 150 });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer && editingCustomer.id) {
      await db.Customers.update(editingCustomer.id, {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        address: editingCustomer.address,
        customRate: Number(editingCustomer.customRate)
      });
      setEditingCustomer(null);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (customer.id && confirm(`Are you sure you want to remove ${customer.name} and their account?`)) {
      await trackLocalDeletion('customers', customer.uuid);
      await db.Customers.delete(customer.id);
      if (selectedCustomerForLedger?.id === customer.id) setSelectedCustomerForLedger(null);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.customerId && paymentForm.amountPKR !== undefined && paymentForm.amountPKR > 0) {
      await db.CustomerPayments.add({
        customerId: paymentForm.customerId,
        amountPKR: Number(paymentForm.amountPKR),
        paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes || '',
        isSynced: false
      });
      setIsReceivingPayment(false);
      setPaymentForm({
        customerId: null,
        amountPKR: undefined,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        notes: ''
      });
    }
  };

  const handleDeletePayment = async (paymentId?: number, paymentUuid?: string) => {
    if (paymentId && confirm('Delete this payment transaction record?')) {
      await trackLocalDeletion('customer_payments', paymentUuid);
      await db.CustomerPayments.delete(paymentId);
    }
  };

  // Build Unified Account Ledger Timeline for Selected Customer
  const selectedLedgerTimeline = useMemo(() => {
    if (!selectedCustomerForLedger?.id) return { entries: [], chartData: [] };
    const custId = selectedCustomerForLedger.id;

    const dispatches = (allSalesLogs || [])
      .filter(s => s.customerId === custId)
      .map(s => {
        const d = new Date(s.timestamp);
        const vol = (s.volumeLiters ?? (s as any).litersSold ?? 0) as number;
        const amt = (s.totalPKR || 0) as number;
        return {
          id: s.id,
          type: 'DISPATCH' as const,
          timestamp: d.getTime(),
          dateStr: d.toLocaleDateString(),
          timeStr: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          volume: vol,
          rate: vol > 0 ? (amt / vol).toFixed(0) : '-',
          amountBilled: amt,
          amountPaid: 0,
          notes: ''
        };
      });

    const payments = (allPayments || [])
      .filter(p => p.customerId === custId)
      .map(p => {
        const d = new Date(p.paymentDate);
        return {
          id: p.id,
          uuid: p.uuid,
          type: 'PAYMENT' as const,
          timestamp: d.getTime(),
          dateStr: d.toLocaleDateString(),
          timeStr: '',
          volume: 0,
          rate: '-',
          amountBilled: 0,
          amountPaid: p.amountPKR || 0,
          paymentMethod: p.paymentMethod,
          notes: p.notes
        };
      });

    // Sort chronologically ascending to calculate running balance
    const combined = [...dispatches, ...payments].sort((a, b) => a.timestamp - b.timestamp);

    let runningBal = 0;
    const timelineWithBalance = combined.map(item => {
      if (item.type === 'DISPATCH') {
        runningBal += item.amountBilled;
      } else {
        runningBal -= item.amountPaid;
      }
      return {
        ...item,
        runningBalance: runningBal
      };
    });

    // Chart Data
    const chartData = timelineWithBalance.map((item, idx) => ({
      key: `${item.dateStr}-${idx}`,
      date: item.dateStr,
      balance: item.runningBalance,
      billed: item.amountBilled,
      paid: item.amountPaid
    }));

    // Return reversed for newest on top in the table
    return {
      entries: [...timelineWithBalance].reverse(),
      chartData
    };
  }, [selectedCustomerForLedger, allSalesLogs, allPayments]);

  const selectedStats = selectedCustomerForLedger?.id ? (customerFinancials[selectedCustomerForLedger.id] || { totalBilled: 0, totalPaid: 0, balanceDue: 0, totalVolume: 0, dispatchesCount: 0 }) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[var(--primary)]" /> Customer Ledger & Credit Khata
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Track credit milk dispatches, manage payments, and monitor outstanding receivables.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Top KPI Financial Receivables Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Total Credit Billed</h3>
            <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">
            ₨ {overallMetrics.grandBilled.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            {overallMetrics.grandVolume.toLocaleString()} Liters dispatched total
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Total Cash Collected</h3>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-3xl font-black text-green-700">
            ₨ {overallMetrics.grandPaid.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Paid & cleared by customers
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Outstanding Receivables</h3>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className={`text-3xl font-black ${overallMetrics.grandDue > 0 ? 'text-rose-700' : 'text-green-700'}`}>
            ₨ {overallMetrics.grandDue.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Remaining Khata balance to collect
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Registered Buyers</h3>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-800">
            {overallMetrics.customerCount}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Active wholesale & retail accounts
          </p>
        </div>
      </div>

      {/* Add Customer Form */}
      {isAdding && (
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow mb-6">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">New Customer Registration</h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Name / Business Name</label>
              <input type="text" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold" placeholder="e.g. Al-Madina Sweets" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Phone Number</label>
              <input type="text" required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold" placeholder="e.g. 0300-1234567" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Custom Agreed Rate (₨ / Liter)</label>
              <input type="number" required min="1" value={newCustomer.customRate} onChange={e => setNewCustomer({...newCustomer, customRate: Number(e.target.value)})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] font-bold text-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Delivery Address / Shop Point</label>
              <input type="text" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)]" placeholder="e.g. Main Market, Shop #4" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">Cancel</button>
              <button type="submit" className="px-5 py-2.5 font-bold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-hover)] shadow-sm">Save Customer</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-xl w-full border border-[var(--border)] luxury-shadow relative">
            <h3 className="text-2xl font-black text-[var(--text-main)] mb-6">Edit Customer</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Name</label>
                <input type="text" required value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Phone</label>
                <input type="text" required value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Custom Agreed Rate (₨ / L)</label>
                <input type="number" required min="1" value={editingCustomer.customRate} onChange={e => setEditingCustomer({...editingCustomer, customRate: Number(e.target.value)})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-lg focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Address</label>
                <input type="text" value={editingCustomer.address || ''} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingCustomer(null)} className="px-5 py-2.5 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 font-bold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-hover)] shadow-md">Update Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Directory Table */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] luxury-shadow overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] relative">
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by customer name, phone, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-4 font-bold px-6">Customer Name</th>
                <th className="py-4 font-bold px-6">Agreed Rate</th>
                <th className="py-4 font-bold px-6">Total Billed</th>
                <th className="py-4 font-bold px-6">Total Paid</th>
                <th className="py-4 font-bold px-6">Balance Due (Khata)</th>
                <th className="py-4 font-bold px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredCustomers?.map((customer) => {
                const fin = customer.id ? (customerFinancials[customer.id] || { totalBilled: 0, totalPaid: 0, balanceDue: 0, totalVolume: 0, dispatchesCount: 0 }) : { totalBilled: 0, totalPaid: 0, balanceDue: 0, totalVolume: 0, dispatchesCount: 0 };
                const hasDue = fin.balanceDue > 0;

                return (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-[var(--bg-main)] transition-colors cursor-pointer group"
                    onClick={() => setSelectedCustomerForLedger(customer)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-[var(--text-main)] text-base group-hover:text-[var(--primary)] transition-colors">
                        {customer.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {customer.phone}
                        {customer.address && <span>• {customer.address}</span>}
                      </div>
                    </td>

                    <td className="py-4 px-6 font-bold text-sm text-[var(--text-main)]">
                      <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-lg text-xs font-bold">
                        ₨ {customer.customRate} / L
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-bold text-sm text-[var(--text-main)]">
                        ₨ {fin.totalBilled.toLocaleString()}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {fin.totalVolume.toLocaleString()} L ({fin.dispatchesCount} orders)
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-bold text-sm text-green-700">
                        ₨ {fin.totalPaid.toLocaleString()}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {hasDue ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock className="w-3 h-3" />
                            ₨ {fin.balanceDue.toLocaleString()} DUE
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" />
                            CLEARED
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setPaymentForm({
                            customerId: customer.id || null,
                            amountPKR: fin.balanceDue > 0 ? fin.balanceDue : undefined,
                            paymentDate: new Date().toISOString().split('T')[0],
                            paymentMethod: 'Cash',
                            notes: ''
                          });
                          setIsReceivingPayment(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-2xs"
                      >
                        + Pay
                      </button>

                      <button 
                        onClick={() => setSelectedCustomerForLedger(customer)} 
                        className="px-3 py-1.5 text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                      >
                        Khata Ledger →
                      </button>

                      <button 
                        onClick={() => setEditingCustomer(customer)} 
                        className="p-1.5 text-gray-400 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer)} 
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredCustomers?.length && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-medium">
                    No customer accounts found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: Individual Customer Complete Account Ledger & Khata */}
      {selectedCustomerForLedger && selectedStats && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedCustomerForLedger(null)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[var(--bg-card)] shadow-2xl z-50 border-l border-[var(--border)] p-8 overflow-y-auto transform transition-transform">
            <button onClick={() => setSelectedCustomerForLedger(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 mt-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center text-3xl font-black text-[var(--primary)] border-2 border-white shadow-sm">
                🥛
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--text-main)]">{selectedCustomerForLedger.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold px-2.5 py-0.5 rounded-md">
                    ₨ {selectedCustomerForLedger.customRate} / Liter
                  </span>
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {selectedCustomerForLedger.phone}
                  </span>
                </div>
                {selectedCustomerForLedger.address && (
                  <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selectedCustomerForLedger.address}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Overview Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Total Billed</span>
                <span className="text-lg font-black text-[var(--text-main)] mt-1 block">
                  ₨ {selectedStats.totalBilled.toLocaleString()}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{selectedStats.totalVolume.toLocaleString()} Liters</span>
              </div>

              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)]">
                <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider block">Total Paid</span>
                <span className="text-lg font-black text-green-700 mt-1 block">
                  ₨ {selectedStats.totalPaid.toLocaleString()}
                </span>
                <span className="text-[11px] text-green-600">Collected Cash</span>
              </div>

              <div className={`p-4 rounded-2xl border ${selectedStats.balanceDue > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">Khata Due</span>
                <span className="text-lg font-black mt-1 block">
                  ₨ {selectedStats.balanceDue.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold opacity-80">{selectedStats.balanceDue > 0 ? 'Pending Payment' : 'Cleared Balance'}</span>
              </div>
            </div>

            {/* Quick Action: Log Payment */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[var(--primary)]" /> Account Ledger & Dispatch Statement
              </h3>
              <button 
                onClick={() => {
                  setPaymentForm({
                    customerId: selectedCustomerForLedger.id || null,
                    amountPKR: selectedStats.balanceDue > 0 ? selectedStats.balanceDue : undefined,
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'Cash',
                    notes: ''
                  });
                  setIsReceivingPayment(true);
                }}
                className="px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Receive Cash / Payment
              </button>
            </div>

            {/* Ledger Transactions Table */}
            <div className="space-y-3 mb-6">
              {selectedLedgerTimeline.entries.map((item, idx) => (
                <div 
                  key={`${item.type}-${item.id}-${idx}`}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    item.type === 'DISPATCH' 
                      ? 'bg-[var(--bg-main)] border-[var(--border)]' 
                      : 'bg-green-50/70 border-green-200/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        item.type === 'DISPATCH' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-200 text-green-900'
                      }`}>
                        {item.type === 'DISPATCH' ? '🥛 MILK DISPATCH' : '💵 PAYMENT RECEIVED'}
                      </span>
                      <span className="text-xs font-medium text-[var(--text-muted)]">
                        {item.dateStr} {item.timeStr && `• ${item.timeStr}`}
                      </span>
                    </div>

                    {item.type === 'DISPATCH' ? (
                      <div className="text-xs text-[var(--text-main)] font-medium">
                        Dispatched: <strong>{item.volume} Liters</strong> @ ₨ {item.rate}/L
                      </div>
                    ) : (
                      <div className="text-xs text-green-800 font-medium">
                        Method: <strong>{item.paymentMethod}</strong> {item.notes && `• "${item.notes}"`}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    {item.type === 'DISPATCH' ? (
                      <div className="text-base font-black text-[var(--primary)]">
                        +₨ {item.amountBilled.toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-base font-black text-green-700">
                        -₨ {item.amountPaid.toLocaleString()}
                      </div>
                    )}
                    <div className="text-[11px] font-bold text-[var(--text-muted)] mt-0.5">
                      Khata: ₨ {item.runningBalance.toLocaleString()}
                    </div>
                    {item.type === 'PAYMENT' && (
                      <button 
                        onClick={() => handleDeletePayment(item.id, item.uuid)} 
                        className="text-[10px] text-red-400 hover:text-red-600 hover:underline font-bold mt-1 inline-block"
                      >
                        Delete entry
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {selectedLedgerTimeline.entries.length === 0 && (
                <div className="py-12 text-center text-[var(--text-muted)] font-medium border-2 border-dashed border-[var(--border)] rounded-2xl">
                  No dispatches or payment records found for this customer.
                </div>
              )}
            </div>

            {/* Dispatch Trend Graph */}
            {selectedLedgerTimeline.chartData.length > 0 && (
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Historical Khata Balance Trajectory
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedLedgerTimeline.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid vertical={false} horizontal={false} />
                      <XAxis dataKey="date" tick={{ fill: '#6C7A73', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6C7A73', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={val => `₨${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                      <Tooltip 
                        formatter={(val: any) => [`₨ ${Number(val).toLocaleString()}`, 'Balance Due']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Receive Payment / Khata Settlement */}
      {isReceivingPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-md w-full border border-[var(--border)] luxury-shadow relative">
            <button onClick={() => setIsReceivingPayment(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-green-600" /> Receive Customer Payment
            </h2>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Customer</label>
                <select 
                  required
                  value={paymentForm.customerId || ''}
                  onChange={e => {
                    const cId = Number(e.target.value);
                    const due = customerFinancials[cId]?.balanceDue || 0;
                    setPaymentForm({
                      ...paymentForm,
                      customerId: cId,
                      amountPKR: due > 0 ? due : undefined
                    });
                  }}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold text-sm focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="" disabled>-- Select Customer --</option>
                  {customers?.map(c => {
                    const due = c.id ? (customerFinancials[c.id]?.balanceDue || 0) : 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} (Khata Due: ₨ {due.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Amount Paid (PKR)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="any"
                  value={paymentForm.amountPKR ?? ''} 
                  onChange={e => setPaymentForm({ ...paymentForm, amountPKR: e.target.value === '' ? undefined : Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-2xl text-green-700 focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 15000" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Date</label>
                  <input 
                    type="date" 
                    required 
                    value={paymentForm.paymentDate} 
                    onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Method</label>
                  <select 
                    value={paymentForm.paymentMethod} 
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes / Description (Optional)</label>
                <input 
                  type="text" 
                  value={paymentForm.notes} 
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Received weekly partial payment via cash" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsReceivingPayment(false)} className="px-5 py-2.5 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-all">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
