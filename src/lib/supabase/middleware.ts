import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  const pathname = request.nextUrl.pathname

  // Skip static assets, favicon, and internal API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // If env vars are not set yet, redirect to /login with env_missing warning
  if (!supabaseUrl || !supabaseKey) {
    if (pathname !== '/login') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'env_missing')
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

    // User is not logged in
    if (!user) {
      if (pathname === '/login') {
        return supabaseResponse
      }
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // User is logged in: fetch their profile from public.users
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    // If user profile does not exist or user is inactive
    if (!profile || !profile.is_active) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'inactive')
      return NextResponse.redirect(redirectUrl)
    }

    // If user is on /login or root /, redirect to appropriate landing page
    if (pathname === '/login' || pathname === '/') {
      const target = profile.role === 'trainer' ? '/trainer' : '/dashboard'
      return NextResponse.redirect(new URL(target, request.url))
    }

    // Guard: trainee cannot access /trainer routes
    if (profile.role === 'trainee' && pathname.startsWith('/trainer')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware session error:', error)
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }
}
