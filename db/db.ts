import Dexie, { Table } from 'dexie'

export interface Livestock {
    id?: number;
    uuid?: string;
    userId?: string;
    tag: string;
    name: string;
    status: string; // 'Lactating' | 'Dry' | 'Pregnant' | 'Colostrum' | 'Heifer' | 'Male' | 'Sold'
    breed: string;
    gender?: 'Male' | 'Female';
    birthDate?: string;
    picture_url?: string;
    noOfCalves?: number;
    motherTag?: string; // Optional dam tag
    fatherTag?: string; // Optional sire tag / breed
    pregnancyStartDate?: string;
    expectedCalvingDate?: string;
    upcomingCalfBreed?: string;
    salePricePKR?: number;
    soldDate?: string;
    soldTo?: string;
    soldReasonOrCondition?: string;
    isSynced?: boolean;
    updatedAt?: string;
}

export interface MilkingLog {
    id?: number;
    uuid?: string;
    userId?: string;
    tag: string;
    yieldLiters: number;
    milkerId?: string;
    timestamp: string; // ISO string
    isSynced: boolean;
    updatedAt?: string;
}

export interface MedicalLog {
    id?: number;
    uuid?: string;
    userId?: string;
    tag: string;
    condition: string;
    treatment: string;
    doctorId?: string;
    timestamp: string; // ISO string
    isSynced: boolean;
    updatedAt?: string;
}

export interface Customer {
    id?: number;
    uuid?: string;
    userId?: string;
    name: string;
    phone: string;
    address: string;
    customRate: number; // PKR per liter
    isSynced?: boolean;
    updatedAt?: string;
}

export interface SalesLog {
    id?: number;
    uuid?: string;
    userId?: string;
    customerId: number;
    customerName?: string;
    volumeLiters: number;
    totalPKR: number;
    timestamp: string;
    isSynced: boolean;
    updatedAt?: string;
}

export interface CustomerPayment {
    id?: number;
    uuid?: string;
    userId?: string;
    customerId: number;
    amountPKR: number;
    paymentDate: string; // YYYY-MM-DD
    paymentMethod: 'Cash' | 'Bank Transfer' | 'JazzCash / EasyPaisa' | 'Other';
    notes?: string;
    isSynced: boolean;
    updatedAt?: string;
}

export interface VaccinationTask {
    id?: number;
    uuid?: string;
    userId?: string;
    tag?: string;
    herdWide?: boolean;
    type: string;
    date: string;
    nextDueDate?: string;
    status: 'pending' | 'completed';
    isSynced: boolean;
    updatedAt?: string;
}

export interface Employee {
    id?: number;
    uuid?: string;
    userId?: string;
    name: string;
    role: 'Milker' | 'Feeder' | 'Doctor' | 'Security' | 'Worker';
    phone: string;
    cnic?: string;
    baseSalaryPKR: number;
    joinDate: string;
    status: 'Active' | 'Inactive';
    picture_url?: string;
    facilities?: string[];
    isSynced: boolean;
    updatedAt?: string;
}

export interface SalaryPayment {
    id?: number;
    uuid?: string;
    userId?: string;
    employeeId: number;
    amountPKR: number;
    paymentDate: string;
    month: string;
    paymentType: 'Salary' | 'Advance' | 'Bonus' | 'Deduction';
    paymentMethod: 'Cash' | 'Bank Transfer' | 'JazzCash / EasyPaisa';
    notes?: string;
    isSynced: boolean;
    updatedAt?: string;
}

export interface FeedLog {
    id?: number;
    uuid?: string;
    userId?: string;
    feedName: string;
    feedType: 'Silage' | 'Sorghum' | 'Wanda / Concentrate' | 'Wheat Straw' | 'Green Fodder' | 'Rhodes Grass' | 'Other';
    category: 'Bought' | 'Prepared';
    quantity: number;
    unit: 'KG' | 'Mann (40kg)' | 'Tons' | 'Bags' | 'Trailers';
    costPerUnit?: number;
    totalAmountPKR: number;
    date: string;
    durationDays?: number; // e.g. 30, 90, 120 days
    startDate?: string;
    endDate?: string;
    supplierOrField?: string;
    notes?: string;
    isSynced: boolean;
    updatedAt?: string;
}

export interface ExpenseLog {
    id?: number;
    uuid?: string;
    userId?: string;
    title: string;
    category: 'Electricity / WAPDA' | 'Fuel / Diesel' | 'Veterinary & Medicine' | 'Maintenance & Repairs' | 'Labor & Incidentals' | 'Ration & Kitchen' | 'Utilities' | 'Other';
    amountPKR: number;
    date: string;
    month: string;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'JazzCash / EasyPaisa';
    billNumber?: string;
    notes?: string;
    isSynced: boolean;
    updatedAt?: string;
}

export interface DeletedRecord {
    id?: number;
    tableName: string;
    uuid?: string;
    tagOrKey?: string;
    deletedAt: string;
    isSynced: boolean;
}

export class DairyfarmDB extends Dexie {
    Livestock!: Table<Livestock>;
    MilkingLogs!: Table<MilkingLog>;
    MedicalLogs!: Table<MedicalLog>;
    Customers!: Table<Customer>;
    SalesLogs!: Table<SalesLog>;
    CustomerPayments!: Table<CustomerPayment>;
    VaccinationTasks!: Table<VaccinationTask>;
    Employees!: Table<Employee>;
    SalaryPayments!: Table<SalaryPayment>;
    FeedLogs!: Table<FeedLog>;
    ExpenseLogs!: Table<ExpenseLog>;
    DeletedRecords!: Table<DeletedRecord>;

    constructor(dbName = 'DairyfarmDB') {
        super(dbName);
        this.version(8).stores({
           Livestock: '++id, uuid, userId, tag, status, gender, breed, motherTag, fatherTag, soldDate, isSynced, updatedAt',
           MilkingLogs: '++id, uuid, userId, tag, timestamp, isSynced, updatedAt',
           MedicalLogs: '++id, uuid, userId, tag, timestamp, isSynced, updatedAt',
           Customers: '++id, uuid, userId, name, phone, isSynced, updatedAt',
           SalesLogs: '++id, uuid, userId, customerId, timestamp, isSynced, updatedAt',
           CustomerPayments: '++id, uuid, userId, customerId, paymentDate, paymentMethod, isSynced, updatedAt',
           VaccinationTasks: '++id, uuid, userId, tag, status, date, isSynced, updatedAt',
           Employees: '++id, uuid, userId, name, role, status, isSynced, updatedAt',
           SalaryPayments: '++id, uuid, userId, employeeId, paymentDate, month, paymentType, isSynced, updatedAt',
           FeedLogs: '++id, uuid, userId, feedName, feedType, category, date, startDate, endDate, isSynced, updatedAt',
           ExpenseLogs: '++id, uuid, userId, category, date, month, isSynced, updatedAt',
           DeletedRecords: '++id, tableName, uuid, tagOrKey, deletedAt, isSynced'
        });
    }
}

// Multi-tenant database cache per user
const dbCache: Record<string, DairyfarmDB> = {};

export function getActiveUserId(): string {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('lactis_active_user_id');
        if (stored) return stored;
    }
    return 'default';
}

export function setActiveUserId(userId: string | null) {
    if (typeof window !== 'undefined') {
        if (userId) {
            localStorage.setItem('lactis_active_user_id', userId);
        } else {
            localStorage.removeItem('lactis_active_user_id');
        }
    }
}

export function getDatabaseForUser(userId?: string): DairyfarmDB {
    const id = userId || getActiveUserId();
    const dbName = id === 'default' ? 'DairyfarmDB' : `DairyfarmDB_${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    
    if (!dbCache[dbName]) {
        dbCache[dbName] = new DairyfarmDB(dbName);
    }
    return dbCache[dbName];
}

// Reactive Dynamic Proxy for seamless backwards-compatible `db` usage
export const db: DairyfarmDB = new Proxy({} as DairyfarmDB, {
    get(_target, prop) {
        const currentDb = getDatabaseForUser();
        const value = (currentDb as any)[prop];
        if (typeof value === 'function') {
            return value.bind(currentDb);
        }
        return value;
    }
});

// Helper to record a local deletion tombstone for synchronization
export async function trackLocalDeletion(tableName: string, uuid?: string, tagOrKey?: string) {
    try {
        await db.DeletedRecords.add({
            tableName,
            uuid: uuid || undefined,
            tagOrKey: tagOrKey || undefined,
            deletedAt: new Date().toISOString(),
            isSynced: false
        });
    } catch (e) {
        console.error('Failed to track local deletion tombstone:', e);
    }
}