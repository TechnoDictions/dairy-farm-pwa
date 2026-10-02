'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Employee, SalaryPayment } from '../../../../db/db';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Upload, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  UserCheck, 
  Receipt,
  Wallet,
  Clock,
  Sparkles,
  Wheat,
  Milk,
  Home,
  Utensils,
  Zap,
  Tag
} from 'lucide-react';

const COMMON_FACILITIES = [
  { id: 'milk', label: '🥛 Milk Ration (Daily)', icon: Milk },
  { id: 'wheat', label: '🌾 Wheat (Gandam)', icon: Wheat },
  { id: 'housing', label: '🏠 Farm Housing / Room', icon: Home },
  { id: 'meals', label: '🍲 Mess / Daily Meals', icon: Utensils },
  { id: 'utilities', label: '⚡ Free Electricity / Utilities', icon: Zap },
];

export default function EmployeeManagementPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'ledger'>('directory');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  
  // Modals state
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPayingSalary, setIsPayingSalary] = useState(false);
  const [selectedEmployeeForLedger, setSelectedEmployeeForLedger] = useState<Employee | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Custom facility input state
  const [customFacilityText, setCustomFacilityText] = useState('');

  // Forms state
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '',
    role: 'Milker',
    phone: '',
    cnic: '',
    baseSalaryPKR: 10000,
    joinDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    picture_url: '',
    facilities: ['🥛 Milk Ration (Daily)']
  });

  const [paymentForm, setPaymentForm] = useState<Partial<SalaryPayment>>({
    employeeId: undefined,
    amountPKR: undefined,
    paymentDate: new Date().toISOString().split('T')[0],
    month: getCurrentMonthLabel(),
    paymentType: 'Salary',
    paymentMethod: 'Cash',
    notes: ''
  });

  function getCurrentMonthLabel() {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  // Database Queries
  const employees = useLiveQuery(() => db.Employees.toArray(), []);
  const salaryPayments = useLiveQuery(() => db.SalaryPayments.toArray(), []);

  // Employee Map
  const employeeMap = useMemo(() => {
    const map: Record<number, Employee> = {};
    if (employees) {
      employees.forEach(e => {
        if (e.id) map[e.id] = e;
      });
    }
    return map;
  }, [employees]);

  // Current Month String
  const currentMonthLabel = useMemo(() => getCurrentMonthLabel(), []);

  // Summary Metrics
  const metrics = useMemo(() => {
    if (!employees || !salaryPayments) {
      return { totalActive: 0, monthlyCommitment: 0, totalPaidThisMonth: 0, totalPaidAllTime: 0, pendingThisMonth: 0 };
    }

    const activeEmployees = employees.filter(e => e.status === 'Active');
    const totalActive = activeEmployees.length;
    const monthlyCommitment = activeEmployees.reduce((sum, e) => sum + (e.baseSalaryPKR || 0), 0);

    const thisMonthPayments = salaryPayments.filter(p => p.month === currentMonthLabel);
    const totalPaidThisMonth = thisMonthPayments.reduce((sum, p) => {
      if (p.paymentType === 'Deduction') return sum - (p.amountPKR || 0);
      return sum + (p.amountPKR || 0);
    }, 0);

    const totalPaidAllTime = salaryPayments.reduce((sum, p) => {
      if (p.paymentType === 'Deduction') return sum - (p.amountPKR || 0);
      return sum + (p.amountPKR || 0);
    }, 0);

    const pendingThisMonth = Math.max(0, monthlyCommitment - totalPaidThisMonth);

    return { totalActive, monthlyCommitment, totalPaidThisMonth, totalPaidAllTime, pendingThisMonth };
  }, [employees, salaryPayments, currentMonthLabel]);

  // Months available for filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthLabel);
    if (salaryPayments) {
      salaryPayments.forEach(p => {
        if (p.month) set.add(p.month);
      });
    }
    return Array.from(set);
  }, [salaryPayments, currentMonthLabel]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.phone.toLowerCase().includes(search.toLowerCase()) ||
                          e.role.toLowerCase().includes(search.toLowerCase()) ||
                          (e.facilities || []).some(f => f.toLowerCase().includes(search.toLowerCase()));
      const matchRole = roleFilter === 'All' || e.role.toLowerCase() === roleFilter.toLowerCase();
      return matchSearch && matchRole;
    });
  }, [employees, search, roleFilter]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    if (!salaryPayments) return [];
    return salaryPayments
      .filter(p => {
        const emp = p.employeeId ? employeeMap[p.employeeId] : null;
        const empName = emp ? emp.name.toLowerCase() : '';
        const matchSearch = empName.includes(search.toLowerCase()) || (p.notes || '').toLowerCase().includes(search.toLowerCase());
        const matchMonth = monthFilter === 'All' || p.month === monthFilter;
        return matchSearch && matchMonth;
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [salaryPayments, employeeMap, search, monthFilter]);

  // Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit && editingEmployee) {
          setEditingEmployee({ ...editingEmployee, picture_url: reader.result as string });
        } else {
          setNewEmployee({ ...newEmployee, picture_url: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Facilities Helpers
  const toggleFacility = (facilityLabel: string, isEdit = false) => {
    if (isEdit && editingEmployee) {
      const current = editingEmployee.facilities || [];
      const updated = current.includes(facilityLabel)
        ? current.filter(f => f !== facilityLabel)
        : [...current, facilityLabel];
      setEditingEmployee({ ...editingEmployee, facilities: updated });
    } else {
      const current = newEmployee.facilities || [];
      const updated = current.includes(facilityLabel)
        ? current.filter(f => f !== facilityLabel)
        : [...current, facilityLabel];
      setNewEmployee({ ...newEmployee, facilities: updated });
    }
  };

  const addCustomFacility = (isEdit = false) => {
    if (!customFacilityText.trim()) return;
    const text = customFacilityText.trim();
    if (isEdit && editingEmployee) {
      const current = editingEmployee.facilities || [];
      if (!current.includes(text)) {
        setEditingEmployee({ ...editingEmployee, facilities: [...current, text] });
      }
    } else {
      const current = newEmployee.facilities || [];
      if (!current.includes(text)) {
        setNewEmployee({ ...newEmployee, facilities: [...current, text] });
      }
    }
    setCustomFacilityText('');
  };

  const removeFacility = (facilityLabel: string, isEdit = false) => {
    if (isEdit && editingEmployee) {
      setEditingEmployee({
        ...editingEmployee,
        facilities: (editingEmployee.facilities || []).filter(f => f !== facilityLabel)
      });
    } else {
      setNewEmployee({
        ...newEmployee,
        facilities: (newEmployee.facilities || []).filter(f => f !== facilityLabel)
      });
    }
  };

  // Add Employee Submit
  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployee.name && newEmployee.phone) {
      const salary = Number(newEmployee.baseSalaryPKR);
      await db.Employees.add({
        name: newEmployee.name,
        role: newEmployee.role || 'Milker',
        phone: newEmployee.phone,
        cnic: newEmployee.cnic || '',
        baseSalaryPKR: isNaN(salary) || salary < 10000 ? 10000 : salary,
        joinDate: newEmployee.joinDate || new Date().toISOString().split('T')[0],
        status: newEmployee.status || 'Active',
        picture_url: newEmployee.picture_url || '',
        facilities: newEmployee.facilities || [],
        isSynced: false
      });
      setIsAddingEmployee(false);
      setNewEmployee({
        name: '',
        role: 'Milker',
        phone: '',
        cnic: '',
        baseSalaryPKR: 10000,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        picture_url: '',
        facilities: ['🥛 Milk Ration (Daily)']
      });
      setSuccessMsg('Employee registered successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Edit Employee Submit
  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee && editingEmployee.id) {
      const salary = Number(editingEmployee.baseSalaryPKR);
      await db.Employees.update(editingEmployee.id, {
        name: editingEmployee.name,
        role: editingEmployee.role,
        phone: editingEmployee.phone,
        cnic: editingEmployee.cnic,
        baseSalaryPKR: isNaN(salary) || salary < 10000 ? 10000 : salary,
        joinDate: editingEmployee.joinDate,
        status: editingEmployee.status,
        picture_url: editingEmployee.picture_url,
        facilities: editingEmployee.facilities || [],
        isSynced: false
      });
      setEditingEmployee(null);
      setSuccessMsg('Employee record updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Record Payment Submit (Supports ANY positive amount)
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentForm.amountPKR);
    if (paymentForm.employeeId && !isNaN(amount) && amount > 0) {
      await db.SalaryPayments.add({
        employeeId: Number(paymentForm.employeeId),
        amountPKR: amount,
        paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
        month: paymentForm.month || currentMonthLabel,
        paymentType: paymentForm.paymentType || 'Salary',
        paymentMethod: paymentForm.paymentMethod || 'Cash',
        notes: paymentForm.notes || '',
        isSynced: false
      });
      setIsPayingSalary(false);
      setPaymentForm({
        employeeId: undefined,
        amountPKR: undefined,
        paymentDate: new Date().toISOString().split('T')[0],
        month: currentMonthLabel,
        paymentType: 'Salary',
        paymentMethod: 'Cash',
        notes: ''
      });
      setSuccessMsg('Payment transaction logged successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Delete Payment
  const handleDeletePayment = async (id?: number) => {
    if (id && confirm('Are you sure you want to delete this payment record?')) {
      await db.SalaryPayments.delete(id);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (id?: number) => {
    if (id && confirm('Are you sure you want to remove this employee? Historical payment logs will remain intact.')) {
      await db.Employees.delete(id);
      if (selectedEmployeeForLedger?.id === id) {
        setSelectedEmployeeForLedger(null);
      }
    }
  };

  // Calculate employee current month paid
  const getEmployeePaidThisMonth = (empId: number) => {
    if (!salaryPayments) return 0;
    return salaryPayments
      .filter(p => p.employeeId === empId && p.month === currentMonthLabel)
      .reduce((sum, p) => p.paymentType === 'Deduction' ? sum - p.amountPKR : sum + p.amountPKR, 0);
  };

  // Calculate individual employee financial overview (clean month & all-time, no multi-month accruals)
  const selectedEmpStats = useMemo(() => {
    if (!selectedEmployeeForLedger || !salaryPayments) {
      return { 
        totalGivenAllTime: 0, 
        totalAdvancesAllTime: 0, 
        paidThisMonth: 0, 
        advanceThisMonth: 0, 
        remainingThisMonth: 0,
        monthStatus: 'Unpaid' 
      };
    }

    const empLogs = salaryPayments.filter(p => p.employeeId === selectedEmployeeForLedger.id);
    
    let totalGivenAllTime = 0;
    let totalAdvancesAllTime = 0;
    let paidThisMonth = 0;

    empLogs.forEach(p => {
      const amt = p.amountPKR || 0;
      if (p.paymentType === 'Deduction') {
        totalGivenAllTime -= amt;
      } else {
        totalGivenAllTime += amt;
      }

      if (p.paymentType === 'Advance') {
        totalAdvancesAllTime += amt;
      }

      if (p.month === currentMonthLabel) {
        if (p.paymentType === 'Deduction') {
          paidThisMonth -= amt;
        } else {
          paidThisMonth += amt;
        }
      }
    });

    const base = selectedEmployeeForLedger.baseSalaryPKR || 0;
    const advanceThisMonth = Math.max(0, paidThisMonth - base);
    const remainingThisMonth = Math.max(0, base - paidThisMonth);

    let monthStatus = 'Unpaid';
    if (paidThisMonth > base) {
      monthStatus = 'Advance';
    } else if (paidThisMonth === base) {
      monthStatus = 'Fully Paid';
    } else if (paidThisMonth > 0) {
      monthStatus = 'Partial';
    }

    return { 
      totalGivenAllTime, 
      totalAdvancesAllTime, 
      paidThisMonth, 
      advanceThisMonth, 
      remainingThisMonth,
      monthStatus 
    };
  }, [selectedEmployeeForLedger, salaryPayments, currentMonthLabel]);

  return (
    <div className="space-y-8 relative">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Users className="w-8 h-8 text-[var(--primary)]" /> Staff & Payroll Management
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Employee profiles, monthly facilities (wheat/milk), salary disbursals, and advance tracking
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => {
              setPaymentForm({
                employeeId: undefined,
                amountPKR: undefined,
                paymentDate: new Date().toISOString().split('T')[0],
                month: currentMonthLabel,
                paymentType: 'Salary',
                paymentMethod: 'Cash',
                notes: ''
              });
              setIsPayingSalary(true);
            }}
            className="bg-[var(--accent-light)] hover:bg-[var(--accent-light)]/80 text-[var(--text-main)] font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 border border-[var(--border)] shadow-sm transition-all"
          >
            <CreditCard className="w-4 h-4 text-[var(--primary)]" />
            Record Payment / Advance
          </button>
          <button 
            onClick={() => setIsAddingEmployee(true)}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-2xl flex items-center gap-3 spring-transition shadow-sm">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold text-sm">{successMsg}</span>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Active Staff</h3>
            <UserCheck className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">{metrics.totalActive}</div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            {employees?.length || 0} Total registered staff
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Monthly Commitment</h3>
            <Wallet className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-3xl font-black text-[var(--text-main)]">
            ₨ {metrics.monthlyCommitment.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Total active base salary
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-light)] opacity-20 rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Disbursed ({currentMonthLabel.split(' ')[0]})</h3>
            <CreditCard className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-3xl font-black text-green-700">
            ₨ {metrics.totalPaidThisMonth.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Salaries & advances paid
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] luxury-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-[var(--text-gold)] uppercase tracking-widest mb-2">Pending to Pay</h3>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-700">
            ₨ {metrics.pendingThisMonth.toLocaleString()}
          </div>
          <p className="text-xs font-medium text-[var(--text-muted)] mt-2">
            Remaining for {currentMonthLabel.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border)] luxury-shadow space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--border)]">
          {/* Tabs */}
          <div className="flex bg-[var(--bg-main)] p-1 rounded-2xl border border-[var(--border)]">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'directory' 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Users className="w-4 h-4" /> Staff Directory ({employees?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'ledger' 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Receipt className="w-4 h-4" /> Salary & Advance Ledger ({salaryPayments?.length || 0})
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input 
                type="text"
                placeholder="Search staff, phone, wheat, milk..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {activeTab === 'directory' ? (
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="All">All Roles</option>
                <option value="Milker">Milker</option>
                <option value="Feeder">Feeder</option>
                <option value="Doctor">Doctor (Vet)</option>
                <option value="Security">Security</option>
                <option value="Worker">Worker (General / Cleaning)</option>
              </select>
            ) : (
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
            )}
          </div>
        </div>

        {/* TAB 1: Staff Directory */}
        {activeTab === 'directory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-3 font-bold px-4">Employee</th>
                  <th className="pb-3 font-bold px-4">Role & Contact</th>
                  <th className="pb-3 font-bold px-4">Monthly Base</th>
                  <th className="pb-3 font-bold px-4">Monthly Facilities (Perks)</th>
                  <th className="pb-3 font-bold px-4">{currentMonthLabel.split(' ')[0]} Disbursal</th>
                  <th className="pb-3 font-bold px-4">Status</th>
                  <th className="pb-3 font-bold px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredEmployees.map((emp) => {
                  const paidThisMonth = emp.id ? getEmployeePaidThisMonth(emp.id) : 0;
                  const base = emp.baseSalaryPKR || 0;
                  const balance = base - paidThisMonth;
                  const advanceInMonth = paidThisMonth > base ? paidThisMonth - base : 0;

                  return (
                    <tr 
                      key={emp.id} 
                      className="hover:bg-[var(--bg-main)] transition-colors group cursor-pointer"
                      onClick={() => setSelectedEmployeeForLedger(emp)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-xl font-black text-[var(--primary)] border border-[var(--border)] overflow-hidden">
                            {emp.picture_url ? (
                              <img src={emp.picture_url} className="w-full h-full object-cover" alt={emp.name} />
                            ) : (
                              emp.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-main)] text-base">{emp.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">Joined {new Date(emp.joinDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] mb-1">
                          {emp.role}
                        </span>
                        <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {emp.phone}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-black text-[var(--text-main)] text-base">
                          ₨ {emp.baseSalaryPKR?.toLocaleString()}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">salary / month</div>
                      </td>

                      {/* Extra Monthly Facilities */}
                      <td className="py-4 px-4">
                        {emp.facilities && emp.facilities.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {emp.facilities.map((f, i) => (
                              <span key={i} className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">No extra facilities</span>
                        )}
                      </td>

                      {/* Current Month Status */}
                      <td className="py-4 px-4">
                        {advanceInMonth > 0 ? (
                          <div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                              +₨ {advanceInMonth.toLocaleString()} Advance
                            </span>
                            <div className="text-[11px] text-[var(--text-muted)] mt-1">
                              Paid: ₨ {paidThisMonth.toLocaleString()}
                            </div>
                          </div>
                        ) : balance <= 0 ? (
                          <div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                              ₨ {paidThisMonth.toLocaleString()} Paid (Full)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                              ₨ {paidThisMonth.toLocaleString()} Paid
                            </span>
                            <div className="text-[11px] text-[var(--text-muted)] mt-1">
                              ₨ {balance.toLocaleString()} Remaining
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {emp.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployeeForLedger(emp);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-[var(--text-main)] rounded-lg transition-colors"
                        >
                          View Record →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentForm(prev => ({ 
                              ...prev, 
                              employeeId: emp.id, 
                              amountPKR: balance > 0 ? balance : emp.baseSalaryPKR 
                            }));
                            setIsPayingSalary(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors"
                        >
                          Pay
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEmployee(emp);
                          }}
                          className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEmployee(emp.id);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-medium">
                      No employees found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Salary Payment Ledger */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-3 font-bold px-4">Date</th>
                  <th className="pb-3 font-bold px-4">Employee</th>
                  <th className="pb-3 font-bold px-4">Month Applicable</th>
                  <th className="pb-3 font-bold px-4">Payment Type & Method</th>
                  <th className="pb-3 font-bold px-4 text-right">Amount (PKR)</th>
                  <th className="pb-3 font-bold px-4">Notes</th>
                  <th className="pb-3 font-bold px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredPayments.map((payment) => {
                  const emp = payment.employeeId ? employeeMap[payment.employeeId] : null;

                  return (
                    <tr key={payment.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[var(--text-main)] text-sm">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <div 
                          onClick={() => emp && setSelectedEmployeeForLedger(emp)}
                          className="font-bold text-[var(--text-main)] hover:text-[var(--primary)] cursor-pointer"
                        >
                          {emp ? emp.name : 'Unknown Staff'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{emp?.role || '-'}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-sm text-[var(--text-main)]">
                        {payment.month}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          payment.paymentType === 'Salary' ? 'bg-green-50 text-green-700 border border-green-200' :
                          payment.paymentType === 'Advance' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          payment.paymentType === 'Bonus' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {payment.paymentType}
                        </span>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          via {payment.paymentMethod}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-base text-[var(--primary)]">
                        ₨ {payment.amountPKR?.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[var(--text-muted)] max-w-[200px] truncate">
                        {payment.notes || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-medium">
                      No payment records found for {monthFilter}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Employee */}
      {isAddingEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setIsAddingEmployee(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-[var(--primary)]" /> Add New Staff Member
            </h2>

            <form onSubmit={handleAddEmployeeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-2">
                <div className="w-28 h-28 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-3xl overflow-hidden relative group">
                  {newEmployee.picture_url ? (
                    <img src={newEmployee.picture_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    '👤'
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={newEmployee.name} 
                  onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Muhammad Aslam" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Role / Designation</label>
                <select 
                  value={newEmployee.role} 
                  onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Milker">Milker</option>
                  <option value="Feeder">Feeder</option>
                  <option value="Doctor">Doctor (Vet)</option>
                  <option value="Security">Security</option>
                  <option value="Worker">Worker (General / Cleaning)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  type="text" 
                  required 
                  value={newEmployee.phone} 
                  onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 0300-1234567" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">CNIC / ID (Optional)</label>
                <input 
                  type="text" 
                  value={newEmployee.cnic} 
                  onChange={e => setNewEmployee({ ...newEmployee, cnic: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. 35201-1234567-1" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Monthly Base Salary (PKR - Min ₨10,000)</label>
                <input 
                  type="number" 
                  required 
                  min="10000"
                  step="100"
                  value={newEmployee.baseSalaryPKR ?? ''} 
                  onChange={e => setNewEmployee({ ...newEmployee, baseSalaryPKR: e.target.value === '' ? 10000 : Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-lg focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="10000" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Joining Date</label>
                <input 
                  type="date" 
                  required 
                  value={newEmployee.joinDate} 
                  onChange={e => setNewEmployee({ ...newEmployee, joinDate: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              {/* Monthly Extra Facilities (Wheat, Milk, Housing, etc.) */}
              <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-[var(--text-main)] text-sm">Monthly Extra Facilities / Perks</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Select or add regular monthly provisions (e.g. Wheat, Daily Milk, Mess, Farm Housing).
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {COMMON_FACILITIES.map(facility => {
                    const isSelected = (newEmployee.facilities || []).includes(facility.label);
                    return (
                      <button
                        type="button"
                        key={facility.id}
                        onClick={() => toggleFacility(facility.label, false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {facility.label} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Facility input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add custom facility (e.g. 5kg Ghee, Free Uniform)..."
                    value={customFacilityText}
                    onChange={e => setCustomFacilityText(e.target.value)}
                    className="flex-1 bg-white border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:border-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => addCustomFacility(false)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-[var(--text-main)] text-xs font-bold rounded-xl border border-[var(--border)]"
                  >
                    + Add Perk
                  </button>
                </div>

                {/* Selected custom badges */}
                {(newEmployee.facilities || []).filter(f => !COMMON_FACILITIES.some(c => c.label === f)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(newEmployee.facilities || []).filter(f => !COMMON_FACILITIES.some(c => c.label === f)).map((customPerk, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg">
                        {customPerk}
                        <button type="button" onClick={() => removeFacility(customPerk, false)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAddingEmployee(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Staff Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Employee */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setEditingEmployee(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-[var(--primary)]" /> Edit Employee: {editingEmployee.name}
            </h2>

            <form onSubmit={handleEditEmployeeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-2">
                <div className="w-28 h-28 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-3xl overflow-hidden relative group">
                  {editingEmployee.picture_url ? (
                    <img src={editingEmployee.picture_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    '👤'
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingEmployee.name} 
                  onChange={e => setEditingEmployee({ ...editingEmployee, name: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Role / Designation</label>
                <select 
                  value={editingEmployee.role} 
                  onChange={e => setEditingEmployee({ ...editingEmployee, role: e.target.value as any })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Milker">Milker</option>
                  <option value="Feeder">Feeder</option>
                  <option value="Doctor">Doctor (Vet)</option>
                  <option value="Security">Security</option>
                  <option value="Worker">Worker (General / Cleaning)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  type="text" 
                  required 
                  value={editingEmployee.phone} 
                  onChange={e => setEditingEmployee({ ...editingEmployee, phone: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">CNIC / ID</label>
                <input 
                  type="text" 
                  value={editingEmployee.cnic || ''} 
                  onChange={e => setEditingEmployee({ ...editingEmployee, cnic: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Monthly Base Salary (PKR - Min ₨10,000)</label>
                <input 
                  type="number" 
                  required 
                  min="10000"
                  step="100"
                  value={editingEmployee.baseSalaryPKR ?? ''} 
                  onChange={e => setEditingEmployee({ ...editingEmployee, baseSalaryPKR: e.target.value === '' ? 0 : Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-lg focus:outline-none focus:border-[var(--primary)]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</label>
                <select 
                  value={editingEmployee.status} 
                  onChange={e => setEditingEmployee({ ...editingEmployee, status: e.target.value as 'Active' | 'Inactive' })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Monthly Extra Facilities (Wheat, Milk, Housing, etc.) */}
              <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-[var(--text-main)] text-sm">Monthly Extra Facilities / Perks</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Select or add regular monthly provisions (e.g. Wheat, Daily Milk, Mess, Farm Housing).
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {COMMON_FACILITIES.map(facility => {
                    const isSelected = (editingEmployee.facilities || []).includes(facility.label);
                    return (
                      <button
                        type="button"
                        key={facility.id}
                        onClick={() => toggleFacility(facility.label, true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {facility.label} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Facility input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add custom facility (e.g. 5kg Ghee, Free Uniform)..."
                    value={customFacilityText}
                    onChange={e => setCustomFacilityText(e.target.value)}
                    className="flex-1 bg-white border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:border-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => addCustomFacility(true)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-[var(--text-main)] text-xs font-bold rounded-xl border border-[var(--border)]"
                  >
                    + Add Perk
                  </button>
                </div>

                {/* Selected custom badges */}
                {(editingEmployee.facilities || []).filter(f => !COMMON_FACILITIES.some(c => c.label === f)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(editingEmployee.facilities || []).filter(f => !COMMON_FACILITIES.some(c => c.label === f)).map((customPerk, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg">
                        {customPerk}
                        <button type="button" onClick={() => removeFacility(customPerk, true)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingEmployee(null)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-md transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Salary / Payment / Advance */}
      {isPayingSalary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-xl w-full border border-[var(--border)] luxury-shadow max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setIsPayingSalary(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-green-600" /> Disburse Salary / Advance
            </h2>

            <form onSubmit={handlePaymentSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Select Employee</label>
                <select 
                  required
                  value={paymentForm.employeeId || ''} 
                  onChange={e => {
                    const empId = Number(e.target.value);
                    const emp = employeeMap[empId];
                    const paidThisMonth = empId ? getEmployeePaidThisMonth(empId) : 0;
                    const rem = emp ? Math.max(0, emp.baseSalaryPKR - paidThisMonth) : 0;
                    setPaymentForm({
                      ...paymentForm,
                      employeeId: empId,
                      amountPKR: rem > 0 ? rem : (emp?.baseSalaryPKR || undefined)
                    });
                  }} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold text-base focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="" disabled>-- Choose Employee --</option>
                  {employees?.filter(e => e.status === 'Active').map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - Base: ₨ {emp.baseSalaryPKR.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">For Month</label>
                  <input 
                    type="text" 
                    required 
                    value={paymentForm.month} 
                    onChange={e => setPaymentForm({ ...paymentForm, month: e.target.value })} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]" 
                    placeholder="e.g. August 2026"
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Type</label>
                  <select 
                    value={paymentForm.paymentType} 
                    onChange={e => setPaymentForm({ ...paymentForm, paymentType: e.target.value as any })} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="Salary">Full / Partial Salary</option>
                    <option value="Advance">Advance Payment</option>
                    <option value="Bonus">Bonus / Incentive</option>
                    <option value="Deduction">Deduction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Method</label>
                  <select 
                    value={paymentForm.paymentMethod} 
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Amount to Pay (PKR - Any Amount)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="any"
                  value={paymentForm.amountPKR ?? ''} 
                  onChange={e => setPaymentForm({ ...paymentForm, amountPKR: e.target.value === '' ? undefined : Number(e.target.value) })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-black text-2xl text-[var(--primary)] focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="Enter amount (e.g. 5000, 12500)..." 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes / Description (Optional)</label>
                <input 
                  type="text" 
                  value={paymentForm.notes || ''} 
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl py-3 px-4 font-medium focus:outline-none focus:border-[var(--primary)]" 
                  placeholder="e.g. Advance for personal emergency" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsPayingSalary(false)} className="px-6 py-3 font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-all">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Individual Employee Complete Financial Record & Facilities */}
      {selectedEmployeeForLedger && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedEmployeeForLedger(null)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[var(--bg-card)] shadow-2xl z-50 border-l border-[var(--border)] p-8 overflow-y-auto transform transition-transform">
            <button onClick={() => setSelectedEmployeeForLedger(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 mt-6 mb-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-2xl font-black text-[var(--primary)] border-2 border-white shadow-sm overflow-hidden">
                {selectedEmployeeForLedger.picture_url ? (
                  <img src={selectedEmployeeForLedger.picture_url} className="w-full h-full object-cover" alt={selectedEmployeeForLedger.name} />
                ) : (
                  selectedEmployeeForLedger.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--text-main)]">{selectedEmployeeForLedger.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold px-2.5 py-0.5 rounded-md">{selectedEmployeeForLedger.role}</span>
                  <span className="text-xs text-[var(--text-muted)]">{selectedEmployeeForLedger.phone}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Joined: {new Date(selectedEmployeeForLedger.joinDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Monthly Facilities / Perks Card */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Assigned Monthly Facilities</h4>
              </div>
              {selectedEmployeeForLedger.facilities && selectedEmployeeForLedger.facilities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedEmployeeForLedger.facilities.map((fac, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white text-amber-900 border border-amber-200 rounded-lg text-xs font-bold shadow-2xs">
                      {fac}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700 italic">No extra facilities registered for this staff member.</p>
              )}
            </div>

            {/* Financial Overview Cards */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--bg-main)] p-3.5 rounded-2xl border border-[var(--border)]">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Base Salary</span>
                  <span className="text-lg font-black text-[var(--text-main)] mt-1 block">₨ {selectedEmployeeForLedger.baseSalaryPKR?.toLocaleString()}</span>
                </div>
                <div className="bg-[var(--bg-main)] p-3.5 rounded-2xl border border-[var(--border)]">
                  <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider block">Total Disbursed</span>
                  <span className="text-lg font-black text-green-700 mt-1 block">
                    ₨ {selectedEmpStats.totalGivenAllTime.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[var(--bg-main)] p-3.5 rounded-2xl border border-[var(--border)] col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">All-Time Advances</span>
                  <span className="text-lg font-black text-blue-700 mt-1 block">
                    ₨ {selectedEmpStats.totalAdvancesAllTime.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Current Month Disbursal & Advance Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedEmpStats.advanceThisMonth > 0
                  ? 'bg-purple-50 border-purple-200 text-purple-900' 
                  : selectedEmpStats.remainingThisMonth > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-green-50 border-green-200 text-green-900'
              }`}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {currentMonthLabel.split(' ')[0]} Status: {selectedEmpStats.monthStatus}
                  </div>
                  {selectedEmpStats.advanceThisMonth > 0 ? (
                    <div className="text-2xl font-black mt-1 text-purple-800">
                      ₨ {selectedEmpStats.advanceThisMonth.toLocaleString()} Advance Taken
                    </div>
                  ) : selectedEmpStats.remainingThisMonth > 0 ? (
                    <div className="text-2xl font-black mt-1 text-amber-800">
                      ₨ {selectedEmpStats.remainingThisMonth.toLocaleString()} Remaining
                    </div>
                  ) : (
                    <div className="text-2xl font-black mt-1 text-green-800">
                      ₨ {selectedEmployeeForLedger.baseSalaryPKR.toLocaleString()} Fully Paid
                    </div>
                  )}
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Disbursed This Month: ₨ {selectedEmpStats.paidThisMonth.toLocaleString()} / Base: ₨ {selectedEmployeeForLedger.baseSalaryPKR.toLocaleString()}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setPaymentForm({
                      employeeId: selectedEmployeeForLedger.id,
                      amountPKR: undefined,
                      paymentDate: new Date().toISOString().split('T')[0],
                      month: currentMonthLabel,
                      paymentType: 'Advance',
                      paymentMethod: 'Cash',
                      notes: ''
                    });
                    setIsPayingSalary(true);
                  }}
                  className="px-3 py-2 text-xs font-bold bg-white border border-current rounded-xl shadow-sm hover:opacity-90 shrink-0"
                >
                  + Give Advance
                </button>
              </div>
            </div>

            {/* Payment & Advance History */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[var(--primary)]" /> All Payment Slips
              </h3>
              <button 
                onClick={() => {
                  setPaymentForm({
                    employeeId: selectedEmployeeForLedger.id,
                    amountPKR: undefined,
                    paymentDate: new Date().toISOString().split('T')[0],
                    month: currentMonthLabel,
                    paymentType: 'Salary',
                    paymentMethod: 'Cash',
                    notes: ''
                  });
                  setIsPayingSalary(true);
                }}
                className="px-3 py-1 text-xs font-bold bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
              >
                + Log Payment
              </button>
            </div>

            <div className="space-y-3">
              {salaryPayments?.filter(p => p.employeeId === selectedEmployeeForLedger.id).sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map(p => (
                <div key={p.id} className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-main)]">{p.month}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        p.paymentType === 'Advance' ? 'bg-blue-100 text-blue-800' :
                        p.paymentType === 'Salary' ? 'bg-green-100 text-green-800' :
                        p.paymentType === 'Bonus' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.paymentType}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {new Date(p.paymentDate).toLocaleDateString()} • via {p.paymentMethod}
                    </div>
                    {p.notes && <div className="text-xs text-[var(--text-main)] italic mt-1">&quot;{p.notes}&quot;</div>}
                  </div>
                  <div className="text-right">
                    <div className={`font-black text-lg ${p.paymentType === 'Deduction' ? 'text-red-600' : 'text-green-700'}`}>
                      {p.paymentType === 'Deduction' ? '-' : '+'} ₨ {p.amountPKR?.toLocaleString()}
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="text-[11px] text-red-400 hover:text-red-600 font-bold mt-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {salaryPayments?.filter(p => p.employeeId === selectedEmployeeForLedger.id).length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-6">No payment or advance records logged for this employee yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
