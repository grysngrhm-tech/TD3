import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'
import crypto from 'crypto'

export { supabaseAdmin } from '@/lib/supabase-server'

type AuthSuccess = [User, null]
type AuthFailure = [null, NextResponse]
type AuthResult = AuthSuccess | AuthFailure

type WebhookSuccess = [true, null]
type WebhookFailure = [false, NextResponse]
type WebhookResult = WebhookSuccess | WebhookFailure

/**
 * Validate the session from request cookies and return the authenticated user.
 * Returns [user, null] on success or [null, 401 Response] on failure.
 */
export async function requireAuth(): Promise<AuthResult> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Not needed for read-only operations
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return [null, NextResponse.json({ error: 'Authentication required' }, { status: 401 })]
  }

  return [user, null]
}

/**
 * Validate the session and check that the user has a specific permission.
 * Returns [user, null] on success or [null, 401/403 Response] on failure.
 */
export async function requirePermission(code: string): Promise<AuthResult> {
  const [user, authError] = await requireAuth()
  if (authError) return [null, authError]

  const { data, error } = await supabaseAdmin.rpc('has_permission', {
    check_user_id: user.id,
    required_permission: code,
  })

  if (error || data !== true) {
    return [
      null,
      NextResponse.json(
        { error: `Permission denied: ${code} permission required` },
        { status: 403 }
      ),
    ]
  }

  return [user, null]
}

/**
 * Verify the webhook secret from request headers.
 * FAIL-CLOSED: if the N8N_CALLBACK_SECRET env var is unset or empty, the request is rejected.
 * Uses timing-safe comparison to prevent timing attacks.
 * Returns [true, null] on success or [false, 401 Response] on failure.
 */
export function verifyWebhookSecret(request: NextRequest): WebhookResult {
  const expectedSecret = process.env.N8N_CALLBACK_SECRET

  if (!expectedSecret) {
    console.error('N8N_CALLBACK_SECRET is not configured — rejecting webhook request (fail-closed)')
    return [false, NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 })]
  }

  const provided = request.headers.get('x-td3-webhook-secret')

  if (!provided) {
    return [false, NextResponse.json({ error: 'Missing webhook secret' }, { status: 401 })]
  }

  const expectedBuf = Buffer.from(expectedSecret, 'utf-8')
  const providedBuf = Buffer.from(provided, 'utf-8')

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return [false, NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })]
  }

  return [true, null]
}
