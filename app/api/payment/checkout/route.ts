import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SUBSCRIPTION_PLANS, PlanKey, MERCHANT_CONFIG } from '@/config/subscription';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { planId } = body;

    const plan = SUBSCRIPTION_PLANS[planId as PlanKey];
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      orderId,
      plan: {
        id: plan.id,
        name: plan.name,
        amount: plan.introPrice,
        duration: plan.duration
      },
      merchant: {
        accountTitle: MERCHANT_CONFIG.accountTitle,
        bankName: MERCHANT_CONFIG.bankName,
        iban: MERCHANT_CONFIG.nayapayIban,
        raast: MERCHANT_CONFIG.raastMobile
      },
      user: user ? { id: user.id, email: user.email } : null
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error generating checkout intent' },
      { status: 500 }
    );
  }
}
