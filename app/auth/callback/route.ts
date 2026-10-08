import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/portal/admin/dashboard'
  const origin = requestUrl.origin

  if (code) {
    // Prepare redirect response
    const redirectUrl = new URL(next, origin)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, {
                ...options,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      let finalRedirect = '/onboarding'
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const adminSupabase = createAdminClient()
          
          // 1. Fetch user profile from Supabase
          const { data: profile } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          // 2. If profile does not exist, initialize it with core fields
          if (!profile) {
            const displayName = 
              user.user_metadata?.full_name || 
              user.user_metadata?.name || 
              user.user_metadata?.user_name || 
              user.email?.split('@')[0] || 
              'Farm Admin'

            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email,
              full_name: displayName,
              role: 'admin',
              subscription_status: 'inactive',
              subscription_plan: 'Farm Pro Annual',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }

          const hasFarm = Boolean(user.user_metadata?.farm_name || user.user_metadata?.onboarded);
          const hasName = Boolean(user.user_metadata?.full_name || profile?.full_name);
          const isOnboarded = hasFarm && hasName;

          if (!isOnboarded) {
            // Farm name or owner name is not yet onboarded
            finalRedirect = '/onboarding'
          } else {
            // 3. Profile Onboarded: Check subscription / trial status
            const now = Date.now()

            if (profile?.subscription_status === 'trial') {
              const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
              if (trialEnds > now) {
                finalRedirect = next && next !== '/billing' ? next : '/portal/admin/dashboard'
              } else {
                // Trial expired
                await supabase
                  .from('profiles')
                  .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
                  .eq('id', user.id)

                finalRedirect = '/billing'
              }
            } else if (profile?.subscription_status === 'active') {
              const { data: latestSub } = await adminSupabase
                .from('subscriptions')
                .select('current_period_end, status')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('current_period_end', { ascending: false })
                .limit(1)
                .maybeSingle()

              let isExpired = false
              if (latestSub?.current_period_end) {
                const expiryTime = new Date(latestSub.current_period_end).getTime()
                if (expiryTime <= now) {
                  isExpired = true
                }
              }

              if (isExpired) {
                await adminSupabase
                  .from('profiles')
                  .update({
                    subscription_status: 'inactive',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', user.id)

                finalRedirect = '/billing'
              } else {
                finalRedirect = next && next !== '/billing' ? next : '/portal/admin/dashboard'
              }
            } else {
              // Inactive status
              finalRedirect = '/billing'
            }
          }
        }
      } catch (err) {
        console.warn('Subscription status check in auth callback:', err)
        finalRedirect = '/onboarding'
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (!isLocalEnv && forwardedHost) {
        const proto = request.headers.get('x-forwarded-proto') || 'https'
        return NextResponse.redirect(`${proto}://${forwardedHost}${finalRedirect}`, {
          headers: response.headers,
        })
      }
      return NextResponse.redirect(new URL(finalRedirect, origin), {
        headers: response.headers,
      })
    }
    
    console.error('Google Auth callback exchange error:', error)
  }

  // If code is missing or exchange failed, redirect back to login with error
  return NextResponse.redirect(new URL('/login?error=Could%20not%20authenticate%20user', origin))
}
