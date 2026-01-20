import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { parseUserAgent } from '@/lib/deviceInfo'

/**
 * Login Activity API
 *
 * Called after successful login to log the login event with IP/geolocation metadata.
 * Uses service role to bypass RLS (user_activity table requires user_id match).
 *
 * POST /api/activity/login
 * Body: { userId: string, userAgent: string }
 */

interface LoginActivityRequest {
  userId: string
  userAgent: string
}

interface GeoLocation {
  city: string | null
  country: string | null
}

/**
 * Get geolocation from IP address
 * Uses ip-api.com free tier (45 req/min, no API key needed)
 */
async function getGeoLocation(ip: string): Promise<GeoLocation> {
  // Skip for localhost/private IPs
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    return { city: null, country: null }
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,country`, {
      // Short timeout to not block login
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      return { city: null, country: null }
    }

    const data = await response.json()
    return {
      city: data.city || null,
      country: data.country || null,
    }
  } catch {
    // Geolocation failure is not critical
    return { city: null, country: null }
  }
}

/**
 * Extract client IP from request headers
 * Handles Vercel, Cloudflare, and other proxies
 */
function getClientIP(request: NextRequest): string {
  // Vercel
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Other proxies
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginActivityRequest = await request.json()
    const { userId, userAgent } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Parse user agent for device info
    const { deviceType, browser, os } = parseUserAgent(userAgent || '')

    // Get client IP
    const ipAddress = getClientIP(request)

    // Get geolocation (fire-and-forget style - don't fail if this times out)
    const geo = await getGeoLocation(ipAddress)

    // Build description
    const locationPart = geo.city && geo.country
      ? ` from ${geo.city}, ${geo.country}`
      : ''
    const description = `Signed in from ${browser} on ${os}${locationPart}`

    // Insert activity record using service role (bypasses RLS)
    // Note: user_activity is a new table not yet in generated types, so we use 'any'
    const { error } = await (supabaseAdmin as any)
      .from('user_activity')
      .insert({
        user_id: userId,
        action_type: 'login',
        description,
        ip_address: ipAddress !== 'unknown' ? ipAddress : null,
        user_agent: userAgent || null,
        device_type: deviceType,
        browser,
        os,
        location_city: geo.city,
        location_country: geo.country,
      })

    if (error) {
      console.error('Failed to log login activity:', error)
      // Don't fail the request - login logging is not critical
      return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in login activity API:', error)
    // Don't fail the request - login logging is not critical
    return NextResponse.json({ success: false, error: 'Internal error' })
  }
}
