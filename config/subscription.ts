export type PlanKey = 'starter' | 'pro' | 'enterprise';

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
 * To change Plan 1 (Starter) price (e.g. to 50 for testing, or back to 199):
 * Simply edit `introPrice: 50` below!
 */
export const SUBSCRIPTION_PLANS: Record<PlanKey, PlanDetail> = {
  starter: {
    id: 'starter',
    name: 'Starter Monthly',
    duration: '1 Month Full Access',
    introPrice: 50, 
    renewalPrice: 449,
    discountPercent: 89,
    effectiveMonthly: 50,
    savingsPKR: 399,
    cattleLimit: 'Up to 60 Head of Cattle',
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
  },
  enterprise: {
    id: 'enterprise',
    name: 'Commercial Enterprise',
    duration: '2 Full Years (24 Months)',
    badge: 'MAXIMUM SAVINGS (2 YEARS)',
    bestValue: true,
    introPrice: 4999,
    renewalPrice: 6499,
    discountPercent: 49,
    effectiveMonthly: 210,
    savingsPKR: 5277,
    cattleLimit: 'Unlimited Multi-Farm Operations',
    features: [
      'Everything in Farm Pro Plan',
      'Multiple Sheds & Farm Branch Locations',
      'Multi-Employee Milker & Feeder MPIN Kiosk',
      'Dedicated Cloud Database Vault & Backups',
      'Custom Financial, Sales & Tax PDF/Excel Exports',
      '24/7 Priority Phone & WhatsApp VIP Support',
      'Free Farm Setup & Staff Onboarding Assistance',
      'Price Lock Guarantee for Renewals'
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
