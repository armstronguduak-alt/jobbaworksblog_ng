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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup') ||
                     request.nextUrl.pathname.startsWith('/forgot-password') ||
                     request.nextUrl.pathname.startsWith('/reset-password') ||
                     request.nextUrl.pathname.startsWith('/admin-login')

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                           request.nextUrl.pathname.startsWith('/earn') || 
                           request.nextUrl.pathname.startsWith('/wallet') || 
                           request.nextUrl.pathname.startsWith('/articles') || 
                           request.nextUrl.pathname.startsWith('/swap') || 
                           request.nextUrl.pathname.startsWith('/referral') || 
                           request.nextUrl.pathname.startsWith('/analytics') || 
                           request.nextUrl.pathname.startsWith('/transactions') || 
                           request.nextUrl.pathname.startsWith('/settings') || 
                           request.nextUrl.pathname.startsWith('/profile') || 
                           request.nextUrl.pathname.startsWith('/plans') ||
                           request.nextUrl.pathname.startsWith('/leaderboard') ||
                           request.nextUrl.pathname.startsWith('/create-article') ||
                           request.nextUrl.pathname.startsWith('/edit-article') ||
                           request.nextUrl.pathname.startsWith('/mystories')

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin-login')

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Handle admin routes
  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin-login'
      return NextResponse.redirect(url)
    } else {
      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'moderator'])
        .maybeSingle()

      if (!roleData) {
        const url = request.nextUrl.clone()
        url.pathname = '/' // Redirect non-admins to home
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect authenticated users from auth pages (login/signup)
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.pathname.startsWith('/admin-login') ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
