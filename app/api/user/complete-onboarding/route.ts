import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Helper to normalize alphanumeric strings for fuzzy anti-abuse matching
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

    const body = await req.json();
    const { ownerName, farmName, deviceFingerprint } = body;

    if (!ownerName?.trim() || !farmName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Farm Owner Name and Farm Name are required.' },
        { status: 400 }
      );
    }

    const cleanOwner = sanitizeIdentity(ownerName);
    const cleanFarm = sanitizeIdentity(farmName);
    const clientFingerprint = deviceFingerprint?.trim() || 'unknown_device';

    // 1. Check existing user profile & metadata
    let currentTrialUsed = Boolean(user.user_metadata?.trial_used);
    let inheritTrialUsed = false;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, full_name, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (currentProfile?.subscription_status === 'trial') {
        currentTrialUsed = true;
      }
    } catch (e) {
      console.warn('Could not read current profile:', e);
    }

    // 2. Anti-Abuse Check: Normalized Owner Name check
    try {
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, subscription_status')
        .neq('id', user.id);

      if (existingProfiles && existingProfiles.length > 0) {
        for (const p of existingProfiles) {
          const existingClean = sanitizeIdentity(p.full_name || '');
          if (existingClean && existingClean.length >= 4 && (existingClean === cleanOwner || existingClean === cleanFarm)) {
            inheritTrialUsed = true;
            break;
          }
        }
      }
    } catch (dedupErr) {
      console.warn('Trial deduplication check note:', dedupErr);
    }

    const isTrialAlreadyUsed = inheritTrialUsed || currentTrialUsed;

    // 3. Save to Supabase Auth User Metadata (Guaranteed to succeed on all schemas)
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        full_name: ownerName.trim(),
        farm_name: farmName.trim(),
        device_fingerprint: clientFingerprint,
        trial_used: isTrialAlreadyUsed,
        phone_verified: true,
        onboarded: true,
      }
    });

    if (metaErr) {
      console.error('Failed to update auth metadata:', metaErr);
    }

    // 4. Save to profiles table (Core columns)
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: ownerName.trim(),
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      console.error('Failed to update profile core record:', profileErr);
    }

    // 5. Attempt saving extended columns if they exist in schema
    try {
      await supabase
        .from('profiles')
        .update({
          farm_name: farmName.trim(),
          device_fingerprint: clientFingerprint,
          phone_verified: true,
          trial_used: isTrialAlreadyUsed,
        })
        .eq('id', user.id);
    } catch {
      // Ignored if optional columns are not yet in database schema
    }

    return NextResponse.json({
      success: true,
      message: 'Farm profile successfully created.',
      trialUsed: isTrialAlreadyUsed,
      redirectUrl: '/billing',
    });
  } catch (error: any) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during onboarding.' },
      { status: 500 }
    );
  }
}

