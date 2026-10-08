import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthenticated' },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // If paid subscriber, active
    if (profile.subscription_status === 'active') {
      return NextResponse.json({
        success: true,
        status: 'active',
        plan: profile.subscription_plan || 'Farm Pro Annual',
      });
    }

    // If in free trial, calculate remaining days against online database
    if (profile.subscription_status === 'trial') {
      const now = Date.now();
      const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;

      if (trialEnds <= now) {
        // Trial expired on server: mark inactive
        await adminSupabase
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        return NextResponse.json({
          success: true,
          status: 'expired',
          message: 'Your 15-day free trial has concluded. Please subscribe to continue.',
          daysRemaining: 0,
          trialUsed: true,
        });
      }

      // Update daily online check timestamp
      await adminSupabase
        .from('profiles')
        .update({
          trial_last_online_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      const msRemaining = trialEnds - now;
      const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      return NextResponse.json({
        success: true,
        status: 'trial',
        daysRemaining,
        trialEndsAt: profile.trial_ends_at,
        lastOnlineAt: new Date().toISOString(),
      });
    }

    // Inactive status
    return NextResponse.json({
      success: true,
      status: 'inactive',
      trialUsed: profile.trial_used || false,
    });
  } catch (error: any) {
    console.error('Trial ping error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error checking trial status.' },
      { status: 500 }
    );
  }
}
