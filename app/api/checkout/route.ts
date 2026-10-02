import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SUBSCRIPTION_PLANS, PlanKey } from '@/config/subscription';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { planId } = body;

    const plan = SUBSCRIPTION_PLANS[planId as PlanKey] || SUBSCRIPTION_PLANS.starter;
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const amount = plan.introPrice;
    
    // Resolve base application URL for callbacks
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectUrl = `${origin}/billing?status=success&order=${orderId}`;
    const cancelUrl = `${origin}/billing?status=cancelled&order=${orderId}`;

    // STRICT SAFEPAY PRODUCTION CONSTANTS
    const BASE_URL = 'https://api.getsafepay.com';
    const CHECKOUT_HOST = 'https://getsafepay.com/checkout/pay';
    const env = 'production';

    const apiKey = (process.env.SAFEPAY_PRODUCTION_API_KEY || process.env.SAFEPAY_API_KEY || '').trim();
    const secretKey = (process.env.SAFEPAY_PRODUCTION_SECRET_KEY || process.env.SAFEPAY_SECRET_KEY || '').trim();

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { success: false, error: 'Safepay Production API Keys are missing in environment variables.' },
        { status: 500 }
      );
    }

    // STEP 1: CREATE PAYMENT TRACKER ON PRODUCTION SERVER
    const orderRes = await fetch(`${BASE_URL}/order/v1/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': secretKey,
      },
      body: JSON.stringify({
        client: apiKey,
        amount: amount,
        currency: 'PKR',
      }),
    });

    const orderData = await orderRes.json();
    console.log('[Safepay FORCED PRODUCTION] Order Init Response:', JSON.stringify(orderData));

    const trackerToken = orderData?.data?.token || orderData?.data?.tracker?.token || orderData?.token;

    // STEP 2: CREATE AUTHENTICATION PASSPORT TOKEN ON PRODUCTION SERVER
    let passportToken = '';
    try {
      const passportRes = await fetch(`${BASE_URL}/client/passport/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SFPY-MERCHANT-SECRET': secretKey,
        },
        body: JSON.stringify({
          client: apiKey,
        }),
      });

      const passportData = await passportRes.json();
      console.log('[Safepay FORCED PRODUCTION] Passport Response:', JSON.stringify(passportData));
      passportToken = typeof passportData.data === 'string' ? passportData.data : (passportData?.data?.token || passportData?.token || '');
    } catch (passportErr) {
      console.warn('[Safepay PRODUCTION] Passport token warning:', passportErr);
    }

    // STEP 3: CONSTRUCT PRODUCTION CHECKOUT URL WITH STRICT URL ENCODING
    const encodedRedirect = encodeURIComponent(redirectUrl);
    const encodedCancel = encodeURIComponent(cancelUrl);
    const tokenToUse = trackerToken || `track_${Date.now()}`;

    const checkoutUrl = `${CHECKOUT_HOST}?beacon=${tokenToUse}&tbt=${passportToken}&env=${env}&source=custom&cancel_url=${encodedCancel}&redirect_url=${encodedRedirect}`;

    return NextResponse.json({
      success: true,
      orderId,
      checkoutUrl,
      plan: {
        id: plan.id,
        name: plan.name,
        amount,
      },
    });
  } catch (error: any) {
    console.error('Safepay Production Checkout Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error creating Safepay production checkout session.' },
      { status: 500 }
    );
  }
}
