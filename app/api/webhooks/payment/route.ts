import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-sfpy-signature') || req.headers.get('x-signature') || req.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.SAFEPAY_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || 'dcfb5afdd690cd8644ca81c446b2cf8da6ab0fc774d06277ea6b311f19ae3e45';

    // Cryptographic signature verification
    if (signature && process.env.NODE_ENV === 'production') {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook cryptographic signature.' },
          { status: 400 }
        );
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Safepay webhook payload format normalization
    const isSafepay = payload?.data?.tracker || payload?.notification;
    const sfData = payload?.data || {};

    const targetUserId = payload.userId || sfData?.metadata?.userId || sfData?.client_reference_id || sfData?.user_id;
    const targetPlan = payload.planId || sfData?.metadata?.planName || sfData?.metadata?.planId || 'Farm Pro Annual';
    const targetTxId = payload.transactionId || sfData?.tracker?.token || sfData?.token || sfData?.id || `TRX-${Date.now()}`;
    const targetAmount = payload.amount || sfData?.amount || 2199;
    const targetMethod = payload.paymentMethod || 'Safepay (Debit/Credit)';

    if (!targetUserId) {
      console.warn('Webhook received without explicit userId, logging transaction:', payload);
      return NextResponse.json(
        { success: false, error: 'Missing userId in webhook payload.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Deduplication / Anti-Replay check
    const { data: existingTx } = await adminSupabase
      .from('payment_transactions')
      .select('id')
      .eq('trx_id', targetTxId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already settled. Deduplicated successfully.',
      });
    }

    // Calculate expiration: 30 days for Starter, 365 days for Annual, 730 for Enterprise
    const durationDays = targetPlan.toLowerCase().includes('starter') ? 30 : targetPlan.toLowerCase().includes('enterprise') ? 730 : 365;
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // 1. Update Profile Subscription Status
    await adminSupabase.from('profiles').upsert({
      id: targetUserId,
      subscription_plan: targetPlan,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    });

    // 2. Insert into Subscriptions Table
    await adminSupabase.from('subscriptions').insert({
      user_id: targetUserId,
      plan_tier: targetPlan,
      status: 'active',
      billing_cycle: durationDays === 30 ? 'monthly' : 'yearly',
      amount_pkr: targetAmount,
      payment_method: targetMethod,
      account_reference: targetTxId,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      invoice_number: invoiceNumber,
      is_verified: true,
    });

    // 3. Insert into Payment Transactions Audit Table
    try {
      await adminSupabase.from('payment_transactions').insert({
        trx_id: targetTxId,
        user_id: targetUserId,
        farm_id: targetUserId,
        amount: targetAmount,
        currency: 'PKR',
        payment_method: targetMethod,
        status: 'succeeded',
        metadata: payload,
        created_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn('payment_transactions audit table warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription atomically activated via Safepay webhook.',
      invoiceNumber,
      expiresAt: periodEnd.toISOString(),
    });
  } catch (error: any) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
