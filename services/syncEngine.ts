import { db } from '../db/db';
import { createClient } from '@/utils/supabase/client';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  syncError: string | null;
}

const LAST_SYNC_KEY = 'dairy_last_sync_timestamp';

// Helper to generate UUID if missing locally
function ensureUUID(existing?: string): string {
  if (existing && existing.length > 10) return existing;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
}

class SyncEngine {
  private isSyncing = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private lastSyncedAt: Date | null = null;
  private syncError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      if (stored) {
        try {
          this.lastSyncedAt = new Date(stored);
        } catch {
          this.lastSyncedAt = null;
        }
      }

      window.addEventListener('online', () => this.sync());
      // Periodic background sync every 45s when online
      setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.sync();
        }
      }, 45000);
    }
  }

  public subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const status: SyncStatus = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: 0,
      syncError: this.syncError
    };
    this.listeners.forEach(l => l(status));
  }

  public async sync(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.onLine || this.isSyncing) {
      return false;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      // Supabase credentials not configured yet; app operates in local-first mode
      return false;
    }

    this.isSyncing = true;
    this.syncError = null;
    this.notify();

    const supabase = createClient();
    const nowIso = new Date().toISOString();

    try {
      let userId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          if (typeof window !== 'undefined') {
            localStorage.setItem('lactis_active_user_id', user.id);
            // Background trial daily check-in & expiration verification
            fetch('/api/trial/ping', { method: 'POST' })
              .then(r => r.json())
              .then(d => {
                if (d && d.status === 'expired' && window.location.pathname.startsWith('/portal')) {
                  window.location.href = '/billing?status=trial_expired';
                }
              })
              .catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Sync user lookup:', e);
      }

      // ======================================================================
      // 1. PUSH DELETIONS (Tombstones) TO SUPABASE
      // ======================================================================
      const allDeletions = await db.DeletedRecords.toArray();
      const pendingDeletions = allDeletions.filter(del => !del.isSynced);

      for (const del of pendingDeletions) {
        try {
          if (del.tableName === 'livestock' && del.tagOrKey) {
            await supabase.from('livestock').update({ deleted_at: del.deletedAt }).eq('tag', del.tagOrKey);
          } else if (del.uuid) {
            await supabase.from(del.tableName).update({ deleted_at: del.deletedAt }).eq('uuid', del.uuid);
          }
          if (del.id) {
            await db.DeletedRecords.update(del.id, { isSynced: true });
          }
        } catch (e) {
          console.warn(`Failed to push deletion for ${del.tableName}:`, e);
        }
      }

      // ======================================================================
      // 2. PUSH LOCAL MUTATIONS (Unsynced Records) TO SUPABASE
      // ======================================================================

      // 2.1 Livestock
      const allLivestock = await db.Livestock.toArray();
      const pendingLivestock = allLivestock.filter(item => !item.isSynced || !item.uuid);
      if (pendingLivestock.length > 0) {
        const payload = pendingLivestock.map(c => {
          const u = ensureUUID(c.uuid);
          c.uuid = u;
          return {
            uuid: u,
            tag: c.tag,
            name: c.name,
            status: c.status,
            breed: c.breed,
            gender: c.gender || 'Female',
            birth_date: c.birthDate || null,
            picture_url: c.picture_url || null,
            no_of_calves: c.noOfCalves || 0,
            mother_tag: c.motherTag || null,
            father_tag: c.fatherTag || null,
            pregnancy_start_date: c.pregnancyStartDate || null,
            expected_calving_date: c.expectedCalvingDate || null,
            upcoming_calf_breed: c.upcomingCalfBreed || null,
            sale_price_pkr: c.salePricePKR || null,
            sold_date: c.soldDate || null,
            sold_to: c.soldTo || null,
            sold_reason_or_condition: c.soldReasonOrCondition || null,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('livestock').upsert(payload, { onConflict: 'tag' });
        if (!error) {
          await Promise.all(pendingLivestock.map(c => db.Livestock.update(c.id!, { isSynced: true, uuid: c.uuid, updatedAt: nowIso })));
        }
      }

      // 2.2 Milking Logs
      const allMilking = await db.MilkingLogs.toArray();
      const pendingMilking = allMilking.filter(l => !l.isSynced || !l.uuid);
      if (pendingMilking.length > 0) {
        const payload = pendingMilking.map(m => {
          const u = ensureUUID(m.uuid);
          m.uuid = u;
          return {
            uuid: u,
            tag: m.tag,
            yield_liters: m.yieldLiters,
            milker_id: m.milkerId || null,
            timestamp: m.timestamp,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('milking_logs').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingMilking.map(m => db.MilkingLogs.update(m.id!, { isSynced: true, uuid: m.uuid, updatedAt: nowIso })));
        }
      }

      // 2.3 Medical Logs
      const allMedical = await db.MedicalLogs.toArray();
      const pendingMedical = allMedical.filter(l => !l.isSynced || !l.uuid);
      if (pendingMedical.length > 0) {
        const payload = pendingMedical.map(m => {
          const u = ensureUUID(m.uuid);
          m.uuid = u;
          return {
            uuid: u,
            tag: m.tag,
            condition: m.condition,
            treatment: m.treatment,
            doctor_id: m.doctorId || null,
            timestamp: m.timestamp,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('medical_logs').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingMedical.map(m => db.MedicalLogs.update(m.id!, { isSynced: true, uuid: m.uuid, updatedAt: nowIso })));
        }
      }

      // 2.4 Customers
      const allCustomers = await db.Customers.toArray();
      const pendingCustomers = allCustomers.filter(c => !c.isSynced || !c.uuid);
      if (pendingCustomers.length > 0) {
        const payload = pendingCustomers.map(c => {
          const u = ensureUUID(c.uuid);
          c.uuid = u;
          return {
            uuid: u,
            name: c.name,
            phone: c.phone,
            address: c.address || null,
            custom_rate: c.customRate,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingCustomers.map(c => db.Customers.update(c.id!, { isSynced: true, uuid: c.uuid, updatedAt: nowIso })));
        }
      }

      // 2.5 Sales Logs
      const allSales = await db.SalesLogs.toArray();
      const pendingSales = allSales.filter(s => !s.isSynced || !s.uuid);
      if (pendingSales.length > 0) {
        const payload = pendingSales.map(s => {
          const u = ensureUUID(s.uuid);
          s.uuid = u;
          return {
            uuid: u,
            customer_id: s.customerId || null,
            customer_name: s.customerName || null,
            volume_liters: s.volumeLiters,
            total_pkr: s.totalPKR,
            timestamp: s.timestamp,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('sales_logs').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingSales.map(s => db.SalesLogs.update(s.id!, { isSynced: true, uuid: s.uuid, updatedAt: nowIso })));
        }
      }

      // 2.6 Customer Payments
      const allPayments = await db.CustomerPayments.toArray();
      const pendingPayments = allPayments.filter(p => !p.isSynced || !p.uuid);
      if (pendingPayments.length > 0) {
        const payload = pendingPayments.map(p => {
          const u = ensureUUID(p.uuid);
          p.uuid = u;
          return {
            uuid: u,
            customer_id: p.customerId,
            amount_pkr: p.amountPKR,
            payment_date: p.paymentDate,
            payment_method: p.paymentMethod,
            notes: p.notes || null,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('customer_payments').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingPayments.map(p => db.CustomerPayments.update(p.id!, { isSynced: true, uuid: p.uuid, updatedAt: nowIso })));
        }
      }

      // 2.7 Vaccination Tasks
      const allTasks = await db.VaccinationTasks.toArray();
      const pendingTasks = allTasks.filter(t => !t.isSynced || !t.uuid);
      if (pendingTasks.length > 0) {
        const payload = pendingTasks.map(t => {
          const u = ensureUUID(t.uuid);
          t.uuid = u;
          return {
            uuid: u,
            tag: t.tag || null,
            herd_wide: t.herdWide || false,
            type: t.type,
            date: t.date,
            next_due_date: t.nextDueDate || null,
            status: t.status,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('vaccination_tasks').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingTasks.map(t => db.VaccinationTasks.update(t.id!, { isSynced: true, uuid: t.uuid, updatedAt: nowIso })));
        }
      }

      // 2.8 Employees
      const allEmployees = await db.Employees.toArray();
      const pendingEmployees = allEmployees.filter(e => !e.isSynced || !e.uuid);
      if (pendingEmployees.length > 0) {
        const payload = pendingEmployees.map(e => {
          const u = ensureUUID(e.uuid);
          e.uuid = u;
          return {
            uuid: u,
            name: e.name,
            role: e.role,
            phone: e.phone,
            cnic: e.cnic || null,
            base_salary_pkr: e.baseSalaryPKR,
            join_date: e.joinDate,
            status: e.status,
            picture_url: e.picture_url || null,
            facilities: e.facilities || [],
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('employees').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingEmployees.map(e => db.Employees.update(e.id!, { isSynced: true, uuid: e.uuid, updatedAt: nowIso })));
        }
      }

      // 2.9 Salary Payments
      const allSalaryPayments = await db.SalaryPayments.toArray();
      const pendingSalaryPayments = allSalaryPayments.filter(s => !s.isSynced || !s.uuid);
      if (pendingSalaryPayments.length > 0) {
        const payload = pendingSalaryPayments.map(s => {
          const u = ensureUUID(s.uuid);
          s.uuid = u;
          return {
            uuid: u,
            employee_id: s.employeeId,
            amount_pkr: s.amountPKR,
            payment_date: s.paymentDate,
            month: s.month,
            payment_type: s.paymentType,
            payment_method: s.paymentMethod,
            notes: s.notes || null,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('salary_payments').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingSalaryPayments.map(s => db.SalaryPayments.update(s.id!, { isSynced: true, uuid: s.uuid, updatedAt: nowIso })));
        }
      }

      // 2.10 Feed Logs
      const allFeedLogs = await db.FeedLogs.toArray();
      const pendingFeedLogs = allFeedLogs.filter(f => !f.isSynced || !f.uuid);
      if (pendingFeedLogs.length > 0) {
        const payload = pendingFeedLogs.map(f => {
          const u = ensureUUID(f.uuid);
          f.uuid = u;
          return {
            uuid: u,
            feed_name: f.feedName,
            feed_type: f.feedType,
            category: f.category,
            quantity: f.quantity,
            unit: f.unit,
            cost_per_unit: f.costPerUnit || null,
            total_amount_pkr: f.totalAmountPKR,
            date: f.date,
            duration_days: f.durationDays || 30,
            start_date: f.startDate || null,
            end_date: f.endDate || null,
            supplier_or_field: f.supplierOrField || null,
            notes: f.notes || null,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('feed_logs').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingFeedLogs.map(f => db.FeedLogs.update(f.id!, { isSynced: true, uuid: f.uuid, updatedAt: nowIso })));
        }
      }

      // 2.11 Expense Logs
      const allExpenses = await db.ExpenseLogs.toArray();
      const pendingExpenses = allExpenses.filter(e => !e.isSynced || !e.uuid);
      if (pendingExpenses.length > 0) {
        const payload = pendingExpenses.map(e => {
          const u = ensureUUID(e.uuid);
          e.uuid = u;
          return {
            uuid: u,
            title: e.title,
            category: e.category,
            amount_pkr: e.amountPKR,
            date: e.date,
            month: e.month,
            payment_method: e.paymentMethod,
            bill_number: e.billNumber || null,
            notes: e.notes || null,
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('expense_logs').upsert(payload, { onConflict: 'uuid' });
        if (!error) {
          await Promise.all(pendingExpenses.map(e => db.ExpenseLogs.update(e.id!, { isSynced: true, uuid: e.uuid, updatedAt: nowIso })));
        }
      }

      // ======================================================================
      // 3. PULL REMOTE CHANGES & DELETIONS FROM SUPABASE INTO DEXIE
      // ======================================================================
      const pullFilter = this.lastSyncedAt ? this.lastSyncedAt.toISOString() : '1970-01-01T00:00:00Z';

      // 3.1 Pull Livestock
      const { data: remoteLivestock } = await supabase.from('livestock').select('*').gt('updated_at', pullFilter);
      if (remoteLivestock && remoteLivestock.length > 0) {
        for (const r of remoteLivestock) {
          if (!r.tag) continue;
          const existing = await db.Livestock.where('tag').equals(r.tag).first();
          if (r.deleted_at) {
            if (existing?.id) await db.Livestock.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              tag: r.tag,
              name: r.name,
              status: r.status,
              breed: r.breed,
              gender: r.gender,
              birthDate: r.birth_date,
              picture_url: r.picture_url,
              noOfCalves: r.no_of_calves,
              motherTag: r.mother_tag,
              fatherTag: r.father_tag,
              pregnancyStartDate: r.pregnancy_start_date,
              expectedCalvingDate: r.expected_calving_date,
              upcomingCalfBreed: r.upcoming_calf_breed,
              salePricePKR: r.sale_price_pkr ? Number(r.sale_price_pkr) : undefined,
              soldDate: r.sold_date,
              soldTo: r.sold_to,
              soldReasonOrCondition: r.sold_reason_or_condition,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) {
              await db.Livestock.update(existing.id, mapped);
            } else {
              await db.Livestock.add(mapped);
            }
          }
        }
      }

      // 3.2 Pull Milking Logs
      const { data: remoteMilking } = await supabase.from('milking_logs').select('*').gt('updated_at', pullFilter);
      if (remoteMilking && remoteMilking.length > 0) {
        for (const r of remoteMilking) {
          if (!r.uuid) continue;
          const existing = await db.MilkingLogs.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.MilkingLogs.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              tag: r.tag,
              yieldLiters: Number(r.yield_liters),
              milkerId: r.milker_id,
              timestamp: r.timestamp,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.MilkingLogs.update(existing.id, mapped);
            else await db.MilkingLogs.add(mapped);
          }
        }
      }

      // 3.3 Pull Customers
      const { data: remoteCustomers } = await supabase.from('customers').select('*').gt('updated_at', pullFilter);
      if (remoteCustomers && remoteCustomers.length > 0) {
        for (const r of remoteCustomers) {
          if (!r.uuid) continue;
          const existing = await db.Customers.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.Customers.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              name: r.name,
              phone: r.phone,
              address: r.address,
              customRate: Number(r.custom_rate),
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.Customers.update(existing.id, mapped);
            else await db.Customers.add(mapped);
          }
        }
      }

      // 3.4 Pull Sales Logs
      const { data: remoteSales } = await supabase.from('sales_logs').select('*').gt('updated_at', pullFilter);
      if (remoteSales && remoteSales.length > 0) {
        for (const r of remoteSales) {
          if (!r.uuid) continue;
          const existing = await db.SalesLogs.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.SalesLogs.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              customerId: Number(r.customer_id) || 1,
              customerName: r.customer_name,
              volumeLiters: Number(r.volume_liters),
              totalPKR: Number(r.total_pkr),
              timestamp: r.timestamp,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.SalesLogs.update(existing.id, mapped);
            else await db.SalesLogs.add(mapped);
          }
        }
      }

      // 3.5 Pull Customer Payments
      const { data: remotePayments } = await supabase.from('customer_payments').select('*').gt('updated_at', pullFilter);
      if (remotePayments && remotePayments.length > 0) {
        for (const r of remotePayments) {
          if (!r.uuid) continue;
          const existing = await db.CustomerPayments.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.CustomerPayments.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              customerId: Number(r.customer_id),
              amountPKR: Number(r.amount_pkr),
              paymentDate: r.payment_date,
              paymentMethod: r.payment_method as any,
              notes: r.notes,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.CustomerPayments.update(existing.id, mapped);
            else await db.CustomerPayments.add(mapped);
          }
        }
      }

      // 3.6 Pull Feed Logs
      const { data: remoteFeeds } = await supabase.from('feed_logs').select('*').gt('updated_at', pullFilter);
      if (remoteFeeds && remoteFeeds.length > 0) {
        for (const r of remoteFeeds) {
          if (!r.uuid) continue;
          const existing = await db.FeedLogs.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.FeedLogs.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              feedName: r.feed_name,
              feedType: r.feed_type as any,
              category: r.category as any,
              quantity: Number(r.quantity),
              unit: r.unit as any,
              costPerUnit: r.cost_per_unit ? Number(r.cost_per_unit) : undefined,
              totalAmountPKR: Number(r.total_amount_pkr),
              date: r.date,
              durationDays: r.duration_days ? Number(r.duration_days) : 30,
              startDate: r.start_date,
              endDate: r.end_date,
              supplierOrField: r.supplierOrField,
              notes: r.notes,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.FeedLogs.update(existing.id, mapped);
            else await db.FeedLogs.add(mapped);
          }
        }
      }

      // 3.7 Pull Expense Logs
      const { data: remoteExpenses } = await supabase.from('expense_logs').select('*').gt('updated_at', pullFilter);
      if (remoteExpenses && remoteExpenses.length > 0) {
        for (const r of remoteExpenses) {
          if (!r.uuid) continue;
          const existing = await db.ExpenseLogs.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.ExpenseLogs.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              title: r.title,
              category: r.category as any,
              amountPKR: Number(r.amount_pkr),
              date: r.date,
              month: r.month,
              paymentMethod: r.payment_method as any,
              billNumber: r.bill_number,
              notes: r.notes,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.ExpenseLogs.update(existing.id, mapped);
            else await db.ExpenseLogs.add(mapped);
          }
        }
      }

      // 3.8 Pull Employees
      const { data: remoteEmployees } = await supabase.from('employees').select('*').gt('updated_at', pullFilter);
      if (remoteEmployees && remoteEmployees.length > 0) {
        for (const r of remoteEmployees) {
          if (!r.uuid) continue;
          const existing = await db.Employees.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.Employees.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              name: r.name,
              role: r.role as any,
              phone: r.phone,
              cnic: r.cnic,
              baseSalaryPKR: Number(r.base_salary_pkr),
              joinDate: r.join_date,
              status: r.status as any,
              picture_url: r.picture_url,
              facilities: r.facilities,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.Employees.update(existing.id, mapped);
            else await db.Employees.add(mapped);
          }
        }
      }

      // 3.9 Pull Salary Payments
      const { data: remoteSalaryPay } = await supabase.from('salary_payments').select('*').gt('updated_at', pullFilter);
      if (remoteSalaryPay && remoteSalaryPay.length > 0) {
        for (const r of remoteSalaryPay) {
          if (!r.uuid) continue;
          const existing = await db.SalaryPayments.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.SalaryPayments.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              employeeId: Number(r.employee_id),
              amountPKR: Number(r.amount_pkr),
              paymentDate: r.payment_date,
              month: r.month,
              paymentType: r.payment_type as any,
              paymentMethod: r.payment_method as any,
              notes: r.notes,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.SalaryPayments.update(existing.id, mapped);
            else await db.SalaryPayments.add(mapped);
          }
        }
      }

      // 3.10 Pull Vaccination Tasks
      const { data: remoteTasks } = await supabase.from('vaccination_tasks').select('*').gt('updated_at', pullFilter);
      if (remoteTasks && remoteTasks.length > 0) {
        for (const r of remoteTasks) {
          if (!r.uuid) continue;
          const existing = await db.VaccinationTasks.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.VaccinationTasks.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              tag: r.tag,
              herdWide: r.herd_wide,
              type: r.type,
              date: r.date,
              nextDueDate: r.next_due_date,
              status: r.status as any,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.VaccinationTasks.update(existing.id, mapped);
            else await db.VaccinationTasks.add(mapped);
          }
        }
      }

      // 3.11 Pull Medical Logs
      const { data: remoteMed } = await supabase.from('medical_logs').select('*').gt('updated_at', pullFilter);
      if (remoteMed && remoteMed.length > 0) {
        for (const r of remoteMed) {
          if (!r.uuid) continue;
          const existing = await db.MedicalLogs.where('uuid').equals(r.uuid).first();
          if (r.deleted_at) {
            if (existing?.id) await db.MedicalLogs.delete(existing.id);
          } else {
            const mapped = {
              uuid: r.uuid,
              tag: r.tag,
              condition: r.condition,
              treatment: r.treatment,
              doctorId: r.doctor_id,
              timestamp: r.timestamp,
              isSynced: true,
              updatedAt: r.updated_at
            };
            if (existing?.id) await db.MedicalLogs.update(existing.id, mapped);
            else await db.MedicalLogs.add(mapped);
          }
        }
      }

      // Record successful sync timestamp
      this.lastSyncedAt = new Date();
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, this.lastSyncedAt.toISOString());
      }

      return true;
    } catch (err: any) {
      console.error('Bidirectional sync error:', err);
      this.syncError = err.message || 'Sync failed';
      return false;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncEngine = new SyncEngine();
