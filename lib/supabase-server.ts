import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Server-side Supabase client with service role key
// This bypasses RLS and should ONLY be used in server-side code (API routes)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

