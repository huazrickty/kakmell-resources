import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cookie name for caching the user's role (for fast routing decisions)
// RLS policies enforce actual data security — this cookie is only for UX routing.
const ROLE_COOKIE = 'kakmell_role'

// Routes that do NOT need auth — everyone can visit these
const PUBLIC_PATHS = ['/login', '/register', '/pending']

// Admin-only routes
const ADMIN_ONLY = ['/settings/users']

// Admin + kitchen routes (ZB Group hall staff must not see these)
const ADMIN_KITCHEN_PREFIXES = ['/dashboard', '/bookings', '/calculator', '/settings']

// Hall roles only
const HALL_ONLY_PREFIXES = ['/hall-view']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public auth paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Build a response object that the Supabase client can attach refreshed cookies to
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to both request (for downstream reads) and response (sent to browser)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — also propagates auth cookies to response
  const { data: { session } } = await supabase.auth.getSession()

  // ── Not authenticated → /login ────────────────────────────
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Resolve role ──────────────────────────────────────────
  // Always re-query when cookie is missing or 'pending' (approved users must not
  // stay locked out due to a stale cookie). Approved roles trust the 8h cookie.
  let role: string = request.cookies.get(ROLE_COOKIE)?.value ?? ''

  if (!role || role === 'pending') {
    // Service role client — bypasses RLS; anon auth.uid() is unreliable in Edge Runtime.
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    role = profile?.role ?? 'pending'

    response.cookies.set(ROLE_COOKIE, role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
  }

  // ── Pending: may only visit /pending ─────────────────────
  if (role === 'pending') {
    if (pathname === '/pending') return response
    const url = request.nextUrl.clone()
    url.pathname = '/pending'
    return NextResponse.redirect(url)
  }

  // ── Root → role-based home ────────────────────────────────
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = (role === 'hall_staff' || role === 'hall_owner') ? '/hall-view' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Admin-only paths (/settings/users) ───────────────────
  if (ADMIN_ONLY.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // ── Admin + kitchen paths ─────────────────────────────────
  if (ADMIN_KITCHEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (role !== 'admin' && role !== 'kitchen') {
      const url = request.nextUrl.clone()
      url.pathname = '/hall-view'
      return NextResponse.redirect(url)
    }
  }

  // ── Hall-only paths ───────────────────────────────────────
  if (HALL_ONLY_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (role !== 'hall_staff' && role !== 'hall_owner') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
