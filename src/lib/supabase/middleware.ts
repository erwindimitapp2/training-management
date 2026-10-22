import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const pathname = request.nextUrl.pathname

  // Skip static assets and internal endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // If env vars are not set yet, don't crash the server
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL atau Anon/Publishable Key belum diatur di .env.local')
    return supabaseResponse
  }

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
    await supabase.auth.signOut()
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
}
