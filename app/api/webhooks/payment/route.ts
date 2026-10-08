import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const paddleSignature = req.headers.get('paddle-signature') || req.headers.get('Paddle-Signature') || '';
    const webhookSecret = (process.env.PADDLE_WEBHOOK_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || '').trim();

    // 1. Cryptographic Paddle Webhook Signature Verification
    if (paddleSignature && webhookSecret) {
      try {
        const parts = paddleSignature.split(';');
        const ts = parts.find((p) => p.startsWith('ts='))?.split('=')[1];
        const h1 = parts.find((p) => p.startsWith('h1='))?.split('=')[1];

        if (ts && h1) {
          const signedPayload = `${ts}:${rawBody}`;
          const computedHash = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
          
          if (computedHash !== h1) {
            console.error('Invalid Paddle webhook signature verification.');
            return NextResponse.json(
              { success: false, error: 'Invalid webhook signature.' },
              { status: 400 }
            );
          }
        }
      } catch (sigErr) {
        console.warn('Paddle signature verification parsing warning:', sigErr);
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType = payload.event_type || payload.type || 'transaction.completed';
    const eventData = payload.data || {};

    // 2. Extract Customer & Subscription Information
    const customData = eventData.custom_data || {};
    const targetUserId = customData.user_id || customData.userId || payload.user_id;
    const planName = customData.plan_name || customData.plan_id || eventData.items?.[0]?.price?.name || 'Farm Pro Annual';
    const targetTxId = eventData.id || eventData.transaction_id || `PADDLE-${Date.now()}`;
    
    // Amount
    let targetAmount = 2199;
    if (eventData.details?.totals?.total) {
      targetAmount = parseFloat(eventData.details.totals.total) / 100;
    } else if (eventData.items?.[0]?.price?.unit_price?.amount) {
      targetAmount = parseFloat(eventData.items[0].price.unit_price.amount) / 100;
    }

    const targetMethod = eventData.payment_method?.type || 'Paddle (Credit/Debit/ApplePay)';

    if (!targetUserId) {
      console.warn('[Paddle Webhook Note] Event received without user_id in custom_data:', eventType, targetTxId);
      // Return 200 to acknowledge Paddle receipt
      return NextResponse.json({ success: true, message: 'Event logged.' });
    }

    const adminSupabase = createAdminClient();

    // 3. Deduplication / Anti-Replay check
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

    // 4. Calculate Expiration Period
    const isStarter = planName.toLowerCase().includes('starter') || planName.toLowerCase().includes('monthly');
    const durationDays = isStarter ? 30 : 365;
    
    let periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    if (eventData.current_billing_period?.ends_at) {
      periodEnd = new Date(eventData.current_billing_period.ends_at);
    }

    const invoiceNumber = `PAD-${Date.now().toString().slice(-6)}`;

    // 5. Update Profile Subscription Status in Supabase
    await adminSupabase.from('profiles').upsert({
      id: targetUserId,
      subscription_plan: planName,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    });

    // 6. Insert into Subscriptions Table
    await adminSupabase.from('subscriptions').insert({
      user_id: targetUserId,
      plan_tier: planName,
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

    // 7. Insert into Payment Transactions Audit Table
    try {
      await adminSupabase.from('payment_transactions').insert({
        trx_id: targetTxId,
        user_id: targetUserId,
        farm_id: targetUserId,
        amount: targetAmount,
        currency: eventData.currency_code || 'USD',
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
      message: 'Subscription successfully activated via Paddle webhook.',
      invoiceNumber,
      expiresAt: periodEnd.toISOString(),
    });
  } catch (error: any) {
    console.error('Paddle Webhook Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
