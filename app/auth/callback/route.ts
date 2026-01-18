import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const redirect = searchParams.get('redirect') || '/'
  const error_description = searchParams.get('error_description')

  // If Supabase returned an error, show it
  if (error_description) {
    console.error('Auth callback error from Supabase:', error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description)}`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from Server Component.
            // This can be ignored if the middleware refreshes user sessions.
          }
        },
      },
    }
  )

  // Handle PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Code exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // Successfully authenticated
    return NextResponse.redirect(`${origin}${redirect}`)
  }

  // Handle token hash flow (magic link verify)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    })

    if (error) {
      console.error('Token verification error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // Successfully authenticated
    return NextResponse.redirect(`${origin}${redirect}`)
  }

  // No code or token_hash provided
  console.error('Auth callback called without code or token_hash. Params:', Object.fromEntries(searchParams))
  return NextResponse.redirect(`${origin}/login?error=missing_auth_params`)
}
