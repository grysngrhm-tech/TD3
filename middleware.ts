import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
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

  // Get user session - this refreshes the session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth/callback']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Generated image routes (Next.js image generation)
  const imageRoutes = ['/icon', '/apple-icon', '/opengraph-image', '/twitter-image', '/icon-192.png', '/icon-512.png']
  const isImageRoute = imageRoutes.includes(pathname)

  // API routes handle their own auth via service role key
  const isApiRoute = pathname.startsWith('/api/')

  // Static assets and Next.js internals
  const isStaticOrInternal =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')

  // Allow public routes, API routes, image routes, and static assets
  if (isPublicRoute || isApiRoute || isImageRoute || isStaticOrInternal) {
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // User is authenticated, allow access
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
