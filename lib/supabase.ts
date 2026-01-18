import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Legacy client export for backward compatibility
// This client doesn't persist sessions properly for auth flows
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Browser client for auth - use this for login/logout and session management
// This client properly handles cookies and session persistence
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Auth helper types
export type AuthUser = {
  id: string
  email: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_active: boolean
  first_login_completed: boolean
  created_at: string
  updated_at: string
}

export type Permission = 'processor' | 'fund_draws' | 'approve_payoffs' | 'users.manage'

export const PERMISSION_LABELS: Record<Permission, string> = {
  'processor': 'Loan Processor',
  'fund_draws': 'Fund Draws',
  'approve_payoffs': 'Approve Payoffs',
  'users.manage': 'Manage Users'
}

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'processor': 'Can perform origination and draw processing work',
  'fund_draws': 'Can record draws as FUNDED and set funding confirmation date',
  'approve_payoffs': 'Can approve payoffs before sending to title company',
  'users.manage': 'Admin panel access for user management'
}
