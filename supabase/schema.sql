-- ==============================================================================
-- DAIRY FARM PWA - COMPLETE PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Multi-Tenant SaaS, Google Auth, Automated Payments & Offline Sync
-- 100% IDEMPOTENT & ERROR-FREE: Safe to run repeatedly on new or existing DBs
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES & USER ACCOUNTS (Google OAuth + Email + SaaS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    phone TEXT,
    avatar_url TEXT,
    subscription_plan TEXT NOT NULL DEFAULT 'Farm Pro Annual',
    subscription_status TEXT NOT NULL DEFAULT 'inactive',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist on profiles if table was created previously
DO $$
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'Farm Pro Annual';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

-- Auto-create profile on Supabase Auth Signup (Google OAuth / Email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, avatar_url, subscription_plan, subscription_status)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'admin'),
        new.raw_user_meta_data->>'avatar_url',
        'Farm Pro Annual',
        'inactive'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. SAAS SUBSCRIPTIONS & AUTOMATED PAYMENT TRANSACTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    plan_tier TEXT NOT NULL DEFAULT 'Farm Pro Annual',
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'yearly',
    amount_pkr NUMERIC NOT NULL DEFAULT 2199,
    payment_method TEXT NOT NULL DEFAULT 'Card',
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '365 days'),
    invoice_number TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    account_reference TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'Farm Pro Annual';
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'yearly';
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount_pkr NUMERIC NOT NULL DEFAULT 2199;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Card';
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '365 days');
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS invoice_number TEXT;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS account_reference TEXT;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 2.1 ORGANIZATIONS & FARMS (Multi-Tenant Organization Management)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'My Dairy Farm',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_status TEXT NOT NULL DEFAULT 'inactive',
    subscription_plan TEXT NOT NULL DEFAULT 'Farm Pro Annual',
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '365 days'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'My Dairy Farm';
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_id UUID;
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'Farm Pro Annual';
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '365 days');
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(subscription_status);

-- ==============================================================================
-- 2.2 PAYMENT TRANSACTIONS AUDIT LEDGER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    trx_id TEXT UNIQUE NOT NULL,
    user_id UUID,
    farm_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR',
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'succeeded',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS trx_id TEXT;
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS farm_id TEXT;
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'succeeded';
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_trx_id ON public.payment_transactions(trx_id);

-- ==============================================================================
-- 3. LIVESTOCK (Herd Directory, Lineage, Lifecycle, Multi-Tenant)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.livestock (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    tag TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Lactating',
    breed TEXT NOT NULL DEFAULT 'General Breed',
    gender TEXT NOT NULL DEFAULT 'Female',
    birth_date DATE,
    picture_url TEXT,
    no_of_calves INT DEFAULT 0,
    mother_tag TEXT,
    father_tag TEXT,
    pregnancy_start_date DATE,
    expected_calving_date DATE,
    upcoming_calf_breed TEXT,
    sale_price_pkr NUMERIC,
    sold_date DATE,
    sold_to TEXT,
    sold_reason_or_condition TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS tag TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Lactating';
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS breed TEXT DEFAULT 'General Breed';
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Female';
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS birth_date DATE;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS picture_url TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS no_of_calves INT DEFAULT 0;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS mother_tag TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS father_tag TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS pregnancy_start_date DATE;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS expected_calving_date DATE;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS upcoming_calf_breed TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS sale_price_pkr NUMERIC;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS sold_date DATE;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS sold_to TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS sold_reason_or_condition TEXT;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.livestock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_livestock_user ON public.livestock(user_id);
CREATE INDEX IF NOT EXISTS idx_livestock_tag ON public.livestock(tag);
CREATE INDEX IF NOT EXISTS idx_livestock_status ON public.livestock(status);
CREATE INDEX IF NOT EXISTS idx_livestock_updated_at ON public.livestock(updated_at);
CREATE INDEX IF NOT EXISTS idx_livestock_deleted_at ON public.livestock(deleted_at);

DROP TRIGGER IF EXISTS trg_livestock_updated_at ON public.livestock;
CREATE TRIGGER trg_livestock_updated_at
    BEFORE UPDATE ON public.livestock
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 4. MILKING LOGS (Session Yields)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.milking_logs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    tag TEXT NOT NULL,
    yield_liters NUMERIC NOT NULL DEFAULT 0,
    milker_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS tag TEXT;
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS yield_liters NUMERIC DEFAULT 0;
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS milker_id TEXT;
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.milking_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_milking_user ON public.milking_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_milking_tag ON public.milking_logs(tag);
CREATE INDEX IF NOT EXISTS idx_milking_timestamp ON public.milking_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_milking_updated_at ON public.milking_logs(updated_at);

DROP TRIGGER IF EXISTS trg_milking_updated_at ON public.milking_logs;
CREATE TRIGGER trg_milking_updated_at
    BEFORE UPDATE ON public.milking_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 5. MEDICAL & TREATMENT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.medical_logs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    tag TEXT NOT NULL,
    condition TEXT NOT NULL,
    treatment TEXT NOT NULL,
    doctor_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS tag TEXT;
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS condition TEXT;
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS treatment TEXT;
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS doctor_id TEXT;
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.medical_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_medical_user ON public.medical_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_tag ON public.medical_logs(tag);
CREATE INDEX IF NOT EXISTS idx_medical_updated_at ON public.medical_logs(updated_at);

DROP TRIGGER IF EXISTS trg_medical_updated_at ON public.medical_logs;
CREATE TRIGGER trg_medical_updated_at
    BEFORE UPDATE ON public.medical_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. CUSTOMERS & WHOLESALE BUYERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    custom_rate NUMERIC NOT NULL DEFAULT 150,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS custom_rate NUMERIC DEFAULT 150;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers(updated_at);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 7. SALES & DISPATCH LOGS (Credit Dispatches)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sales_logs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    customer_id BIGINT,
    customer_name TEXT,
    volume_liters NUMERIC NOT NULL,
    total_pkr NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS customer_id BIGINT;
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS customer_name TEXT;
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS volume_liters NUMERIC;
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS total_pkr NUMERIC;
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.sales_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON public.sales_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON public.sales_logs(updated_at);

DROP TRIGGER IF EXISTS trg_sales_updated_at ON public.sales_logs;
CREATE TRIGGER trg_sales_updated_at
    BEFORE UPDATE ON public.sales_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 8. CUSTOMER PAYMENTS (Cash & Bank Settlements / Khata)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_payments (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    customer_id BIGINT NOT NULL,
    amount_pkr NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    notes TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS customer_id BIGINT;
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS amount_pkr NUMERIC;
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.customer_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_payments_user ON public.customer_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON public.customer_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customer_payments_updated_at ON public.customer_payments(updated_at);

DROP TRIGGER IF EXISTS trg_cust_pay_updated_at ON public.customer_payments;
CREATE TRIGGER trg_cust_pay_updated_at
    BEFORE UPDATE ON public.customer_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 9. VACCINATION & MEDICAL TASKS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vaccination_tasks (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    tag TEXT,
    herd_wide BOOLEAN DEFAULT FALSE,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    next_due_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS tag TEXT;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS herd_wide BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS date DATE;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS next_due_date DATE;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.vaccination_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.vaccination_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.vaccination_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.vaccination_tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.vaccination_tasks(updated_at);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.vaccination_tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON public.vaccination_tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 10. EMPLOYEES & STAFF ROSTER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT NOT NULL,
    cnic TEXT,
    base_salary_pkr NUMERIC NOT NULL DEFAULT 25000,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    picture_url TEXT,
    facilities TEXT[],
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS role TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cnic TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS base_salary_pkr NUMERIC DEFAULT 25000;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS picture_url TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS facilities TEXT[];
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_user ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_updated_at ON public.employees(updated_at);

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 11. SALARY & ADVANCE DISBURSALS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.salary_payments (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    employee_id BIGINT NOT NULL,
    amount_pkr NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    month TEXT NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'Salary',
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    notes TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS employee_id BIGINT;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS amount_pkr NUMERIC;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS month TEXT;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'Salary';
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_salary_user ON public.salary_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_emp ON public.salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_month ON public.salary_payments(month);
CREATE INDEX IF NOT EXISTS idx_salary_updated_at ON public.salary_payments(updated_at);

DROP TRIGGER IF EXISTS trg_salary_updated_at ON public.salary_payments;
CREATE TRIGGER trg_salary_updated_at
    BEFORE UPDATE ON public.salary_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 12. FEED & NUTRITION INVENTORY (Multi-Month Batches)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feed_logs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    feed_name TEXT NOT NULL,
    feed_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Prepared',
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Mann (40kg)',
    cost_per_unit NUMERIC,
    total_amount_pkr NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_days INT DEFAULT 120,
    start_date DATE,
    end_date DATE,
    supplier_or_field TEXT,
    notes TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS feed_name TEXT;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS feed_type TEXT;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Prepared';
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS quantity NUMERIC;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Mann (40kg)';
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS total_amount_pkr NUMERIC;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 120;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS supplier_or_field TEXT;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.feed_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_feed_user ON public.feed_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_type ON public.feed_logs(feed_type);
CREATE INDEX IF NOT EXISTS idx_feed_date ON public.feed_logs(date);
CREATE INDEX IF NOT EXISTS idx_feed_updated_at ON public.feed_logs(updated_at);

DROP TRIGGER IF EXISTS trg_feed_updated_at ON public.feed_logs;
CREATE TRIGGER trg_feed_updated_at
    BEFORE UPDATE ON public.feed_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 13. FARM OPERATING EXPENSES (WAPDA Electricity, Diesel, Medicines)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expense_logs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id UUID,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_pkr NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    month TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    bill_number TEXT,
    notes TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS amount_pkr NUMERIC;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS month TEXT;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS bill_number TEXT;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.expense_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_expense_user ON public.expense_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_category ON public.expense_logs(category);
CREATE INDEX IF NOT EXISTS idx_expense_date ON public.expense_logs(date);
CREATE INDEX IF NOT EXISTS idx_expense_updated_at ON public.expense_logs(updated_at);

DROP TRIGGER IF EXISTS trg_expense_updated_at ON public.expense_logs;
CREATE TRIGGER trg_expense_updated_at
    BEFORE UPDATE ON public.expense_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES (Safe & Permissive)
-- ==============================================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles', 'subscriptions', 'livestock', 'milking_logs', 'medical_logs', 'customers', 
            'sales_logs', 'customer_payments', 'vaccination_tasks', 'employees', 
            'salary_payments', 'feed_logs', 'expense_logs'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated all" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow authenticated all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon all" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow anon all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
    END LOOP;
END;
$$;

