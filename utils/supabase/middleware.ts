import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const hasEmployeeSession = request.cookies.get('employee_session')?.value === 'true'

  // Allow public assets, APIs, and auth callbacks to pass through immediately
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // 1. Unauthenticated users cannot access portal, billing, or onboarding
  if (!user && !hasEmployeeSession) {
    if (
      pathname.startsWith('/portal') || 
      pathname.startsWith('/admin') || 
      pathname.startsWith('/billing') || 
      pathname.startsWith('/onboarding')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // 2. Authenticated user checks
  if (user) {
    let isOnboarded = false
    let isSubActive = false

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, full_name, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle()

      const hasFarm = Boolean(user.user_metadata?.farm_name || user.user_metadata?.onboarded);
      const hasName = Boolean(user.user_metadata?.full_name || profile?.full_name);
      isOnboarded = Boolean(hasFarm && hasName);

      if (profile?.subscription_status === 'trial') {
        const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
        isSubActive = trialEnds > Date.now()
      } else if (profile?.subscription_status === 'active') {
        const { data: latestSub } = await supabase
          .from('subscriptions')
          .select('current_period_end, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestSub?.current_period_end) {
          const expiryTime = new Date(latestSub.current_period_end).getTime()
          isSubActive = expiryTime > Date.now()
        } else {
          isSubActive = true
        }
      }
    } catch {
      isSubActive = false
    }

    // A. If onboarding is incomplete, force to /onboarding
    if (!isOnboarded) {
      if (pathname !== '/onboarding' && pathname !== '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // B. If user is on /onboarding but already verified, redirect onward
    if (pathname === '/onboarding') {
      const url = request.nextUrl.clone()
      url.pathname = isSubActive ? '/portal/admin/dashboard' : '/billing'
      return NextResponse.redirect(url)
    }

    // C. Redirect logged in user from /login
    if (pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = isSubActive ? '/portal/admin/dashboard' : '/billing'
      return NextResponse.redirect(url)
    }

    // D. Paywall Gate: If accessing protected admin/employee routes without active sub/trial
    const isPaywallExempt = pathname.startsWith('/portal/subscription') || pathname.startsWith('/billing')
    const isProtectedAppRoute = pathname.startsWith('/portal/admin') || pathname.startsWith('/portal/employee') || pathname.startsWith('/admin') || pathname === '/portal'

    if (isProtectedAppRoute && !isSubActive && !isPaywallExempt) {
      const url = request.nextUrl.clone()
      url.pathname = '/billing'
      return NextResponse.redirect(url)
    }

    // E. Redirect authenticated users from landing '/' to dashboard
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = isSubActive ? '/portal/admin/dashboard' : '/billing'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
