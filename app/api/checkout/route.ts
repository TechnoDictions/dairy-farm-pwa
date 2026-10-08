import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SUBSCRIPTION_PLANS, PlanKey } from '@/config/subscription';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId } = body;

    if (planId === 'trial') {
      return NextResponse.json(
        { success: false, error: 'Free Trial does not require payment checkout. Use /api/trial/start instead.' },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS[planId as PlanKey] || SUBSCRIPTION_PLANS.starter;
    const orderId = `PAD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Resolve base application URL for callbacks
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = `${origin}/billing?status=success&order=${orderId}`;
    const cancelUrl = `${origin}/billing?status=cancelled&order=${orderId}`;

    // Paddle Configuration
    const paddleEnv = (process.env.NEXT_PUBLIC_PADDLE_ENV || process.env.PADDLE_ENV || 'sandbox').trim().toLowerCase();
    const isProd = paddleEnv === 'production';
    const PADDLE_API_HOST = isProd ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

    const apiKey = (process.env.PADDLE_API_KEY || '').trim();
    const clientToken = (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || process.env.PADDLE_CLIENT_TOKEN || '').trim();

    // Specific Paddle Price IDs if configured
    const priceId = planId === 'pro' 
      ? (process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO || process.env.PADDLE_PRICE_ID_PRO)
      : (process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER || process.env.PADDLE_PRICE_ID_STARTER);

    // If Paddle API Key is provided, create a server-side Paddle transaction
    if (apiKey) {
      const transactionPayload: any = {
        items: priceId ? [{ price_id: priceId, quantity: 1 }] : undefined,
        custom_data: {
          user_id: user.id,
          plan_id: plan.id,
          plan_name: plan.name,
          email: user.email,
        },
        customer: {
          email: user.email,
        },
        checkout: {
          url: successUrl,
        }
      };

      // If price ID is not set, create dynamic non-catalog transaction
      if (!priceId) {
        transactionPayload.items = [
          {
            price: {
              description: `${plan.name} - Dairy Farm OS SaaS`,
              unit_price: {
                amount: (plan.introPrice * 100).toString(), // in smallest currency unit or USD cents
                currency_code: 'PKR',
              },
              product: {
                name: `Lactis ${plan.name}`,
                tax_category: 'standard',
              }
            },
            quantity: 1,
          }
        ];
      }

      try {
        const paddleRes = await fetch(`${PADDLE_API_HOST}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(transactionPayload),
        });

        const paddleData = await paddleRes.json();

        if (paddleRes.ok && paddleData?.data?.id) {
          const txId = paddleData.data.id;
          const checkoutUrl = paddleData.data.checkout?.url || `${PADDLE_API_HOST}/checkout?_ptxn=${txId}`;

          return NextResponse.json({
            success: true,
            orderId,
            transactionId: txId,
            checkoutUrl,
            clientToken,
            env: paddleEnv,
            plan: {
              id: plan.id,
              name: plan.name,
              amount: plan.introPrice,
            },
          });
        } else {
          console.warn('[Paddle API Error]', paddleData);
        }
      } catch (paddleErr) {
        console.error('[Paddle Server Request Exception]', paddleErr);
      }
    }

    // Fallback response for Paddle.js client overlay
    return NextResponse.json({
      success: true,
      orderId,
      checkoutUrl: `${origin}/billing?status=paddle_ready&plan=${planId}`,
      clientToken: clientToken || 'test_paddle_token',
      priceId: priceId || undefined,
      env: paddleEnv,
      plan: {
        id: plan.id,
        name: plan.name,
        amount: plan.introPrice,
      },
    });
  } catch (error: any) {
    console.error('Paddle Checkout Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error creating Paddle checkout session.' },
      { status: 500 }
    );
  }
}
