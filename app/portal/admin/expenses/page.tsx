'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, ExpenseLog, trackLocalDeletion } from '../../../../db/db';
import { useState, useMemo } from 'react';
import { 
  ReceiptText, Plus, Search, Filter, Trash2, Edit2, X, 
  Zap, Fuel, Stethoscope, Wrench, Utensils, DollarSign, 
  Sparkles, CheckCircle2, TrendingUp, CreditCard
} from 'lucide-react';

const EXPENSE_PRESETS = [
  { title: 'WAPDA Electricity Bill (Tube Well & Shed)', category: 'Electricity / WAPDA', method: 'Bank Transfer' },
  { title: 'Tractor / Generator Diesel (50 Liters)', category: 'Fuel / Diesel', method: 'Cash' },
  { title: 'Veterinary Medicines & Injections', category: 'Veterinary & Medicine', method: 'Cash' },
  { title: 'Milking Machine Service & Spares', category: 'Maintenance & Repairs', method: 'Cash' },
  { title: 'Staff Mess Kitchen Ration (Mess)', category: 'Ration & Kitchen', method: 'Cash' },
  { title: 'Disinfectants, Lime & Cleaning Supplies', category: 'Labor & Incidentals', method: 'Cash' },
  { title: 'Water Bore Maintenance', category: 'Utilities', method: 'Cash' },
];

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');

  const [isAdding, setIsAdding] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseLog | null>(null);

  const currentMonthStr = useMemo(() => {
    return new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }, []);

  const [expenseForm, setExpenseForm] = useState<Partial<ExpenseLog>>({
    title: 'WAPDA Electricity Bill',
    category: 'Electricity / WAPDA',
    amountPKR: 28500,
    date: new Date().toISOString().split('T')[0],
    month: currentMonthStr,
    paymentMethod: 'Bank Transfer',
    billNumber: '',
    notes: ''
  });

  const expenseLogs = useLiveQuery(() => db.ExpenseLogs.toArray(), []);

  // Compute available months
  const availableMonths = useMemo(() => {
    if (!expenseLogs) return [];
    const months = new Set<string>();
    expenseLogs.forEach(exp => {
      if (exp.month) months.add(exp.month);
    });
    return Array.from(months);
  }, [expenseLogs]);

  // Financial Metrics
  const metrics = useMemo(() => {
    if (!expenseLogs) return { total: 0, thisMonth: 0, electricityTotal: 0, fuelTotal: 0, medicineTotal: 0, maintenanceTotal: 0 };
    
    let total = 0;
    let thisMonth = 0;
    let electricityTotal = 0;
    let fuelTotal = 0;
    let medicineTotal = 0;
    let maintenanceTotal = 0;

    expenseLogs.forEach(e => {
      const amt = e.amountPKR || 0;
      total += amt;

      if (e.month === currentMonthStr) {
        thisMonth += amt;
      }

      if (e.category === 'Electricity / WAPDA') electricityTotal += amt;
      if (e.category === 'Fuel / Diesel') fuelTotal += amt;
      if (e.category === 'Veterinary & Medicine') medicineTotal += amt;
      if (e.category === 'Maintenance & Repairs') maintenanceTotal += amt;
    });

    return { total, thisMonth, electricityTotal, fuelTotal, medicineTotal, maintenanceTotal };
  }, [expenseLogs, currentMonthStr]);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    if (!expenseLogs) return [];
    return expenseLogs.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(search.toLowerCase()) || 
        (item.billNumber && item.billNumber.toLowerCase().includes(search.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesMonth = monthFilter === 'All' || item.month === monthFilter;

      return matchesSearch && matchesCategory && matchesMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenseLogs, search, categoryFilter, monthFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.title && expenseForm.amountPKR !== undefined) {
      await db.ExpenseLogs.add({
        title: expenseForm.title,
        category: expenseForm.category as any || 'Other',
        amountPKR: Number(expenseForm.amountPKR),
        date: expenseForm.date || new Date().toISOString().split('T')[0],
        month: expenseForm.month || currentMonthStr,
        paymentMethod: expenseForm.paymentMethod as any || 'Cash',
        billNumber: expenseForm.billNumber || '',
        notes: expenseForm.notes || '',
        isSynced: false
      });
      setIsAdding(false);
      setExpenseForm({
        title: '',
        category: 'Electricity / WAPDA',
        amountPKR: undefined,
        date: new Date().toISOString().split('T')[0],
        month: currentMonthStr,
        paymentMethod: 'Cash',
        billNumber: '',
        notes: ''
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense && editingExpense.id) {
      await db.ExpenseLogs.update(editingExpense.id, {
        title: editingExpense.title,
        category: editingExpense.category,
        amountPKR: Number(editingExpense.amountPKR),
        date: editingExpense.date,
        month: editingExpense.month,
        paymentMethod: editingExpense.paymentMethod,
        billNumber: editingExpense.billNumber,
        notes: editingExpense.notes,
      });
      setEditingExpense(null);
    }
  };

  const handleDelete = async (log: ExpenseLog) => {
    if (log.id && confirm('Are you sure you want to delete this expense record?')) {
      await trackLocalDeletion('expense_logs', log.uuid);
      await db.ExpenseLogs.delete(log.id);
    }
  };

  const applyPreset = (preset: typeof EXPENSE_PRESETS[0], isEdit: boolean) => {
    if (isEdit && editingExpense) {
      setEditingExpense({
        ...editingExpense,
        title: preset.title,
        category: preset.category as any,
        paymentMethod: preset.method as any
      });
    } else {
      setExpenseForm({
        ...expenseForm,
        title: preset.title,
        category: preset.category as any,
        paymentMethod: preset.method as any
      });
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Electricity / WAPDA':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Fuel / Diesel':
        return <Fuel className="w-4 h-4 text-orange-500" />;
      case 'Veterinary & Medicine':
        return <Stethoscope className="w-4 h-4 text-rose-500" />;
      case 'Maintenance & Repairs':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'Ration & Kitchen':
        return <Utensils className="w-4 h-4 text-emerald-500" />;
      default:
        return <ReceiptText className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <ReceiptText className="w-8 h-8 text-rose-600" /> Farm Operating Expenses
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Record electricity & WAPDA bills, generator diesel, vet medicines, and farm maintenance.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-5 h-5" /> Log New Expense
        </button>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Total Operational Spend</h3>
            <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">
            ₨ {metrics.total.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            All-time operational expenses
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">This Month ({currentMonthStr.split(' ')[0]})</h3>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-700">
            ₨ {metrics.thisMonth.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Current month expenses
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Electricity / WAPDA</h3>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-700">
            ₨ {metrics.electricityTotal.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Tube well & shed power bills
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Fuel & Maintenance</h3>
            <Fuel className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-black text-orange-700">
            ₨ {(metrics.fuelTotal + metrics.maintenanceTotal).toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Diesel, repairs & machinery
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
              placeholder="Search expenses, bill #, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="All">All Expense Categories</option>
              <option value="Electricity / WAPDA">Electricity / WAPDA</option>
              <option value="Fuel / Diesel">Fuel / Diesel</option>
              <option value="Veterinary & Medicine">Veterinary & Medicine</option>
              <option value="Maintenance & Repairs">Maintenance & Repairs</option>
              <option value="Labor & Incidentals">Labor & Incidentals</option>
              <option value="Ration & Kitchen">Ration & Kitchen</option>
              <option value="Utilities">Utilities</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="All">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="pb-3 font-bold px-4">Date</th>
                <th className="pb-3 font-bold px-4">Expense Title</th>
                <th className="pb-3 font-bold px-4">Category</th>
                <th className="pb-3 font-bold px-4">Month</th>
                <th className="pb-3 font-bold px-4">Payment Method</th>
                <th className="pb-3 font-bold px-4 text-right">Amount (PKR)</th>
                <th className="pb-3 font-bold px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[var(--bg-main)] transition-colors group">
                  <td className="py-4 px-4 font-medium text-[var(--text-main)] text-sm">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>

                  <td className="py-4 px-4">
                    <div className="font-bold text-[var(--text-main)] text-base">{exp.title}</div>
                    {exp.billNumber && (
                      <div className="text-xs text-[var(--text-muted)] font-mono">
                        Ref/Bill: {exp.billNumber}
                      </div>
                    )}
                    {exp.notes && (
                      <div className="text-xs text-[var(--text-muted)] italic truncate max-w-[200px]">
                        &quot;{exp.notes}&quot;
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)]">
                      {getCategoryIcon(exp.category)}
                      {exp.category}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-bold text-sm text-[var(--text-main)]">
                    {exp.month}
                  </td>

                  <td className="py-4 px-4">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {exp.paymentMethod}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right font-black text-lg text-rose-700">
                    ₨ {exp.amountPKR?.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingExpense(exp)}
                      className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-medium">
                    No operating expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <ReceiptText className="w-6 h-6 text-rose-600" /> Log Farm Expense
            </h2>

            {/* Quick Presets */}
            <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">Common Expense Presets</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p, false)}
                    className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-rose-50 text-gray-700 hover:text-rose-900 border border-[var(--border)] rounded-lg transition-colors"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Expense Title / Description</label>
                <input 
                  type="text" 
                  required 
                  value={expenseForm.title} 
                  onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. WAPDA Electricity Bill - Tubewell" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Expense Category</label>
                <select 
                  value={expenseForm.category} 
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Electricity / WAPDA">Electricity / WAPDA</option>
                  <option value="Fuel / Diesel">Fuel / Diesel</option>
                  <option value="Veterinary & Medicine">Veterinary & Medicine</option>
                  <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                  <option value="Labor & Incidentals">Labor & Incidentals</option>
                  <option value="Ration & Kitchen">Ration & Kitchen</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Amount (PKR)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="any"
                  value={expenseForm.amountPKR ?? ''} 
                  onChange={e => setExpenseForm({ ...expenseForm, amountPKR: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-xl text-rose-700 focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="25000" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  value={expenseForm.date} 
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Applicable Month</label>
                <input 
                  type="text" 
                  required 
                  value={expenseForm.month} 
                  onChange={e => setExpenseForm({ ...expenseForm, month: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. August 2026" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Method</label>
                <select 
                  value={expenseForm.paymentMethod} 
                  onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Bill Reference # / Invoice (Optional)</label>
                <input 
                  type="text" 
                  value={expenseForm.billNumber || ''} 
                  onChange={e => setExpenseForm({ ...expenseForm, billNumber: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 14-2451-9874100" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes (Optional)</label>
                <input 
                  type="text" 
                  value={expenseForm.notes || ''} 
                  onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Paid online via HBL app" 
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Expense */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setEditingExpense(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-[var(--primary)]" /> Edit Expense
            </h2>

            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Expense Title / Description</label>
                <input 
                  type="text" 
                  required 
                  value={editingExpense.title} 
                  onChange={e => setEditingExpense({ ...editingExpense, title: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Expense Category</label>
                <select 
                  value={editingExpense.category} 
                  onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Electricity / WAPDA">Electricity / WAPDA</option>
                  <option value="Fuel / Diesel">Fuel / Diesel</option>
                  <option value="Veterinary & Medicine">Veterinary & Medicine</option>
                  <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                  <option value="Labor & Incidentals">Labor & Incidentals</option>
                  <option value="Ration & Kitchen">Ration & Kitchen</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Amount (PKR)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="any"
                  value={editingExpense.amountPKR} 
                  onChange={e => setEditingExpense({ ...editingExpense, amountPKR: Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-xl text-rose-700 focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingExpense.date} 
                  onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Applicable Month</label>
                <input 
                  type="text" 
                  required 
                  value={editingExpense.month} 
                  onChange={e => setEditingExpense({ ...editingExpense, month: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Method</label>
                <select 
                  value={editingExpense.paymentMethod} 
                  onChange={e => setEditingExpense({ ...editingExpense, paymentMethod: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Bill Reference # / Invoice</label>
                <input 
                  type="text" 
                  value={editingExpense.billNumber || ''} 
                  onChange={e => setEditingExpense({ ...editingExpense, billNumber: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes</label>
                <input 
                  type="text" 
                  value={editingExpense.notes || ''} 
                  onChange={e => setEditingExpense({ ...editingExpense, notes: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingExpense(null)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
