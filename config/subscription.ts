export type PlanKey = 'trial' | 'starter' | 'pro';

export interface PlanDetail {
  id: PlanKey;
  name: string;
  duration: string;
  badge?: string;
  introPrice: number;
  renewalPrice: number;
  discountPercent: number;
  effectiveMonthly: number;
  savingsPKR: number;
  popular?: boolean;
  bestValue?: boolean;
  cattleLimit: string;
  features: string[];
}

/**
 * 💡 CENTRALIZED PRICING CONFIGURATION
 * Plan 1: 15-Day Free Trial (₨ 0)
 * Plan 2: Starter Monthly (₨ 50 introductory)
 * Plan 3: Farm Pro Annual (₨ 183 / mo billed annually at ₨ 2,199)
 */
export const SUBSCRIPTION_PLANS: Record<PlanKey, PlanDetail> = {
  trial: {
    id: 'trial',
    name: '15-Day Free Trial',
    duration: '15 Days Full Access',
    badge: '100% FREE TRIAL',
    bestValue: false,
    introPrice: 0,
    renewalPrice: 0,
    discountPercent: 100,
    effectiveMonthly: 0,
    savingsPKR: 449,
    cattleLimit: 'Unlimited Livestock for 15 Days',
    features: [
      '15 Days Full Access to All ERP Features',
      'Unlimited Cattle & Livestock Directory',
      'Milking Logs & Production Tracking',
      'Customer Khata & Ledger Management',
      'Feed & Expense Logging Engine',
      'PWA Mobile & Tablet Offline Mode (Daily Check-in)'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter Monthly',
    duration: '1 Month Full Access',
    introPrice: 50, 
    renewalPrice: 449,
    discountPercent: 89,
    effectiveMonthly: 50,
    savingsPKR: 399,
    cattleLimit: 'Up to 25 Head of Cattle',
    features: [
      'Up to 25 Cattle & Livestock Directory',
      'Daily Milking Yield & Production Logging',
      'Customer Credit Khata & Bill Tracking',
      'PWA Mobile & Tablet Offline App',
      'Basic Medical & Vaccination History',
      'Local IndexedDB Instant Storage'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Farm Pro Annual',
    duration: '1 Full Year (12 Months)',
    badge: 'MOST POPULAR',
    popular: true,
    introPrice: 2199,
    renewalPrice: 3999,
    discountPercent: 59,
    effectiveMonthly: 183,
    savingsPKR: 3189,
    cattleLimit: 'Unlimited Livestock & Herd',
    features: [
      'Unlimited Cattle & Calves Directory',
      'Multi-Month Silage & Feed Amortization Engine',
      'Real Cash Profit & Loss (P&L) Accounting',
      'Staff Payroll, Advances & Rations Khata',
      'Automatic Cloud Backup & Bidirectional Sync',
      'Automated Vaccination & Calving Alerts',
      'Interactive Analytics & Lifetime Leaderboards',
      '100% Offline-First Mode on Remote Barns'
    ]
  }
};

export const MERCHANT_CONFIG = {
  bankName: 'NayaPay (1Link / Raast Enabled)',
  accountTitle: 'MUHAMMAD AHMAD',
  nayapayIban: 'PK89NAYA1234503045811000',
  raastMobile: '03045811000',
  jazzCashNumber: '03045811000'
};
