import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

function sanitizeIdentity(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

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

    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch {
      // Body may be empty on simple POST
    }

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, subscription_status, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle();

    const userFarmName = user.user_metadata?.farm_name || '';
    const userOwnerName = profile?.full_name || user.user_metadata?.full_name || '';

    if (!userFarmName && !userOwnerName) {
      return NextResponse.json(
        { success: false, error: 'Farm profile details missing. Please complete setup first.' },
        { status: 404 }
      );
    }

    // 2. Strict 1-Trial-Per-Account Enforcement
    const isTrialUsed = Boolean(user.user_metadata?.trial_used);
    if (isTrialUsed) {
      return NextResponse.json(
        { success: false, error: 'Your farm account has already redeemed its 15-day free trial.' },
        { status: 400 }
      );
    }

    // If already active paid subscriber, prevent overriding
    if (profile?.subscription_status === 'active') {
      return NextResponse.json({
        success: true,
        message: 'You already have an active paid subscription.',
        redirectUrl: '/portal/admin/dashboard',
      });
    }

    const currentFp = requestBody.deviceFingerprint?.trim() || user.user_metadata?.device_fingerprint || 'unknown_device';
    const cleanFarm = sanitizeIdentity(userFarmName);
    const cleanOwner = sanitizeIdentity(userOwnerName);

    // 3. Multi-Factor Identity Anti-Abuse Check
    try {
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, subscription_status')
        .neq('id', user.id);

      if (existingProfiles && existingProfiles.length > 0) {
        for (const account of existingProfiles) {
          const existingCleanOwner = sanitizeIdentity(account.full_name || '');
          if (existingCleanOwner && cleanOwner && existingCleanOwner === cleanOwner && cleanOwner.length >= 4) {
            // Update auth metadata to mark trial used
            await supabase.auth.updateUser({ data: { trial_used: true } });
            
            return NextResponse.json(
              { 
                success: false, 
                error: 'A 15-Day Free Trial has already been claimed for this farm owner. Please select a commercial subscription plan.' 
              },
              { status: 400 }
            );
          }
        }
      }
    } catch (checkErr) {
      console.warn('Trial fraud check note:', checkErr);
    }

    // 4. Calculate 15 Days Online Countdown
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const invoiceNumber = `TRL-${Date.now().toString().slice(-6)}`;

    // 5. Update Auth User Metadata
    await supabase.auth.updateUser({
      data: {
        trial_used: true,
        device_fingerprint: currentFp,
        trial_ends_at: trialEnds.toISOString(),
      }
    });

    // 6. Update Profile to Free Trial Status (Core columns)
    const { error: profUpdateErr } = await supabase.from('profiles').upsert({
      id: user.id,
      subscription_status: 'trial',
      subscription_plan: '15-Day Free Trial',
      trial_ends_at: trialEnds.toISOString(),
      updated_at: now.toISOString(),
    });

    if (profUpdateErr) {
      console.warn('Profile trial update warning:', profUpdateErr);
    }

    // Try optional schema columns safely
    try {
      await supabase.from('profiles').update({
        device_fingerprint: currentFp !== 'unknown_device' ? currentFp : undefined,
        trial_used: true,
        trial_started_at: now.toISOString(),
        trial_last_online_at: now.toISOString(),
      }).eq('id', user.id);
    } catch {
      // Ignored if optional columns are absent
    }

    // 7. Insert audit trail into subscriptions table
    try {
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_tier: '15-Day Free Trial',
        status: 'trial',
        billing_cycle: 'trial',
        amount_pkr: 0,
        payment_method: 'Free Trial',
        account_reference: `TRIAL-${user.id.slice(0, 8)}`,
        current_period_start: now.toISOString(),
        current_period_end: trialEnds.toISOString(),
        invoice_number: invoiceNumber,
        is_verified: true,
      });
    } catch (subErr) {
      console.warn('Subscription trial ledger record note:', subErr);
    }

    const response = NextResponse.json({
      success: true,
      message: '15-Day Free Trial activated successfully!',
      redirectUrl: '/portal/admin/dashboard',
      expiresAt: trialEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysRemaining: 15,
    });

    // Set employee_session cookie for instant access
    response.cookies.set('employee_session', 'true', {
      maxAge: 15 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    console.error('Free trial activation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error starting free trial.' },
      { status: 500 }
    );
  }
}

