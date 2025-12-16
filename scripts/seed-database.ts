/**
 * Database Seeding Script
 * Run with: npx tsx scripts/seed-database.ts
 * 
 * This script reads the seed SQL file and executes it against the Supabase database.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

console.log('🔗 Connecting to Supabase:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearExistingData() {
  console.log('\n🧹 Clearing existing sample data...')
  
  // Delete in correct order due to foreign key constraints
  const deleteQueries = [
    "DELETE FROM audit_events WHERE entity_id LIKE '%1111%' OR entity_id LIKE '%2222%' OR entity_id LIKE '%3333%' OR entity_id LIKE '%4444%' OR id LIKE 'aud-%'",
    "DELETE FROM approvals WHERE id LIKE 'apr-%'",
    "DELETE FROM invoices WHERE id LIKE 'inv-%'",
    "DELETE FROM draw_request_lines WHERE id LIKE 'line-%' OR id LIKE 'bud-%'",
    "DELETE FROM draw_requests WHERE id LIKE 'draw-%'",
    "DELETE FROM budgets WHERE id LIKE 'bud-%'",
    "DELETE FROM projects WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444')",
    "DELETE FROM builders WHERE id IN ('a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'a4444444-4444-4444-4444-444444444444')",
    "DELETE FROM lenders WHERE id IN ('e1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222')"
  ]
  
  for (const query of deleteQueries) {
    const { error } = await supabase.rpc('exec_sql', { query })
    if (error && !error.message.includes('does not exist')) {
      console.warn(`  Warning: ${error.message}`)
    }
  }
  
  console.log('✅ Cleared existing data')
}

async function executeSeedSQL() {
  // Read the seed SQL file
  const seedPath = path.join(__dirname, '..', 'supabase', '002_seed.sql')
  console.log('\n📄 Reading seed file:', seedPath)
  
  const seedSQL = fs.readFileSync(seedPath, 'utf-8')
  
  // Split SQL into individual statements (split on semicolons not inside strings)
  const statements = seedSQL
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/g)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`\n📊 Found ${statements.length} SQL statements to execute`)
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    // Skip comments-only statements
    if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue
    }
    
    // Extract table name for logging
    const tableMatch = statement.match(/INSERT INTO\s+(\w+)/i)
    const tableName = tableMatch ? tableMatch[1] : 'unknown'
    
    process.stdout.write(`  [${i + 1}/${statements.length}] Inserting into ${tableName}... `)
    
    try {
      // Use rpc to execute raw SQL if available, otherwise fall back to direct insert
      const { error } = await supabase.rpc('exec_sql', { query: statement + ';' })
      
      if (error) {
        throw error
      }
      
      console.log('✅')
      successCount++
    } catch (error: any) {
      // If exec_sql doesn't exist, we need a different approach
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        console.log('⚠️ exec_sql not available')
        console.log('\n⚠️ The database does not have the exec_sql function.')
        console.log('Please run the seed SQL directly in the Supabase SQL Editor.')
        process.exit(1)
      } else {
        console.log(`❌ ${error.message || error}`)
        errorCount++
      }
    }
  }
  
  console.log(`\n📈 Results: ${successCount} successful, ${errorCount} errors`)
}

async function seedWithInserts() {
  console.log('\n🌱 Seeding database with direct inserts...')
  
  // Builders
  console.log('\n📦 Inserting Builders...')
  const { error: buildersError } = await supabase.from('builders').upsert([
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      company_name: 'Summit Custom Homes',
      borrower_name: 'Michael Johnson',
      email: 'mike@summitcustom.com',
      phone: '512-555-0101',
      address_street: '4521 Builder Way',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78701',
      bank_name: 'Texas Capital Bank',
      bank_routing_number: '111000614',
      bank_account_number: '1234567890',
      bank_account_name: 'Summit Custom Homes LLC',
      notes: 'Premium custom home builder. 15+ years experience.'
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      company_name: 'Waterfront Builders LLC',
      borrower_name: 'Sarah Chen',
      email: 'sarah@waterfrontbuilders.com',
      phone: '512-555-0202',
      address_street: '890 Lake Shore Dr',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78702',
      bank_name: 'Frost Bank',
      bank_routing_number: '114000093',
      bank_account_number: '9876543210',
      bank_account_name: 'Waterfront Builders LLC',
      notes: 'Specializes in lakefront and waterfront properties.'
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      company_name: 'Urban Renewal Construction',
      borrower_name: 'David Martinez',
      email: 'david@urbanrenewal.com',
      phone: '512-555-0303',
      address_street: '1200 Downtown Blvd',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78703',
      bank_name: 'Chase Bank',
      bank_routing_number: '111000614',
      bank_account_number: '5555666677',
      bank_account_name: 'Urban Renewal Construction Inc',
      notes: 'Renovation and restoration specialist.'
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      company_name: 'Hill Country Estates',
      borrower_name: 'Jennifer Williams',
      email: 'jen@hillcountryestates.com',
      phone: '512-555-0404',
      address_street: '2500 Rolling Hills Rd',
      address_city: 'Dripping Springs',
      address_state: 'TX',
      address_zip: '78620',
      bank_name: 'BBVA',
      bank_routing_number: '113010547',
      bank_account_number: '4444555566',
      bank_account_name: 'Hill Country Estates LLC',
      notes: 'New builder - first project with TD3.'
    }
  ], { onConflict: 'id' })
  
  if (buildersError) {
    console.error('❌ Error inserting builders:', buildersError.message)
  } else {
    console.log('✅ Builders inserted')
  }

  // Lenders
  console.log('\n📦 Inserting Lenders...')
  const { error: lendersError } = await supabase.from('lenders').upsert([
    { id: 'e1111111-1111-1111-1111-111111111111', name: 'Texas Hard Money', code: 'THM', is_active: true },
    { id: 'e2222222-2222-2222-2222-222222222222', name: 'Austin Capital Partners', code: 'ACP', is_active: true }
  ], { onConflict: 'id' })
  
  if (lendersError) {
    console.error('❌ Error inserting lenders:', lendersError.message)
  } else {
    console.log('✅ Lenders inserted')
  }

  // Projects
  console.log('\n📦 Inserting Projects...')
  const { error: projectsError } = await supabase.from('projects').upsert([
    // Pending project
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Hill Country Estate Lot 12',
      project_code: 'HCE-2024-012',
      address: '2512 Sunset Canyon Dr, Dripping Springs, TX 78620',
      builder_id: 'a4444444-4444-4444-4444-444444444444',
      lender_id: 'e1111111-1111-1111-1111-111111111111',
      borrower_name: 'Hill Country Estates LLC',
      loan_amount: 725000.00,
      interest_rate_annual: 0.11,
      origination_fee_pct: 0.02,
      loan_term_months: 12,
      lifecycle_stage: 'pending',
      loan_docs_recorded: false,
      subdivision_name: 'Sunset Canyon Estates',
      subdivision_abbrev: 'SCE',
      lot_number: '12',
      appraised_value: 850000.00,
      sales_price: 925000.00,
      square_footage: 3200
    },
    // Active project 1 - Oak Ridge
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Oak Ridge Custom Home',
      project_code: 'ORK-2024-001',
      address: '1234 Oak Ridge Drive, Austin, TX 78701',
      builder_id: 'a1111111-1111-1111-1111-111111111111',
      lender_id: 'e1111111-1111-1111-1111-111111111111',
      borrower_name: 'Johnson Family Trust',
      loan_amount: 850000.00,
      interest_rate_annual: 0.11,
      origination_fee_pct: 0.02,
      loan_start_date: '2024-07-15',
      loan_term_months: 12,
      maturity_date: '2025-07-15',
      lifecycle_stage: 'active',
      loan_docs_recorded: true,
      loan_docs_recorded_at: '2024-07-15T14:00:00+00:00',
      subdivision_name: 'Oak Ridge Estates',
      subdivision_abbrev: 'ORE',
      lot_number: '47',
      appraised_value: 975000.00,
      sales_price: 1050000.00,
      square_footage: 4200
    },
    // Active project 2 - Riverside
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Riverside Spec Home',
      project_code: 'RVS-2024-002',
      address: '567 River View Lane, Austin, TX 78702',
      builder_id: 'a2222222-2222-2222-2222-222222222222',
      lender_id: 'e2222222-2222-2222-2222-222222222222',
      borrower_name: 'Waterfront Builders LLC',
      loan_amount: 620000.00,
      interest_rate_annual: 0.115,
      origination_fee_pct: 0.02,
      loan_start_date: '2024-04-01',
      loan_term_months: 10,
      maturity_date: '2025-02-01',
      lifecycle_stage: 'active',
      loan_docs_recorded: true,
      loan_docs_recorded_at: '2024-04-01T10:00:00+00:00',
      subdivision_name: 'Riverside Terrace',
      subdivision_abbrev: 'RVT',
      lot_number: '23',
      appraised_value: 725000.00,
      sales_price: 795000.00,
      square_footage: 2800
    },
    // Historic project
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Sunset Heights Renovation',
      project_code: 'SNS-2024-015',
      address: '890 Sunset Blvd, Austin, TX 78703',
      builder_id: 'a3333333-3333-3333-3333-333333333333',
      lender_id: 'e1111111-1111-1111-1111-111111111111',
      borrower_name: 'Urban Renewal Construction',
      loan_amount: 320000.00,
      interest_rate_annual: 0.11,
      origination_fee_pct: 0.02,
      loan_start_date: '2024-02-01',
      loan_term_months: 12,
      maturity_date: '2025-02-01',
      lifecycle_stage: 'historic',
      loan_docs_recorded: true,
      loan_docs_recorded_at: '2024-02-01T10:00:00+00:00',
      subdivision_name: 'Sunset Heights',
      subdivision_abbrev: 'SNH',
      lot_number: '8',
      appraised_value: 385000.00,
      sales_price: 420000.00,
      square_footage: 1850,
      payoff_date: '2024-10-15',
      payoff_amount: 342847.50,
      payoff_approved: true,
      payoff_approved_at: '2024-10-15T14:00:00+00:00'
    }
  ], { onConflict: 'id' })
  
  if (projectsError) {
    console.error('❌ Error inserting projects:', projectsError.message)
  } else {
    console.log('✅ Projects inserted')
  }

  console.log('\n✅ Core entities seeded! For complete seed data including budgets, draws, and lines,')
  console.log('   please run the full SQL from supabase/002_seed.sql in the SQL Editor.')
}

async function main() {
  console.log('🚀 TD3 Database Seeder')
  console.log('========================')
  
  try {
    // Try using direct inserts (works with anon key)
    await seedWithInserts()
    
    console.log('\n✅ Database seeding completed!')
    console.log('\n📝 Note: For complete data (budgets, draws, invoices, etc.),')
    console.log('   run the full SQL file in Supabase SQL Editor:')
    console.log('   1. Go to https://supabase.com/dashboard/project/[your-project]/sql')
    console.log('   2. Copy contents of supabase/002_seed.sql')
    console.log('   3. Paste and click "Run"')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()

