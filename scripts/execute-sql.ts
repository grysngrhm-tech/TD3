/**
 * Execute SQL via Supabase REST API
 * Usage: npx tsx scripts/execute-sql.ts [flags]
 * 
 * Flags:
 *   --clear-only      Only clear data, don't insert
 *   --append          Only insert NEW builders/projects (skip clearing, skip existing data)
 *   --add-lines       Only add draw lines and wire batches (for fixing partial data)
 *   --repair-lines    Find draws with missing lines and add them (fixes orphaned draws)
 *   --repair-budgets  Find projects with missing budgets and add them
 *   --repair-all      Run all repairs: budgets first, then draw lines
 *   --clean-orphans   Delete draws referencing projects without budgets
 *   --backfill-draws  Add funded draws to lowest-utilized active loans (brings to 85%)
 *   --backfill-light  Add funded draws to bring 5 loans to 25-50% utilization
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// UUID generator helper - creates deterministic UUIDs from readable names
function generateUUID(base: string, index: number = 0): string {
  // Create a consistent UUID v4 format
  const hash = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
  
  const key = `${base}-${index}`
  const h1 = hash(key + '1').substring(0, 8)
  const h2 = hash(key + '2').substring(0, 4)
  const h3 = hash(key + '3').substring(0, 4)
  const h4 = hash(key + '4').substring(0, 4)
  const h5 = hash(key + '5').padEnd(12, '0').substring(0, 12)
  
  return `${h1}-${h2}-4${h3.substring(1)}-a${h4.substring(1)}-${h5}`
}

// Pre-generated UUIDs for consistency
const LENDER_TD2_ID = 'a1b2c3d4-e5f6-4a1b-8c9d-111111111111'
const LENDER_TENNBROOK_ID = 'b2c3d4e5-f6a1-4b2c-9d8e-222222222222'

const BUILDER_RIDGELINE_ID = 'c3d4e5f6-a1b2-4c3d-ae9f-333333333333'
const BUILDER_WESTBROOK_ID = 'd4e5f6a1-b2c3-4d4e-bf0a-444444444444'
const BUILDER_HORIZON_ID = 'e5f6a1b2-c3d4-4e5f-c01b-555555555555'
// New builders
const BUILDER_MCD_ID = 'f1a2b3c4-d5e6-4f7a-8c9d-777777777701'
const BUILDER_CURTIS_ID = 'f1a2b3c4-d5e6-4f7a-8c9d-777777777702'

// Project IDs - Original 12 projects
const PROJECT_IDS: Record<string, string> = {
  'DW-101': 'f6a1b2c3-d4e5-4f6a-d12c-666666666601',
  'DW-103': 'f6a1b2c3-d4e5-4f6a-d12c-666666666603',
  'OR-201': 'f6a1b2c3-d4e5-4f6a-d12c-666666666621',
  'DW-102': 'f6a1b2c3-d4e5-4f6a-d12c-666666666602',
  'OR-202': 'f6a1b2c3-d4e5-4f6a-d12c-666666666622',
  'CV-301': 'f6a1b2c3-d4e5-4f6a-d12c-666666666631',
  'DW-104': 'f6a1b2c3-d4e5-4f6a-d12c-666666666604',
  'OR-203': 'f6a1b2c3-d4e5-4f6a-d12c-666666666623',
  'CV-302': 'f6a1b2c3-d4e5-4f6a-d12c-666666666632',
  'DW-098': 'f6a1b2c3-d4e5-4f6a-d12c-666666666598',
  'OR-198': 'f6a1b2c3-d4e5-4f6a-d12c-666666666618',
  'CV-298': 'f6a1b2c3-d4e5-4f6a-d12c-666666666628',
  // MCD Homes projects (8 total)
  'DW-401': 'f6a1b2c3-d4e5-4f6a-d12c-888888888801', // DW TennBrook pending
  'DW-402': 'f6a1b2c3-d4e5-4f6a-d12c-888888888802', // DW TennBrook active
  'DW-403': 'f6a1b2c3-d4e5-4f6a-d12c-888888888803', // DW TD2 active
  'DW-404': 'f6a1b2c3-d4e5-4f6a-d12c-888888888804', // DW TD2 historic
  'TL-501': 'f6a1b2c3-d4e5-4f6a-d12c-888888888811', // TL TD2 pending
  'TL-502': 'f6a1b2c3-d4e5-4f6a-d12c-888888888812', // TL TD2 active
  'TL-503': 'f6a1b2c3-d4e5-4f6a-d12c-888888888813', // TL TD2 active
  'TL-504': 'f6a1b2c3-d4e5-4f6a-d12c-888888888814', // TL TD2 historic
  // Curtis Homes projects (8 total)
  'DW-405': 'f6a1b2c3-d4e5-4f6a-d12c-999999999901', // DW TennBrook pending
  'DW-406': 'f6a1b2c3-d4e5-4f6a-d12c-999999999902', // DW TennBrook active
  'DW-407': 'f6a1b2c3-d4e5-4f6a-d12c-999999999903', // DW TD2 active
  'DW-408': 'f6a1b2c3-d4e5-4f6a-d12c-999999999904', // DW TD2 historic
  'TL-505': 'f6a1b2c3-d4e5-4f6a-d12c-999999999911', // TL TD2 pending
  'TL-506': 'f6a1b2c3-d4e5-4f6a-d12c-999999999912', // TL TD2 active
  'TL-507': 'f6a1b2c3-d4e5-4f6a-d12c-999999999913', // TL TD2 active
  'TL-508': 'f6a1b2c3-d4e5-4f6a-d12c-999999999914', // TL TD2 historic
  // Additional projects for existing builders (6 total)
  'DW-105': 'f6a1b2c3-d4e5-4f6a-d12c-666666666605', // Ridgeline active
  'CV-303': 'f6a1b2c3-d4e5-4f6a-d12c-666666666633', // Ridgeline pending
  'OR-204': 'f6a1b2c3-d4e5-4f6a-d12c-666666666624', // Westbrook active
  'DW-106': 'f6a1b2c3-d4e5-4f6a-d12c-666666666606', // Westbrook pending
  'CV-304': 'f6a1b2c3-d4e5-4f6a-d12c-666666666634', // Horizon active
  'OR-205': 'f6a1b2c3-d4e5-4f6a-d12c-666666666625'  // Horizon historic
}

// Tables to clear in FK-safe order
const tablesToClear = [
  'audit_events',
  'wire_batches',
  'approvals',
  'invoices',
  'draw_request_lines',
  'draw_requests',
  'budgets',
  'documents',
  'projects',
  'builders'
]

async function clearAllData() {
  console.log('\n🗑️  Clearing old data (FK-safe order)...\n')
  
  for (const table of tablesToClear) {
    console.log(`   Deleting from ${table}...`)
    
    try {
      // First try to get count
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      
      if (count === 0) {
        console.log(`   ✅ ${table} already empty`)
        continue
      }
      
      // Delete using NOT NULL on id (all rows have non-null ids)
      const { error } = await supabase.from(table).delete().not('id', 'is', null)
      
      if (error) {
        console.error(`   ❌ Failed to clear ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ ${table} cleared (${count} rows)`)
      }
    } catch (err: any) {
      console.error(`   ❌ Error clearing ${table}: ${err.message}`)
    }
  }
}

async function insertLenders() {
  console.log('\n📊 Finding/creating lenders...')
  
  // Check if TD2 exists and get its ID
  const { data: td2Existing } = await supabase.from('lenders').select('id').eq('code', 'TD2').single()
  if (td2Existing) {
    // Update our constant to use existing ID
    (global as any).LENDER_TD2_ID_ACTUAL = td2Existing.id
    console.log(`   ✅ TD2 exists (${td2Existing.id})`)
  } else {
    const { error } = await supabase.from('lenders').insert({ id: LENDER_TD2_ID, name: 'TD2', code: 'TD2', is_active: true })
    if (error) {
      console.error(`   ❌ Failed to insert TD2: ${error.message}`)
    } else {
      (global as any).LENDER_TD2_ID_ACTUAL = LENDER_TD2_ID
      console.log(`   ✅ TD2 created`)
    }
  }
  
  // Check if TennBrook exists
  const { data: tennbrookExisting } = await supabase.from('lenders').select('id').eq('code', 'TENNBROOK').single()
  if (tennbrookExisting) {
    (global as any).LENDER_TENNBROOK_ID_ACTUAL = tennbrookExisting.id
    console.log(`   ✅ TennBrook exists (${tennbrookExisting.id})`)
  } else {
    // Try alternate code
    const { data: tenbrookAlt } = await supabase.from('lenders').select('id').eq('code', 'TENBROOK').single()
    if (tenbrookAlt) {
      (global as any).LENDER_TENNBROOK_ID_ACTUAL = tenbrookAlt.id
      console.log(`   ✅ TenBrook exists (${tenbrookAlt.id})`)
    } else {
      const { error } = await supabase.from('lenders').insert({ id: LENDER_TENNBROOK_ID, name: 'TennBrook', code: 'TENNBROOK', is_active: true })
      if (error) {
        console.error(`   ❌ Failed to insert TennBrook: ${error.message}`)
      } else {
        (global as any).LENDER_TENNBROOK_ID_ACTUAL = LENDER_TENNBROOK_ID
        console.log(`   ✅ TennBrook created`)
      }
    }
  }
}

// Helper to get actual lender IDs (after insertLenders runs)
function getLenderTD2Id() { return (global as any).LENDER_TD2_ID_ACTUAL || LENDER_TD2_ID }
function getLenderTennbrookId() { return (global as any).LENDER_TENNBROOK_ID_ACTUAL || LENDER_TENNBROOK_ID }

async function insertBuilders() {
  console.log('\n📊 Inserting builders...')
  
  const builders = [
    {
      id: BUILDER_RIDGELINE_ID,
      company_name: 'Ridgeline Custom Homes',
      borrower_name: 'Marcus Ridgeline',
      email: 'marcus@ridgelinecustom.com',
      phone: '512-555-0101',
      address_street: '4521 Summit View Dr',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78730',
      bank_name: 'Texas Capital Bank',
      bank_routing_number: '111000614',
      bank_account_number: '7891234560',
      bank_account_name: 'Ridgeline Custom Homes LLC',
      notes: 'Premium custom home builder. 18 years experience.'
    },
    {
      id: BUILDER_WESTBROOK_ID,
      company_name: 'Westbrook Construction',
      borrower_name: 'Sarah Westbrook',
      email: 'sarah@westbrookconstruction.com',
      phone: '512-555-0202',
      address_street: '890 Commerce Park Blvd',
      address_city: 'Round Rock',
      address_state: 'TX',
      address_zip: '78664',
      bank_name: 'Frost Bank',
      bank_routing_number: '114000093',
      bank_account_number: '4567891230',
      bank_account_name: 'Westbrook Construction Inc',
      notes: 'Spec home builder focusing on entry-level and move-up market.'
    },
    {
      id: BUILDER_HORIZON_ID,
      company_name: 'Horizon Builders LLC',
      borrower_name: 'David Horizon',
      email: 'david@horizonbuilders.com',
      phone: '512-555-0303',
      address_street: '2100 Innovation Way',
      address_city: 'Cedar Park',
      address_state: 'TX',
      address_zip: '78613',
      bank_name: 'Chase Bank',
      bank_routing_number: '111000614',
      bank_account_number: '1234567890',
      bank_account_name: 'Horizon Builders LLC Operating',
      notes: 'Growing builder with diverse portfolio.'
    },
    {
      id: BUILDER_MCD_ID,
      company_name: 'MCD Homes',
      borrower_name: 'Michael C. Davis',
      email: 'mike@mcdhomes.com',
      phone: '512-555-0404',
      address_street: '3200 Research Blvd',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78759',
      bank_name: 'Wells Fargo',
      bank_routing_number: '121042882',
      bank_account_number: '3456789012',
      bank_account_name: 'MCD Homes LLC',
      notes: 'Established builder specializing in energy-efficient homes.'
    },
    {
      id: BUILDER_CURTIS_ID,
      company_name: 'Curtis Homes',
      borrower_name: 'Amanda Curtis',
      email: 'amanda@curtishomes.com',
      phone: '512-555-0505',
      address_street: '1500 S Congress Ave',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78704',
      bank_name: 'Bank of America',
      bank_routing_number: '111000025',
      bank_account_number: '5678901234',
      bank_account_name: 'Curtis Homes Inc',
      notes: 'Family-owned builder with 25 years experience in Central Texas.'
    }
  ]
  
  const { error } = await supabase.from('builders').insert(builders)
  if (error) {
    console.error(`   ❌ Failed to insert builders: ${error.message}`)
  } else {
    console.log(`   ✅ ${builders.length} builders inserted`)
  }
}

// Full sample data - Projects
const projectsData = [
  // PENDING PROJECTS (3)
  {
    id: PROJECT_IDS['DW-101'],
    name: 'Discovery West Lot 101',
    project_code: 'DW-101',
    address: '101 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_RIDGELINE_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Ridgeline Custom Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '101',
    loan_amount: 725000.00,
    appraised_value: 875000.00,
    sales_price: 925000.00,
    square_footage: 3400,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-01T10:00:00Z'
  },
  {
    id: PROJECT_IDS['DW-103'],
    name: 'Discovery West Lot 103',
    project_code: 'DW-103',
    address: '103 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_WESTBROOK_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'Westbrook Construction Inc',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '103',
    loan_amount: 685000.00,
    appraised_value: 825000.00,
    sales_price: 875000.00,
    square_footage: 3200,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-05T14:30:00Z'
  },
  {
    id: PROJECT_IDS['OR-201'],
    name: 'Oak Ridge Lot 201',
    project_code: 'OR-201',
    address: '201 Oak Ridge Blvd, Cedar Park, TX 78613',
    builder_id: BUILDER_HORIZON_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Horizon Builders LLC',
    subdivision_name: 'Oak Ridge',
    subdivision_abbrev: 'OR',
    lot_number: '201',
    loan_amount: 595000.00,
    appraised_value: 725000.00,
    sales_price: 775000.00,
    square_footage: 2800,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-10T09:15:00Z'
  },
  // ACTIVE PROJECTS (6)
  {
    id: PROJECT_IDS['DW-102'],
    name: 'Discovery West Lot 102',
    project_code: 'DW-102',
    address: '102 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_RIDGELINE_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'Ridgeline Custom Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '102',
    loan_amount: 750000.00,
    appraised_value: 925000.00,
    sales_price: 975000.00,
    square_footage: 3600,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-06-15T10:00:00Z',
    loan_start_date: '2025-06-15',
    status: 'active',
    created_at: '2025-06-01T10:00:00Z'
  },
  {
    id: PROJECT_IDS['OR-202'],
    name: 'Oak Ridge Lot 202',
    project_code: 'OR-202',
    address: '202 Oak Ridge Blvd, Cedar Park, TX 78613',
    builder_id: BUILDER_WESTBROOK_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Westbrook Construction Inc',
    subdivision_name: 'Oak Ridge',
    subdivision_abbrev: 'OR',
    lot_number: '202',
    loan_amount: 625000.00,
    appraised_value: 775000.00,
    sales_price: 825000.00,
    square_footage: 3000,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-07-01T10:00:00Z',
    loan_start_date: '2025-07-01',
    status: 'active',
    created_at: '2025-06-15T10:00:00Z'
  },
  {
    id: PROJECT_IDS['CV-301'],
    name: 'Cedar Valley Lot 301',
    project_code: 'CV-301',
    address: '301 Cedar Valley Dr, Leander, TX 78641',
    builder_id: BUILDER_HORIZON_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Horizon Builders LLC',
    subdivision_name: 'Cedar Valley',
    subdivision_abbrev: 'CV',
    lot_number: '301',
    loan_amount: 550000.00,
    appraised_value: 675000.00,
    sales_price: 725000.00,
    square_footage: 2600,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-08-01T10:00:00Z',
    loan_start_date: '2025-08-01',
    status: 'active',
    created_at: '2025-07-15T10:00:00Z'
  },
  {
    id: PROJECT_IDS['DW-104'],
    name: 'Discovery West Lot 104',
    project_code: 'DW-104',
    address: '104 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_RIDGELINE_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Ridgeline Custom Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '104',
    loan_amount: 695000.00,
    appraised_value: 850000.00,
    sales_price: 895000.00,
    square_footage: 3300,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-09-01T10:00:00Z',
    loan_start_date: '2025-09-01',
    status: 'active',
    created_at: '2025-08-15T10:00:00Z'
  },
  {
    id: PROJECT_IDS['OR-203'],
    name: 'Oak Ridge Lot 203',
    project_code: 'OR-203',
    address: '203 Oak Ridge Blvd, Cedar Park, TX 78613',
    builder_id: BUILDER_WESTBROOK_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Westbrook Construction Inc',
    subdivision_name: 'Oak Ridge',
    subdivision_abbrev: 'OR',
    lot_number: '203',
    loan_amount: 575000.00,
    appraised_value: 700000.00,
    sales_price: 750000.00,
    square_footage: 2750,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-10-01T10:00:00Z',
    loan_start_date: '2025-10-01',
    status: 'active',
    created_at: '2025-09-15T10:00:00Z'
  },
  {
    id: PROJECT_IDS['CV-302'],
    name: 'Cedar Valley Lot 302',
    project_code: 'CV-302',
    address: '302 Cedar Valley Dr, Leander, TX 78641',
    builder_id: BUILDER_HORIZON_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Horizon Builders LLC',
    subdivision_name: 'Cedar Valley',
    subdivision_abbrev: 'CV',
    lot_number: '302',
    loan_amount: 525000.00,
    appraised_value: 650000.00,
    sales_price: 695000.00,
    square_footage: 2500,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-11-01T10:00:00Z',
    loan_start_date: '2025-11-01',
    status: 'active',
    created_at: '2025-10-15T10:00:00Z'
  },
  // HISTORIC PROJECTS (3)
  {
    id: PROJECT_IDS['DW-098'],
    name: 'Discovery West Lot 98',
    project_code: 'DW-098',
    address: '98 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_RIDGELINE_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Ridgeline Custom Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '98',
    loan_amount: 680000.00,
    appraised_value: 825000.00,
    sales_price: 875000.00,
    square_footage: 3200,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2024-12-01T10:00:00Z',
    loan_start_date: '2024-12-01',
    status: 'closed',
    created_at: '2024-11-15T10:00:00Z'
  },
  {
    id: PROJECT_IDS['OR-198'],
    name: 'Oak Ridge Lot 198',
    project_code: 'OR-198',
    address: '198 Oak Ridge Blvd, Cedar Park, TX 78613',
    builder_id: BUILDER_WESTBROOK_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Westbrook Construction Inc',
    subdivision_name: 'Oak Ridge',
    subdivision_abbrev: 'OR',
    lot_number: '198',
    loan_amount: 595000.00,
    appraised_value: 725000.00,
    sales_price: 775000.00,
    square_footage: 2850,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-01-15T10:00:00Z',
    loan_start_date: '2025-01-15',
    status: 'closed',
    created_at: '2025-01-01T10:00:00Z'
  },
  {
    id: PROJECT_IDS['CV-298'],
    name: 'Cedar Valley Lot 298',
    project_code: 'CV-298',
    address: '298 Cedar Valley Dr, Leander, TX 78641',
    builder_id: BUILDER_HORIZON_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Horizon Builders LLC',
    subdivision_name: 'Cedar Valley',
    subdivision_abbrev: 'CV',
    lot_number: '298',
    loan_amount: 510000.00,
    appraised_value: 625000.00,
    sales_price: 675000.00,
    square_footage: 2450,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-02-01T10:00:00Z',
    loan_start_date: '2025-02-01',
    status: 'closed',
    created_at: '2025-01-15T10:00:00Z'
  },
  
  // ============================================
  // MCD HOMES PROJECTS (8 total)
  // ============================================
  
  // MCD - Discovery West TennBrook PENDING
  {
    id: PROJECT_IDS['DW-401'],
    name: 'Discovery West Lot 401',
    project_code: 'DW-401',
    address: '401 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '401',
    loan_amount: 695000.00,
    appraised_value: 850000.00,
    sales_price: 895000.00,
    square_footage: 3250,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-08T09:00:00Z'
  },
  // MCD - Discovery West TennBrook ACTIVE
  {
    id: PROJECT_IDS['DW-402'],
    name: 'Discovery West Lot 402',
    project_code: 'DW-402',
    address: '402 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '402',
    loan_amount: 725000.00,
    appraised_value: 875000.00,
    sales_price: 925000.00,
    square_footage: 3400,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-07-15T10:00:00Z',
    loan_start_date: '2025-07-15',
    status: 'active',
    created_at: '2025-07-01T10:00:00Z'
  },
  // MCD - Discovery West TD2 ACTIVE
  {
    id: PROJECT_IDS['DW-403'],
    name: 'Discovery West Lot 403',
    project_code: 'DW-403',
    address: '403 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '403',
    loan_amount: 665000.00,
    appraised_value: 815000.00,
    sales_price: 865000.00,
    square_footage: 3100,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-09-01T10:00:00Z',
    loan_start_date: '2025-09-01',
    status: 'active',
    created_at: '2025-08-15T10:00:00Z'
  },
  // MCD - Discovery West TD2 HISTORIC
  {
    id: PROJECT_IDS['DW-404'],
    name: 'Discovery West Lot 404',
    project_code: 'DW-404',
    address: '404 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '404',
    loan_amount: 640000.00,
    appraised_value: 785000.00,
    sales_price: 835000.00,
    square_footage: 3000,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-01-01T10:00:00Z',
    loan_start_date: '2025-01-01',
    status: 'closed',
    created_at: '2024-12-15T10:00:00Z'
  },
  // MCD - Talline TD2 PENDING
  {
    id: PROJECT_IDS['TL-501'],
    name: 'Talline Lot 501',
    project_code: 'TL-501',
    address: '501 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '501',
    loan_amount: 580000.00,
    appraised_value: 710000.00,
    sales_price: 760000.00,
    square_footage: 2750,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-12T14:00:00Z'
  },
  // MCD - Talline TD2 ACTIVE (early stage)
  {
    id: PROJECT_IDS['TL-502'],
    name: 'Talline Lot 502',
    project_code: 'TL-502',
    address: '502 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '502',
    loan_amount: 545000.00,
    appraised_value: 665000.00,
    sales_price: 715000.00,
    square_footage: 2600,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-10-01T10:00:00Z',
    loan_start_date: '2025-10-01',
    status: 'active',
    created_at: '2025-09-15T10:00:00Z'
  },
  // MCD - Talline TD2 ACTIVE (mid stage)
  {
    id: PROJECT_IDS['TL-503'],
    name: 'Talline Lot 503',
    project_code: 'TL-503',
    address: '503 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '503',
    loan_amount: 615000.00,
    appraised_value: 750000.00,
    sales_price: 800000.00,
    square_footage: 2900,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-08-01T10:00:00Z',
    loan_start_date: '2025-08-01',
    status: 'active',
    created_at: '2025-07-15T10:00:00Z'
  },
  // MCD - Talline TD2 HISTORIC
  {
    id: PROJECT_IDS['TL-504'],
    name: 'Talline Lot 504',
    project_code: 'TL-504',
    address: '504 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_MCD_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'MCD Homes LLC',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '504',
    loan_amount: 525000.00,
    appraised_value: 640000.00,
    sales_price: 690000.00,
    square_footage: 2500,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-03-01T10:00:00Z',
    loan_start_date: '2025-03-01',
    status: 'closed',
    created_at: '2025-02-15T10:00:00Z'
  },

  // ============================================
  // CURTIS HOMES PROJECTS (8 total)
  // ============================================
  
  // Curtis - Discovery West TennBrook PENDING
  {
    id: PROJECT_IDS['DW-405'],
    name: 'Discovery West Lot 405',
    project_code: 'DW-405',
    address: '405 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '405',
    loan_amount: 710000.00,
    appraised_value: 865000.00,
    sales_price: 915000.00,
    square_footage: 3350,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-05T11:00:00Z'
  },
  // Curtis - Discovery West TennBrook ACTIVE
  {
    id: PROJECT_IDS['DW-406'],
    name: 'Discovery West Lot 406',
    project_code: 'DW-406',
    address: '406 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '406',
    loan_amount: 685000.00,
    appraised_value: 835000.00,
    sales_price: 885000.00,
    square_footage: 3200,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-08-15T10:00:00Z',
    loan_start_date: '2025-08-15',
    status: 'active',
    created_at: '2025-08-01T10:00:00Z'
  },
  // Curtis - Discovery West TD2 ACTIVE
  {
    id: PROJECT_IDS['DW-407'],
    name: 'Discovery West Lot 407',
    project_code: 'DW-407',
    address: '407 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '407',
    loan_amount: 655000.00,
    appraised_value: 800000.00,
    sales_price: 850000.00,
    square_footage: 3050,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-10-15T10:00:00Z',
    loan_start_date: '2025-10-15',
    status: 'active',
    created_at: '2025-10-01T10:00:00Z'
  },
  // Curtis - Discovery West TD2 HISTORIC
  {
    id: PROJECT_IDS['DW-408'],
    name: 'Discovery West Lot 408',
    project_code: 'DW-408',
    address: '408 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '408',
    loan_amount: 620000.00,
    appraised_value: 760000.00,
    sales_price: 810000.00,
    square_footage: 2950,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-02-15T10:00:00Z',
    loan_start_date: '2025-02-15',
    status: 'closed',
    created_at: '2025-02-01T10:00:00Z'
  },
  // Curtis - Talline TD2 PENDING
  {
    id: PROJECT_IDS['TL-505'],
    name: 'Talline Lot 505',
    project_code: 'TL-505',
    address: '505 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '505',
    loan_amount: 565000.00,
    appraised_value: 690000.00,
    sales_price: 740000.00,
    square_footage: 2700,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-10T08:30:00Z'
  },
  // Curtis - Talline TD2 ACTIVE (early)
  {
    id: PROJECT_IDS['TL-506'],
    name: 'Talline Lot 506',
    project_code: 'TL-506',
    address: '506 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '506',
    loan_amount: 535000.00,
    appraised_value: 655000.00,
    sales_price: 705000.00,
    square_footage: 2550,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-11-01T10:00:00Z',
    loan_start_date: '2025-11-01',
    status: 'active',
    created_at: '2025-10-15T10:00:00Z'
  },
  // Curtis - Talline TD2 ACTIVE (mid)
  {
    id: PROJECT_IDS['TL-507'],
    name: 'Talline Lot 507',
    project_code: 'TL-507',
    address: '507 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '507',
    loan_amount: 590000.00,
    appraised_value: 720000.00,
    sales_price: 770000.00,
    square_footage: 2800,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-09-01T10:00:00Z',
    loan_start_date: '2025-09-01',
    status: 'active',
    created_at: '2025-08-15T10:00:00Z'
  },
  // Curtis - Talline TD2 HISTORIC
  {
    id: PROJECT_IDS['TL-508'],
    name: 'Talline Lot 508',
    project_code: 'TL-508',
    address: '508 Talline Way, Dripping Springs, TX 78620',
    builder_id: BUILDER_CURTIS_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Curtis Homes Inc',
    subdivision_name: 'Talline',
    subdivision_abbrev: 'TL',
    lot_number: '508',
    loan_amount: 505000.00,
    appraised_value: 620000.00,
    sales_price: 670000.00,
    square_footage: 2400,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-04-01T10:00:00Z',
    loan_start_date: '2025-04-01',
    status: 'closed',
    created_at: '2025-03-15T10:00:00Z'
  },

  // ============================================
  // ADDITIONAL PROJECTS FOR EXISTING BUILDERS (6 total)
  // ============================================
  
  // Ridgeline - Discovery West TD2 ACTIVE
  {
    id: PROJECT_IDS['DW-105'],
    name: 'Discovery West Lot 105',
    project_code: 'DW-105',
    address: '105 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_RIDGELINE_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Ridgeline Custom Homes LLC',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '105',
    loan_amount: 735000.00,
    appraised_value: 895000.00,
    sales_price: 945000.00,
    square_footage: 3450,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-09-15T10:00:00Z',
    loan_start_date: '2025-09-15',
    status: 'active',
    created_at: '2025-09-01T10:00:00Z'
  },
  // Ridgeline - Cedar Valley TD2 PENDING
  {
    id: PROJECT_IDS['CV-303'],
    name: 'Cedar Valley Lot 303',
    project_code: 'CV-303',
    address: '303 Cedar Valley Dr, Leander, TX 78641',
    builder_id: BUILDER_RIDGELINE_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Ridgeline Custom Homes LLC',
    subdivision_name: 'Cedar Valley',
    subdivision_abbrev: 'CV',
    lot_number: '303',
    loan_amount: 560000.00,
    appraised_value: 685000.00,
    sales_price: 735000.00,
    square_footage: 2650,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-14T10:30:00Z'
  },
  // Westbrook - Oak Ridge TD2 ACTIVE
  {
    id: PROJECT_IDS['OR-204'],
    name: 'Oak Ridge Lot 204',
    project_code: 'OR-204',
    address: '204 Oak Ridge Blvd, Cedar Park, TX 78613',
    builder_id: BUILDER_WESTBROOK_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Westbrook Construction Inc',
    subdivision_name: 'Oak Ridge',
    subdivision_abbrev: 'OR',
    lot_number: '204',
    loan_amount: 605000.00,
    appraised_value: 740000.00,
    sales_price: 790000.00,
    square_footage: 2875,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-10-01T10:00:00Z',
    loan_start_date: '2025-10-01',
    status: 'active',
    created_at: '2025-09-15T10:00:00Z'
  },
  // Westbrook - Discovery West TennBrook PENDING
  {
    id: PROJECT_IDS['DW-106'],
    name: 'Discovery West Lot 106',
    project_code: 'DW-106',
    address: '106 Discovery Trail, Dripping Springs, TX 78620',
    builder_id: BUILDER_WESTBROOK_ID,
    lender_id: LENDER_TENNBROOK_ID,
    borrower_name: 'Westbrook Construction Inc',
    subdivision_name: 'Discovery West',
    subdivision_abbrev: 'DW',
    lot_number: '106',
    loan_amount: 675000.00,
    appraised_value: 825000.00,
    sales_price: 875000.00,
    square_footage: 3175,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'pending',
    loan_docs_recorded: false,
    status: 'active',
    created_at: '2025-12-11T09:00:00Z'
  },
  // Horizon - Cedar Valley TD2 ACTIVE
  {
    id: PROJECT_IDS['CV-304'],
    name: 'Cedar Valley Lot 304',
    project_code: 'CV-304',
    address: '304 Cedar Valley Dr, Leander, TX 78641',
    builder_id: BUILDER_HORIZON_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Horizon Builders LLC',
    subdivision_name: 'Cedar Valley',
    subdivision_abbrev: 'CV',
    lot_number: '304',
    loan_amount: 540000.00,
    appraised_value: 660000.00,
    sales_price: 710000.00,
    square_footage: 2575,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'active',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-10-15T10:00:00Z',
    loan_start_date: '2025-10-15',
    status: 'active',
    created_at: '2025-10-01T10:00:00Z'
  },
  // Horizon - Oak Ridge TD2 HISTORIC
  {
    id: PROJECT_IDS['OR-205'],
    name: 'Oak Ridge Lot 205',
    project_code: 'OR-205',
    address: '205 Oak Ridge Blvd, Cedar Park, TX 78613',
    builder_id: BUILDER_HORIZON_ID,
    lender_id: LENDER_TD2_ID,
    borrower_name: 'Horizon Builders LLC',
    subdivision_name: 'Oak Ridge',
    subdivision_abbrev: 'OR',
    lot_number: '205',
    loan_amount: 485000.00,
    appraised_value: 595000.00,
    sales_price: 645000.00,
    square_footage: 2325,
    interest_rate_annual: 0.11,
    origination_fee_pct: 0.02,
    loan_term_months: 12,
    lifecycle_stage: 'historic',
    loan_docs_recorded: true,
    loan_docs_recorded_at: '2025-03-15T10:00:00Z',
    loan_start_date: '2025-03-15',
    status: 'closed',
    created_at: '2025-03-01T10:00:00Z'
  }
]

async function insertProjects() {
  console.log('\n📊 Inserting projects...')
  
  // Update lender IDs to use actual DB IDs
  const projectsToInsert = projectsData.map(p => {
    const project = { ...p }
    if (project.lender_id === LENDER_TD2_ID) {
      project.lender_id = getLenderTD2Id()
    } else if (project.lender_id === LENDER_TENNBROOK_ID) {
      project.lender_id = getLenderTennbrookId()
    }
    // Remove status field - let DB use default
    delete (project as any).status
    return project
  })
  
  const { error } = await supabase.from('projects').insert(projectsToInsert)
  if (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  } else {
    console.log(`   ✅ ${projectsToInsert.length} projects inserted`)
  }
}

// Budget template - 45 lines per project covering all major categories
function generateBudgetLines(projectId: string, loanAmount: number) {
  const baseMultiplier = loanAmount / 700000 // Scale based on loan amount
  
  return [
    // General Conditions (01xx) - ~5%
    { project_id: projectId, category: 'Project Management & Admin', nahb_category: 'General Conditions', nahb_subcategory: 'Project Management & Admin', cost_code: '0110', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Insurance & Permits', nahb_category: 'General Conditions', nahb_subcategory: 'Insurance & Permits', cost_code: '0120', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Temporary Utilities', nahb_category: 'General Conditions', nahb_subcategory: 'Temporary Utilities', cost_code: '0130', original_amount: Math.round(5000 * baseMultiplier), current_amount: Math.round(5000 * baseMultiplier), spent_amount: 0 },
    
    // Site Work (02xx) - ~8%
    { project_id: projectId, category: 'Site Clearing & Grading', nahb_category: 'Site Work', nahb_subcategory: 'Site Clearing & Grading', cost_code: '0210', original_amount: Math.round(18000 * baseMultiplier), current_amount: Math.round(18000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Excavation', nahb_category: 'Site Work', nahb_subcategory: 'Excavation', cost_code: '0220', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Fill & Backfill', nahb_category: 'Site Work', nahb_subcategory: 'Fill & Backfill', cost_code: '0230', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Drainage & Erosion Control', nahb_category: 'Site Work', nahb_subcategory: 'Drainage & Erosion Control', cost_code: '0240', original_amount: Math.round(6000 * baseMultiplier), current_amount: Math.round(6000 * baseMultiplier), spent_amount: 0 },
    
    // Concrete (03xx) - ~12%
    { project_id: projectId, category: 'Foundation', nahb_category: 'Concrete', nahb_subcategory: 'Foundation', cost_code: '0310', original_amount: Math.round(45000 * baseMultiplier), current_amount: Math.round(45000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Flatwork - Garage', nahb_category: 'Concrete', nahb_subcategory: 'Flatwork - Garage', cost_code: '0320', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Flatwork - Patio/Porch', nahb_category: 'Concrete', nahb_subcategory: 'Flatwork - Patio/Porch', cost_code: '0330', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Driveway', nahb_category: 'Concrete', nahb_subcategory: 'Driveway', cost_code: '0340', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    
    // Masonry (04xx) - ~5%
    { project_id: projectId, category: 'Brick/Stone Veneer', nahb_category: 'Masonry', nahb_subcategory: 'Brick/Stone Veneer', cost_code: '0410', original_amount: Math.round(25000 * baseMultiplier), current_amount: Math.round(25000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Fireplace', nahb_category: 'Masonry', nahb_subcategory: 'Fireplace', cost_code: '0420', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    
    // Metals (05xx) - ~2%
    { project_id: projectId, category: 'Structural Steel', nahb_category: 'Metals', nahb_subcategory: 'Structural Steel', cost_code: '0510', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    
    // Wood & Plastics (06xx) - ~18%
    { project_id: projectId, category: 'Rough Framing - Lumber', nahb_category: 'Wood & Plastics', nahb_subcategory: 'Rough Framing - Lumber', cost_code: '0610', original_amount: Math.round(55000 * baseMultiplier), current_amount: Math.round(55000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Rough Framing - Labor', nahb_category: 'Wood & Plastics', nahb_subcategory: 'Rough Framing - Labor', cost_code: '0620', original_amount: Math.round(35000 * baseMultiplier), current_amount: Math.round(35000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Trusses', nahb_category: 'Wood & Plastics', nahb_subcategory: 'Trusses', cost_code: '0630', original_amount: Math.round(18000 * baseMultiplier), current_amount: Math.round(18000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Exterior Trim', nahb_category: 'Wood & Plastics', nahb_subcategory: 'Exterior Trim', cost_code: '0640', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    
    // Thermal & Moisture (07xx) - ~8%
    { project_id: projectId, category: 'Insulation - Walls', nahb_category: 'Thermal & Moisture', nahb_subcategory: 'Insulation - Walls', cost_code: '0710', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Insulation - Attic', nahb_category: 'Thermal & Moisture', nahb_subcategory: 'Insulation - Attic', cost_code: '0720', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Roofing - Shingles', nahb_category: 'Thermal & Moisture', nahb_subcategory: 'Roofing - Shingles', cost_code: '0730', original_amount: Math.round(22000 * baseMultiplier), current_amount: Math.round(22000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Waterproofing', nahb_category: 'Thermal & Moisture', nahb_subcategory: 'Waterproofing', cost_code: '0740', original_amount: Math.round(5000 * baseMultiplier), current_amount: Math.round(5000 * baseMultiplier), spent_amount: 0 },
    
    // Doors & Windows (08xx) - ~8%
    { project_id: projectId, category: 'Exterior Doors', nahb_category: 'Doors & Windows', nahb_subcategory: 'Exterior Doors', cost_code: '0810', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Interior Doors', nahb_category: 'Doors & Windows', nahb_subcategory: 'Interior Doors', cost_code: '0820', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Windows', nahb_category: 'Doors & Windows', nahb_subcategory: 'Windows', cost_code: '0830', original_amount: Math.round(25000 * baseMultiplier), current_amount: Math.round(25000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Garage Doors', nahb_category: 'Doors & Windows', nahb_subcategory: 'Garage Doors', cost_code: '0840', original_amount: Math.round(5000 * baseMultiplier), current_amount: Math.round(5000 * baseMultiplier), spent_amount: 0 },
    
    // Finishes (09xx) - ~15%
    { project_id: projectId, category: 'Drywall', nahb_category: 'Finishes', nahb_subcategory: 'Drywall', cost_code: '0910', original_amount: Math.round(28000 * baseMultiplier), current_amount: Math.round(28000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Interior Trim & Millwork', nahb_category: 'Finishes', nahb_subcategory: 'Interior Trim & Millwork', cost_code: '0920', original_amount: Math.round(18000 * baseMultiplier), current_amount: Math.round(18000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Cabinets', nahb_category: 'Finishes', nahb_subcategory: 'Cabinets', cost_code: '0930', original_amount: Math.round(25000 * baseMultiplier), current_amount: Math.round(25000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Countertops', nahb_category: 'Finishes', nahb_subcategory: 'Countertops', cost_code: '0940', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Flooring - Tile', nahb_category: 'Finishes', nahb_subcategory: 'Flooring - Tile', cost_code: '0950', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Flooring - Hardwood', nahb_category: 'Finishes', nahb_subcategory: 'Flooring - Hardwood', cost_code: '0960', original_amount: Math.round(18000 * baseMultiplier), current_amount: Math.round(18000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Painting - Interior', nahb_category: 'Finishes', nahb_subcategory: 'Painting - Interior', cost_code: '0970', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Painting - Exterior', nahb_category: 'Finishes', nahb_subcategory: 'Painting - Exterior', cost_code: '0980', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    
    // Specialties (10xx) - ~3%
    { project_id: projectId, category: 'Mirrors & Shower Doors', nahb_category: 'Specialties', nahb_subcategory: 'Mirrors & Shower Doors', cost_code: '1010', original_amount: Math.round(6000 * baseMultiplier), current_amount: Math.round(6000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Closet Systems', nahb_category: 'Specialties', nahb_subcategory: 'Closet Systems', cost_code: '1020', original_amount: Math.round(5000 * baseMultiplier), current_amount: Math.round(5000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Bath Accessories', nahb_category: 'Specialties', nahb_subcategory: 'Bath Accessories', cost_code: '1030', original_amount: Math.round(3000 * baseMultiplier), current_amount: Math.round(3000 * baseMultiplier), spent_amount: 0 },
    
    // Mechanical (15xx) - ~12%
    { project_id: projectId, category: 'Plumbing - Rough', nahb_category: 'Mechanical', nahb_subcategory: 'Plumbing - Rough', cost_code: '1510', original_amount: Math.round(18000 * baseMultiplier), current_amount: Math.round(18000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Plumbing - Trim', nahb_category: 'Mechanical', nahb_subcategory: 'Plumbing - Trim', cost_code: '1520', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'HVAC - Equipment', nahb_category: 'Mechanical', nahb_subcategory: 'HVAC - Equipment', cost_code: '1530', original_amount: Math.round(22000 * baseMultiplier), current_amount: Math.round(22000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'HVAC - Ductwork', nahb_category: 'Mechanical', nahb_subcategory: 'HVAC - Ductwork', cost_code: '1540', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    
    // Electrical (16xx) - ~8%
    { project_id: projectId, category: 'Electrical - Rough', nahb_category: 'Electrical', nahb_subcategory: 'Electrical - Rough', cost_code: '1610', original_amount: Math.round(22000 * baseMultiplier), current_amount: Math.round(22000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Electrical - Trim', nahb_category: 'Electrical', nahb_subcategory: 'Electrical - Trim', cost_code: '1620', original_amount: Math.round(12000 * baseMultiplier), current_amount: Math.round(12000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Light Fixtures', nahb_category: 'Electrical', nahb_subcategory: 'Light Fixtures', cost_code: '1630', original_amount: Math.round(8000 * baseMultiplier), current_amount: Math.round(8000 * baseMultiplier), spent_amount: 0 },
    
    // Appliances & Equipment (11xx) - ~3%
    { project_id: projectId, category: 'Appliances', nahb_category: 'Appliances & Equipment', nahb_subcategory: 'Appliances', cost_code: '1110', original_amount: Math.round(15000 * baseMultiplier), current_amount: Math.round(15000 * baseMultiplier), spent_amount: 0 },
    { project_id: projectId, category: 'Water Heater', nahb_category: 'Appliances & Equipment', nahb_subcategory: 'Water Heater', cost_code: '1120', original_amount: Math.round(4000 * baseMultiplier), current_amount: Math.round(4000 * baseMultiplier), spent_amount: 0 },
  ]
}

async function insertBudgets() {
  console.log('\n📊 Inserting budgets (45 lines per project)...')
  
  let totalLines = 0
  for (const project of projectsData) {
    const budgetLines = generateBudgetLines(project.id, project.loan_amount)
    const { error } = await supabase.from('budgets').insert(budgetLines)
    if (error) {
      console.error(`   ❌ Failed for ${project.project_code}: ${error.message}`)
    } else {
      totalLines += budgetLines.length
    }
  }
  console.log(`   ✅ ${totalLines} budget lines inserted`)
}

// Draw request data for active and historic projects
function generateDrawRequests() {
  const draws: any[] = []
  let drawCounter = 0
  
  function genDrawId() {
    drawCounter++
    // Generate deterministic UUIDs for draws
    const hex = drawCounter.toString(16).padStart(12, '0')
    return `d1a2b3c4-e5f6-4a1b-8c9d-${hex}`
  }
  
  // Active project draws - various statuses
  // DW-102 (active since June) - 4 funded draws, 1 in review
  const dw102Draws = [
    { draw_number: 1, status: 'funded', total_amount: 75000, request_date: '2025-06-20', funded_at: '2025-06-25T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 95000, request_date: '2025-07-15', funded_at: '2025-07-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 125000, request_date: '2025-08-20', funded_at: '2025-08-25T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 110000, request_date: '2025-10-01', funded_at: '2025-10-05T10:00:00Z' },
    { draw_number: 5, status: 'review', total_amount: 85000, request_date: '2025-12-10' }
  ]
  dw102Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['DW-102'],
      ...d
    })
  })

  // OR-202 (active since July) - 3 funded, 1 staged
  const or202Draws = [
    { draw_number: 1, status: 'funded', total_amount: 65000, request_date: '2025-07-10', funded_at: '2025-07-15T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 85000, request_date: '2025-08-15', funded_at: '2025-08-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 105000, request_date: '2025-10-05', funded_at: '2025-10-10T10:00:00Z' },
    { draw_number: 4, status: 'staged', total_amount: 95000, request_date: '2025-12-12' }
  ]
  or202Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['OR-202'],
      ...d
    })
  })

  // CV-301 (active since Aug) - 3 funded, 1 staged
  const cv301Draws = [
    { draw_number: 1, status: 'funded', total_amount: 55000, request_date: '2025-08-10', funded_at: '2025-08-15T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 75000, request_date: '2025-09-15', funded_at: '2025-09-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 90000, request_date: '2025-11-01', funded_at: '2025-11-05T10:00:00Z' },
    { draw_number: 4, status: 'staged', total_amount: 70000, request_date: '2025-12-14' }
  ]
  cv301Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['CV-301'],
      ...d
    })
  })

  // DW-104 (active since Sep) - 2 funded, 1 review
  const dw104Draws = [
    { draw_number: 1, status: 'funded', total_amount: 70000, request_date: '2025-09-15', funded_at: '2025-09-20T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 95000, request_date: '2025-11-01', funded_at: '2025-11-05T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 85000, request_date: '2025-12-15' }
  ]
  dw104Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['DW-104'],
      ...d
    })
  })

  // OR-203 (active since Oct) - 2 funded, 1 review
  const or203Draws = [
    { draw_number: 1, status: 'funded', total_amount: 58000, request_date: '2025-10-15', funded_at: '2025-10-20T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 80000, request_date: '2025-11-20', funded_at: '2025-11-25T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 72000, request_date: '2025-12-16' }
  ]
  or203Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['OR-203'],
      ...d
    })
  })

  // CV-302 (active since Nov) - 1 funded, 1 staged
  const cv302Draws = [
    { draw_number: 1, status: 'funded', total_amount: 52000, request_date: '2025-11-10', funded_at: '2025-11-15T10:00:00Z' },
    { draw_number: 2, status: 'staged', total_amount: 68000, request_date: '2025-12-13' }
  ]
  cv302Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['CV-302'],
      ...d
    })
  })

  // Historic projects - all draws funded (5-7 each)
  // DW-098 historic - 6 draws
  const dw098Draws = [
    { draw_number: 1, status: 'funded', total_amount: 68000, request_date: '2024-12-15', funded_at: '2024-12-20T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 95000, request_date: '2025-01-15', funded_at: '2025-01-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 125000, request_date: '2025-02-20', funded_at: '2025-02-25T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 115000, request_date: '2025-04-01', funded_at: '2025-04-05T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 145000, request_date: '2025-05-15', funded_at: '2025-05-20T10:00:00Z' },
    { draw_number: 6, status: 'funded', total_amount: 132000, request_date: '2025-07-01', funded_at: '2025-07-05T10:00:00Z' }
  ]
  dw098Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['DW-098'],
      ...d
    })
  })

  // OR-198 historic - 5 draws
  const or198Draws = [
    { draw_number: 1, status: 'funded', total_amount: 60000, request_date: '2025-01-25', funded_at: '2025-01-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 85000, request_date: '2025-03-01', funded_at: '2025-03-05T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 110000, request_date: '2025-04-15', funded_at: '2025-04-20T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 145000, request_date: '2025-06-01', funded_at: '2025-06-05T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 195000, request_date: '2025-08-01', funded_at: '2025-08-05T10:00:00Z' }
  ]
  or198Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['OR-198'],
      ...d
    })
  })

  // CV-298 historic - 7 draws
  const cv298Draws = [
    { draw_number: 1, status: 'funded', total_amount: 51000, request_date: '2025-02-10', funded_at: '2025-02-15T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 68000, request_date: '2025-03-15', funded_at: '2025-03-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 85000, request_date: '2025-04-20', funded_at: '2025-04-25T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 75000, request_date: '2025-05-25', funded_at: '2025-05-30T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 90000, request_date: '2025-07-01', funded_at: '2025-07-05T10:00:00Z' },
    { draw_number: 6, status: 'funded', total_amount: 72000, request_date: '2025-08-10', funded_at: '2025-08-15T10:00:00Z' },
    { draw_number: 7, status: 'funded', total_amount: 69000, request_date: '2025-09-15', funded_at: '2025-09-20T10:00:00Z' }
  ]
  cv298Draws.forEach(d => {
    draws.push({
      id: genDrawId(),
      project_id: PROJECT_IDS['CV-298'],
      ...d
    })
  })

  // ============================================
  // MCD HOMES - ACTIVE PROJECT DRAWS
  // ============================================
  
  // DW-402 (MCD TennBrook active since Jul) - 3 funded, 1 staged
  const dw402Draws = [
    { draw_number: 1, status: 'funded', total_amount: 72000, request_date: '2025-07-25', funded_at: '2025-07-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 98000, request_date: '2025-08-28', funded_at: '2025-09-02T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 115000, request_date: '2025-10-15', funded_at: '2025-10-20T10:00:00Z' },
    { draw_number: 4, status: 'staged', total_amount: 88000, request_date: '2025-12-12' }
  ]
  dw402Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-402'], ...d })
  })

  // DW-403 (MCD TD2 active since Sep) - 2 funded, 1 review
  const dw403Draws = [
    { draw_number: 1, status: 'funded', total_amount: 68000, request_date: '2025-09-12', funded_at: '2025-09-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 92000, request_date: '2025-11-05', funded_at: '2025-11-10T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 78000, request_date: '2025-12-14' }
  ]
  dw403Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-403'], ...d })
  })

  // TL-502 (MCD TD2 active since Oct) - 2 funded, 1 staged
  const tl502Draws = [
    { draw_number: 1, status: 'funded', total_amount: 55000, request_date: '2025-10-12', funded_at: '2025-10-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 72000, request_date: '2025-11-18', funded_at: '2025-11-23T10:00:00Z' },
    { draw_number: 3, status: 'staged', total_amount: 65000, request_date: '2025-12-15' }
  ]
  tl502Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-502'], ...d })
  })

  // TL-503 (MCD TD2 active since Aug) - 3 funded, 1 review
  const tl503Draws = [
    { draw_number: 1, status: 'funded', total_amount: 62000, request_date: '2025-08-12', funded_at: '2025-08-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 85000, request_date: '2025-09-18', funded_at: '2025-09-23T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 105000, request_date: '2025-11-08', funded_at: '2025-11-13T10:00:00Z' },
    { draw_number: 4, status: 'review', total_amount: 82000, request_date: '2025-12-16' }
  ]
  tl503Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-503'], ...d })
  })

  // ============================================
  // MCD HOMES - HISTORIC PROJECT DRAWS
  // ============================================

  // DW-404 (MCD TD2 historic since Jan) - 6 draws all funded
  const dw404Draws = [
    { draw_number: 1, status: 'funded', total_amount: 64000, request_date: '2025-01-08', funded_at: '2025-01-13T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 88000, request_date: '2025-02-15', funded_at: '2025-02-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 115000, request_date: '2025-03-22', funded_at: '2025-03-27T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 105000, request_date: '2025-05-01', funded_at: '2025-05-06T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 135000, request_date: '2025-06-18', funded_at: '2025-06-23T10:00:00Z' },
    { draw_number: 6, status: 'funded', total_amount: 133000, request_date: '2025-08-05', funded_at: '2025-08-10T10:00:00Z' }
  ]
  dw404Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-404'], ...d })
  })

  // TL-504 (MCD TD2 historic since Mar) - 5 draws all funded
  const tl504Draws = [
    { draw_number: 1, status: 'funded', total_amount: 52000, request_date: '2025-03-10', funded_at: '2025-03-15T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 75000, request_date: '2025-04-18', funded_at: '2025-04-23T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 98000, request_date: '2025-06-02', funded_at: '2025-06-07T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 125000, request_date: '2025-07-20', funded_at: '2025-07-25T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 175000, request_date: '2025-09-08', funded_at: '2025-09-13T10:00:00Z' }
  ]
  tl504Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-504'], ...d })
  })

  // ============================================
  // CURTIS HOMES - ACTIVE PROJECT DRAWS
  // ============================================

  // DW-406 (Curtis TennBrook active since Aug) - 3 funded, 1 staged
  const dw406Draws = [
    { draw_number: 1, status: 'funded', total_amount: 69000, request_date: '2025-08-25', funded_at: '2025-08-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 95000, request_date: '2025-10-02', funded_at: '2025-10-07T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 112000, request_date: '2025-11-15', funded_at: '2025-11-20T10:00:00Z' },
    { draw_number: 4, status: 'staged', total_amount: 85000, request_date: '2025-12-13' }
  ]
  dw406Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-406'], ...d })
  })

  // DW-407 (Curtis TD2 active since Oct) - 2 funded, 1 review
  const dw407Draws = [
    { draw_number: 1, status: 'funded', total_amount: 66000, request_date: '2025-10-22', funded_at: '2025-10-27T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 88000, request_date: '2025-11-28', funded_at: '2025-12-03T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 75000, request_date: '2025-12-15' }
  ]
  dw407Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-407'], ...d })
  })

  // TL-506 (Curtis TD2 active since Nov) - 1 funded, 1 staged
  const tl506Draws = [
    { draw_number: 1, status: 'funded', total_amount: 54000, request_date: '2025-11-12', funded_at: '2025-11-17T10:00:00Z' },
    { draw_number: 2, status: 'staged', total_amount: 68000, request_date: '2025-12-14' }
  ]
  tl506Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-506'], ...d })
  })

  // TL-507 (Curtis TD2 active since Sep) - 2 funded, 1 review
  const tl507Draws = [
    { draw_number: 1, status: 'funded', total_amount: 59000, request_date: '2025-09-12', funded_at: '2025-09-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 82000, request_date: '2025-10-28', funded_at: '2025-11-02T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 72000, request_date: '2025-12-16' }
  ]
  tl507Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-507'], ...d })
  })

  // ============================================
  // CURTIS HOMES - HISTORIC PROJECT DRAWS
  // ============================================

  // DW-408 (Curtis TD2 historic since Feb) - 6 draws all funded
  const dw408Draws = [
    { draw_number: 1, status: 'funded', total_amount: 62000, request_date: '2025-02-22', funded_at: '2025-02-27T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 85000, request_date: '2025-03-28', funded_at: '2025-04-02T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 108000, request_date: '2025-05-08', funded_at: '2025-05-13T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 98000, request_date: '2025-06-18', funded_at: '2025-06-23T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 130000, request_date: '2025-08-02', funded_at: '2025-08-07T10:00:00Z' },
    { draw_number: 6, status: 'funded', total_amount: 137000, request_date: '2025-09-18', funded_at: '2025-09-23T10:00:00Z' }
  ]
  dw408Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-408'], ...d })
  })

  // TL-508 (Curtis TD2 historic since Apr) - 5 draws all funded
  const tl508Draws = [
    { draw_number: 1, status: 'funded', total_amount: 50000, request_date: '2025-04-08', funded_at: '2025-04-13T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 72000, request_date: '2025-05-15', funded_at: '2025-05-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 95000, request_date: '2025-06-28', funded_at: '2025-07-03T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 120000, request_date: '2025-08-12', funded_at: '2025-08-17T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 168000, request_date: '2025-10-02', funded_at: '2025-10-07T10:00:00Z' }
  ]
  tl508Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-508'], ...d })
  })

  // ============================================
  // EXISTING BUILDERS - ADDITIONAL PROJECT DRAWS
  // ============================================

  // DW-105 (Ridgeline TD2 active since Sep) - 2 funded, 1 staged
  const dw105Draws = [
    { draw_number: 1, status: 'funded', total_amount: 74000, request_date: '2025-09-25', funded_at: '2025-09-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 102000, request_date: '2025-11-08', funded_at: '2025-11-13T10:00:00Z' },
    { draw_number: 3, status: 'staged', total_amount: 92000, request_date: '2025-12-14' }
  ]
  dw105Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-105'], ...d })
  })

  // OR-204 (Westbrook TD2 active since Oct) - 2 funded, 1 review
  const or204Draws = [
    { draw_number: 1, status: 'funded', total_amount: 61000, request_date: '2025-10-12', funded_at: '2025-10-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 84000, request_date: '2025-11-22', funded_at: '2025-11-27T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 76000, request_date: '2025-12-15' }
  ]
  or204Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['OR-204'], ...d })
  })

  // CV-304 (Horizon TD2 active since Oct) - 2 funded, 1 staged
  const cv304Draws = [
    { draw_number: 1, status: 'funded', total_amount: 54000, request_date: '2025-10-25', funded_at: '2025-10-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 75000, request_date: '2025-11-30', funded_at: '2025-12-05T10:00:00Z' },
    { draw_number: 3, status: 'staged', total_amount: 68000, request_date: '2025-12-16' }
  ]
  cv304Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['CV-304'], ...d })
  })

  // OR-205 (Horizon TD2 historic since Mar) - 5 draws all funded
  const or205Draws = [
    { draw_number: 1, status: 'funded', total_amount: 48000, request_date: '2025-03-22', funded_at: '2025-03-27T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 68000, request_date: '2025-04-28', funded_at: '2025-05-03T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 92000, request_date: '2025-06-12', funded_at: '2025-06-17T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 115000, request_date: '2025-07-28', funded_at: '2025-08-02T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 162000, request_date: '2025-09-15', funded_at: '2025-09-20T10:00:00Z' }
  ]
  or205Draws.forEach(d => {
    draws.push({ id: genDrawId(), project_id: PROJECT_IDS['OR-205'], ...d })
  })

  return draws
}

async function insertDraws() {
  console.log('\n📊 Inserting draw requests...')
  const draws = generateDrawRequests()
  
  const { error } = await supabase.from('draw_requests').insert(draws)
  if (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  } else {
    console.log(`   ✅ ${draws.length} draw requests inserted`)
  }
  
  return draws
}

async function insertDrawLines() {
  console.log('\n📊 Inserting draw request lines...')
  
  // Get all draws and budgets
  const { data: draws } = await supabase.from('draw_requests').select('id, project_id, draw_number, total_amount, status')
  const { data: budgets } = await supabase.from('budgets').select('id, project_id, category, original_amount')
  
  if (!draws || !budgets) {
    console.error('   ❌ Failed to fetch draws or budgets')
    return
  }
  
  const drawLines: any[] = []
  let lineCounter = 0
  
  // For each draw, create 3-5 draw lines distributed across budget categories
  for (const draw of draws) {
    const projectBudgets = budgets.filter(b => b.project_id === draw.project_id)
    if (projectBudgets.length === 0) continue
    
    // Create 3-5 lines per draw
    const numLines = 3 + Math.floor(Math.random() * 3)
    const amountPerLine = Math.round(draw.total_amount / numLines)
    
    // Pick random budgets for this draw
    const shuffled = [...projectBudgets].sort(() => Math.random() - 0.5)
    const selectedBudgets = shuffled.slice(0, numLines)
    
    for (let i = 0; i < selectedBudgets.length; i++) {
      lineCounter++
      const budget = selectedBudgets[i]
      const amount = i === selectedBudgets.length - 1 
        ? draw.total_amount - (amountPerLine * (selectedBudgets.length - 1)) // Last line gets remainder
        : amountPerLine
      
      drawLines.push({
        id: `e1a2b3c4-d5e6-4f7a-8b9c-${lineCounter.toString(16).padStart(12, '0')}`,
        draw_request_id: draw.id,
        budget_id: budget.id,
        amount_requested: amount,
        amount_approved: amount,
        confidence_score: 0.95,
        notes: budget.category
      })
    }
  }
  
  // Insert in batches
  const batchSize = 50
  let inserted = 0
  for (let i = 0; i < drawLines.length; i += batchSize) {
    const batch = drawLines.slice(i, i + batchSize)
    const { error } = await supabase.from('draw_request_lines').insert(batch)
    if (error) {
      console.error(`   ❌ Batch ${i / batchSize + 1} failed: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }
  
  console.log(`   ✅ ${inserted} draw request lines inserted`)
  return drawLines
}

async function repairMissingDrawLines() {
  console.log('\n🔧 Repairing draws with missing lines...')
  
  // Find draws that have no draw_request_lines
  const { data: allDraws } = await supabase
    .from('draw_requests')
    .select('id, project_id, draw_number, total_amount, status')
  
  const { data: existingLines } = await supabase
    .from('draw_request_lines')
    .select('draw_request_id')
  
  const drawsWithLines = new Set(existingLines?.map(l => l.draw_request_id) || [])
  const orphanedDraws = allDraws?.filter(d => !drawsWithLines.has(d.id)) || []
  
  console.log(`   Found ${orphanedDraws.length} draws without lines`)
  
  if (orphanedDraws.length === 0) {
    console.log('   ✅ All draws have lines - nothing to repair')
    return
  }
  
  // Get budgets for line generation
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, project_id, category, original_amount')
  
  if (!budgets) {
    console.error('   ❌ Failed to fetch budgets')
    return
  }
  
  // Generate lines only for orphaned draws (reuse existing logic)
  const drawLines: any[] = []
  // Use timestamp-based IDs to avoid conflicts
  const timestamp = Date.now()
  let lineCounter = 0
  
  for (const draw of orphanedDraws) {
    const projectBudgets = budgets.filter(b => b.project_id === draw.project_id)
    if (projectBudgets.length === 0) {
      console.log(`   ⚠️ No budgets found for draw ${draw.id} (project ${draw.project_id})`)
      continue
    }
    
    // Create 3-5 lines per draw
    const numLines = 3 + Math.floor(Math.random() * 3)
    const amountPerLine = Math.round(draw.total_amount / numLines)
    
    // Pick random budgets for this draw
    const shuffled = [...projectBudgets].sort(() => Math.random() - 0.5)
    const selectedBudgets = shuffled.slice(0, numLines)
    
    for (let i = 0; i < selectedBudgets.length; i++) {
      lineCounter++
      const budget = selectedBudgets[i]
      const amount = i === selectedBudgets.length - 1 
        ? draw.total_amount - (amountPerLine * (selectedBudgets.length - 1)) // Last line gets remainder
        : amountPerLine
      
      // Generate truly unique ID using timestamp + counter (valid UUID format: 8-4-4-4-12)
      const uniqueSuffix = `${timestamp.toString(16).slice(-8)}${lineCounter.toString(16).padStart(4, '0')}`
      drawLines.push({
        id: `f2b3c4d5-e6f7-4a8b-9c0d-${uniqueSuffix.padStart(12, '0')}`,
        draw_request_id: draw.id,
        budget_id: budget.id,
        amount_requested: amount,
        amount_approved: amount,
        confidence_score: 0.95,
        notes: budget.category
      })
    }
  }
  
  // Insert in batches
  const batchSize = 100
  let inserted = 0
  for (let i = 0; i < drawLines.length; i += batchSize) {
    const batch = drawLines.slice(i, i + batchSize)
    const { error } = await supabase.from('draw_request_lines').insert(batch)
    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }
  
  console.log(`   ✅ Inserted ${inserted} draw lines for ${orphanedDraws.length} orphaned draws`)
}

async function backfillLowUtilizationLoans(lightMode: boolean = false) {
  const targetPct = lightMode ? 0.38 : 0.85 // 38% for light mode (25-50% range), 85% for full
  const projectCount = lightMode ? 5 : 6
  console.log(`\n📈 Backfilling ${projectCount} low-utilization loans to ~${(targetPct * 100).toFixed(0)}%...`)
  
  // Step 1: Get active projects with their budget totals and funded amounts
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, builder_id, loan_amount, lifecycle_stage')
    .eq('lifecycle_stage', 'active')
  
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, project_id, category, original_amount, spent_amount')
  
  const { data: existingDraws } = await supabase
    .from('draw_requests')
    .select('id, project_id, draw_number, status, total_amount')
  
  if (!projects || !budgets) {
    console.error('   ❌ Failed to fetch projects or budgets')
    return
  }
  
  // Calculate utilization per project using loan_amount as the base
  const projectStats = projects.map(p => {
    const projectBudgets = budgets.filter(b => b.project_id === p.id)
    // Use loan_amount as the basis for calculating utilization (more reliable)
    const loanAmount = p.loan_amount || 0
    const fundedDraws = existingDraws?.filter(d => d.project_id === p.id && d.status === 'funded') || []
    const fundedAmount = fundedDraws.reduce((sum, d) => sum + (d.total_amount || 0), 0)
    const maxDrawNumber = Math.max(0, ...existingDraws?.filter(d => d.project_id === p.id).map(d => d.draw_number) || [0])
    const utilization = loanAmount > 0 ? fundedAmount / loanAmount : 0
    
    return {
      ...p,
      loanAmount,
      fundedAmount,
      utilization,
      maxDrawNumber,
      projectBudgets
    }
  })
  
  // Sort by utilization and select bottom N (5 for light mode, 6 for full)
  projectStats.sort((a, b) => a.utilization - b.utilization)
  const lowestUtilization = projectStats.slice(0, projectCount)
  
  console.log(`   Found ${lowestUtilization.length} loans to backfill:`)
  lowestUtilization.forEach(p => {
    console.log(`   - ${p.project_code}: ${(p.utilization * 100).toFixed(1)}% ($${(p.fundedAmount/1000).toFixed(0)}K drawn / $${(p.loanAmount/1000).toFixed(0)}K loan)`)
  })
  
  // Step 2: Generate draws for each project to bring to ~85% utilization
  const newDraws: any[] = []
  const newDrawLines: any[] = []
  // Use timestamp for unique IDs to avoid collisions with previous runs
  const timestamp = Date.now()
  const baseOffset = lightMode ? 500000 : 0  // Different offset for light mode (high to avoid collisions)
  let drawIdCounter = baseOffset
  let lineIdCounter = baseOffset
  
  for (const project of lowestUtilization) {
    // Use targetPct from function parameter (38% for light, 85% for full)
    const targetAmount = project.loanAmount * targetPct
    const amountNeeded = targetAmount - project.fundedAmount
    
    if (amountNeeded <= 0) {
      console.log(`   Skipping ${project.project_code} - already at target`)
      continue
    }
    
    // Query budgets directly for this project (more reliable than filtered array)
    const { data: projectBudgetsDirect } = await supabase
      .from('budgets')
      .select('id, category, original_amount')
      .eq('project_id', project.id)
    
    // Skip if no budgets exist for this project
    if (!projectBudgetsDirect || projectBudgetsDirect.length === 0) {
      console.log(`   ⚠️ Skipping ${project.project_code} - no budgets found (run --fix-mismatch first)`)
      continue
    }
    
    // Update project.projectBudgets with the directly queried data
    project.projectBudgets = projectBudgetsDirect
    
    // Generate draws to reach target (fewer for light mode)
    const numDraws = lightMode 
      ? (amountNeeded > 150000 ? 2 : 1)  // 1-2 draws for light mode
      : (amountNeeded > 300000 ? 4 : 3)  // 3-4 draws for full mode
    const baseAmount = Math.round(amountNeeded / numDraws)
    
    // Date the draws going back in time (most recent first)
    const drawDates = [
      '2025-12-10', // Most recent
      '2025-11-15',
      '2025-10-20',
      '2025-09-25'  // Oldest
    ]
    
    const fundedDates = [
      '2025-12-15T10:00:00Z',
      '2025-11-20T10:00:00Z',
      '2025-10-25T10:00:00Z',
      '2025-09-30T10:00:00Z'
    ]
    
    for (let i = 0; i < numDraws; i++) {
      drawIdCounter++
      const drawNumber = project.maxDrawNumber + i + 1
      const amount = i === numDraws - 1 
        ? amountNeeded - (baseAmount * (numDraws - 1)) // Last draw gets remainder
        : baseAmount
      
      // Use timestamp + counter for truly unique IDs
      const uniquePart = `${timestamp.toString(16).slice(-6)}${drawIdCounter.toString(16).padStart(6, '0')}`
      const drawId = `d3a4b5c6-e7f8-4a3b-9c0d-${uniquePart}`
      
      newDraws.push({
        id: drawId,
        project_id: project.id,
        draw_number: drawNumber,
        status: 'funded',
        total_amount: amount,
        request_date: drawDates[i],
        funded_at: fundedDates[i]
      })
      
      // Generate 4-5 draw lines for this draw
      const numLines = 4 + Math.floor(Math.random() * 2)
      const lineAmount = Math.round(amount / numLines)
      const shuffledBudgets = [...project.projectBudgets].sort(() => Math.random() - 0.5)
      const selectedBudgets = shuffledBudgets.slice(0, numLines)
      
      for (let j = 0; j < selectedBudgets.length; j++) {
        lineIdCounter++
        const budget = selectedBudgets[j]
        const lineAmt = j === selectedBudgets.length - 1
          ? amount - (lineAmount * (selectedBudgets.length - 1))
          : lineAmount
        
        // Use timestamp + counter for truly unique IDs
        const lineUniquePart = `${timestamp.toString(16).slice(-6)}${lineIdCounter.toString(16).padStart(6, '0')}`
        newDrawLines.push({
          id: `f3b4c5d6-e7f8-4a9b-9c0d-${lineUniquePart}`,
          draw_request_id: drawId,
          budget_id: budget.id,
          amount_requested: lineAmt,
          amount_approved: lineAmt,
          confidence_score: 0.95,
          notes: budget.category
        })
      }
    }
    
    console.log(`   Generated ${numDraws} draws for ${project.project_code} (+$${(amountNeeded/1000).toFixed(0)}K)`)
  }
  
  // Step 3: Insert new draws
  if (newDraws.length > 0) {
    console.log(`\n   Inserting ${newDraws.length} new funded draws...`)
    const { error: drawError } = await supabase.from('draw_requests').insert(newDraws)
    if (drawError) {
      console.error(`   ❌ Failed to insert draws: ${drawError.message}`)
      return
    }
    console.log(`   ✅ Inserted ${newDraws.length} draws`)
  }
  
  // Step 4: Insert draw lines
  if (newDrawLines.length > 0) {
    console.log(`   Inserting ${newDrawLines.length} draw lines...`)
    const batchSize = 100
    let inserted = 0
    for (let i = 0; i < newDrawLines.length; i += batchSize) {
      const batch = newDrawLines.slice(i, i + batchSize)
      const { error } = await supabase.from('draw_request_lines').insert(batch)
      if (error) {
        console.error(`   ❌ Batch failed: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }
    console.log(`   ✅ Inserted ${inserted} draw lines`)
  }
  
  // Step 5: Create wire batches for the new funded draws
  console.log(`   Creating wire batches...`)
  const wireBatches: any[] = []
  let batchCounter = 0
  
  // Group new draws by builder for wire batches
  const drawsByBuilder: Map<string, any[]> = new Map()
  for (const draw of newDraws) {
    const project = lowestUtilization.find(p => p.id === draw.project_id)
    if (!project) continue
    const builderId = project.builder_id
    if (!drawsByBuilder.has(builderId)) {
      drawsByBuilder.set(builderId, [])
    }
    drawsByBuilder.get(builderId)!.push(draw)
  }
  
  for (const [builderId, draws] of drawsByBuilder) {
    batchCounter++
    const totalAmount = draws.reduce((sum, d) => sum + d.total_amount, 0)
    wireBatches.push({
      id: `e3a4b5c6-e7f8-4a3b-9c0d-${batchCounter.toString(16).padStart(12, '0')}`,
      builder_id: builderId,
      status: 'completed',
      total_amount: totalAmount,
      wire_date: '2025-12-15',
      wire_reference: `BACKFILL-${batchCounter.toString().padStart(4, '0')}`,
      notes: 'Backfilled historical draws'
    })
  }
  
  if (wireBatches.length > 0) {
    const { error: wireError } = await supabase.from('wire_batches').insert(wireBatches)
    if (wireError) {
      console.error(`   ❌ Wire batch error: ${wireError.message}`)
    } else {
      console.log(`   ✅ Created ${wireBatches.length} wire batches`)
    }
  }
  
  console.log(`\n   ✅ Backfill complete! Added $${(newDraws.reduce((s, d) => s + d.total_amount, 0) / 1000).toFixed(0)}K in funded draws`)
}

async function cleanOrphanedDraws() {
  console.log('\n🧹 Cleaning orphaned draws...')
  
  // Find all unique project_ids from draws
  const { data: draws } = await supabase
    .from('draw_requests')
    .select('id, project_id')
  
  // Find all project_ids that have budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select('project_id')
  
  const projectsWithBudgets = new Set(budgets?.map(b => b.project_id) || [])
  
  // Find draws referencing projects without budgets
  const orphanedDraws = draws?.filter(d => !projectsWithBudgets.has(d.project_id)) || []
  
  console.log(`   Found ${orphanedDraws.length} draws referencing projects without budgets`)
  
  if (orphanedDraws.length === 0) {
    console.log('   ✅ No orphaned draws found')
    return
  }
  
  // Delete orphaned draws
  const orphanedIds = orphanedDraws.map(d => d.id)
  const { error } = await supabase
    .from('draw_requests')
    .delete()
    .in('id', orphanedIds)
  
  if (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  } else {
    console.log(`   ✅ Deleted ${orphanedDraws.length} orphaned draws`)
  }
}

async function repairMissingBudgets() {
  console.log('\n🔧 Repairing projects with missing budgets...')
  
  // Find projects that have no budgets
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, project_code, loan_amount')
  
  const { data: existingBudgets } = await supabase
    .from('budgets')
    .select('project_id')
  
  const projectsWithBudgets = new Set(existingBudgets?.map(b => b.project_id) || [])
  const orphanedProjects = allProjects?.filter(p => !projectsWithBudgets.has(p.id)) || []
  
  console.log(`   Found ${orphanedProjects.length} projects without budgets`)
  
  if (orphanedProjects.length === 0) {
    console.log('   ✅ All projects have budgets - nothing to repair')
    return
  }
  
  // Generate budgets for orphaned projects using existing template
  let totalLines = 0
  for (const project of orphanedProjects) {
    console.log(`   Adding budgets for ${project.project_code}...`)
    const budgetLines = generateBudgetLines(project.id, project.loan_amount)
    
    const { error } = await supabase.from('budgets').insert(budgetLines)
    if (error) {
      console.error(`   ❌ Failed for ${project.project_code}: ${error.message}`)
    } else {
      totalLines += budgetLines.length
    }
  }
  
  console.log(`   ✅ Inserted ${totalLines} budget lines for ${orphanedProjects.length} orphaned projects`)
}

async function fixBudgetMismatch() {
  console.log('\n🔧 Fixing budget mismatch for original seed projects...')
  
  // Target the specific problematic project codes from original seed
  const targetCodes = ['CV-302', 'DW-104', 'OR-203', 'DW-403', 'CV-301', 'DW-102', 'OR-202']
  
  // Get these projects from the database
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, loan_amount, lifecycle_stage')
    .in('project_code', targetCodes)
  
  if (!projects || projects.length === 0) {
    console.log('   No target projects found')
    return
  }
  
  console.log(`   Found ${projects.length} target projects`)
  
  // Find projects without budgets and fix them
  let fixed = 0
  for (const project of projects) {
    // Direct query for this project's budgets (more reliable than map lookup)
    const { data: projectBudgets, count } = await supabase
      .from('budgets')
      .select('id', { count: 'exact' })
      .eq('project_id', project.id)
    
    const budgetCount = count || projectBudgets?.length || 0
    console.log(`   ${project.project_code} (${project.lifecycle_stage}): ${budgetCount} budgets`)
    
    if (budgetCount === 0) {
      console.log(`   → Adding budgets for ${project.project_code} (ID: ${project.id})...`)
      const budgetLines = generateBudgetLines(project.id, project.loan_amount)
      
      const { data, error } = await supabase.from('budgets').insert(budgetLines).select('id')
      if (error) {
        console.error(`   ❌ Failed: ${error.message}`)
        console.error(`   ❌ Error details: ${JSON.stringify(error)}`)
      } else {
        console.log(`   ✅ Added ${data?.length || budgetLines.length} budget lines`)
        fixed++
        
        // Verify the insert
        const { data: verify } = await supabase.from('budgets').select('id').eq('project_id', project.id)
        console.log(`   ✅ Verified: ${verify?.length || 0} budgets now exist for ${project.project_code}`)
      }
    }
  }
  
  console.log(`\n   ✅ Fixed ${fixed} projects`)
}

async function insertWireBatches() {
  console.log('\n📊 Inserting wire batches for funded draws...')
  
  // Get funded draws grouped by builder
  const { data: fundedDraws } = await supabase
    .from('draw_requests')
    .select('id, project_id, total_amount, funded_at')
    .eq('status', 'funded')
  
  const { data: projects } = await supabase.from('projects').select('id, builder_id')
  
  if (!fundedDraws || !projects) {
    console.error('   ❌ Failed to fetch draws or projects')
    return
  }
  
  // Group draws by builder and month for wire batches
  const projectBuilderMap = new Map(projects.map(p => [p.id, p.builder_id]))
  const batchGroups: Map<string, any[]> = new Map()
  
  for (const draw of fundedDraws) {
    const builderId = projectBuilderMap.get(draw.project_id)
    if (!builderId) continue
    
    const fundedDate = new Date(draw.funded_at || new Date())
    const monthKey = `${builderId}-${fundedDate.getFullYear()}-${fundedDate.getMonth()}`
    
    if (!batchGroups.has(monthKey)) {
      batchGroups.set(monthKey, [])
    }
    batchGroups.get(monthKey)!.push(draw)
  }
  
  // Create wire batches using actual schema columns
  const wireBatches: any[] = []
  let batchCounter = 0
  
  for (const [key, draws] of batchGroups) {
    batchCounter++
    // Builder ID is a full UUID, so split at first hyphen after the UUID pattern
    // Key format: "c3d4e5f6-a1b2-4c3d-ae9f-333333333333-2025-6"
    const keyParts = key.split('-')
    // UUID is 5 parts separated by hyphens
    const builderId = keyParts.slice(0, 5).join('-')
    const totalAmount = draws.reduce((sum, d) => sum + d.total_amount, 0)
    const fundedAt = draws[0].funded_at || new Date().toISOString()
    
    wireBatches.push({
      id: `w1a2b3c4-d5e6-4f7a-8b9c-${batchCounter.toString(16).padStart(12, '0')}`,
      builder_id: builderId,
      total_amount: totalAmount,
      status: 'funded',
      submitted_at: fundedAt,
      submitted_by: 'system',
      funded_at: fundedAt,
      funded_by: 'system',
      wire_reference: `WR${String(batchCounter).padStart(6, '0')}`,
      notes: `Wire batch for ${draws.length} draw(s)`
    })
  }
  
  const { error } = await supabase.from('wire_batches').insert(wireBatches)
  if (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  } else {
    console.log(`   ✅ ${wireBatches.length} wire batches inserted`)
  }
}

async function updateBudgetSpentAmounts() {
  console.log('\n📊 Updating budget spent amounts...')
  
  // Get all funded draw lines with their budget IDs
  const { data: fundedLines } = await supabase
    .from('draw_request_lines')
    .select(`
      budget_id,
      amount_approved,
      draw_requests!inner(status)
    `)
    .eq('draw_requests.status', 'funded')
  
  if (!fundedLines) {
    console.error('   ❌ Failed to fetch funded lines')
    return
  }
  
  // Sum amounts by budget_id
  const spentByBudget: Map<string, number> = new Map()
  for (const line of fundedLines) {
    if (!line.budget_id) continue
    const current = spentByBudget.get(line.budget_id) || 0
    spentByBudget.set(line.budget_id, current + (line.amount_approved || 0))
  }
  
  // Update each budget
  let updated = 0
  for (const [budgetId, spent] of spentByBudget) {
    const { error } = await supabase
      .from('budgets')
      .update({ spent_amount: spent })
      .eq('id', budgetId)
    
    if (!error) updated++
  }
  
  console.log(`   ✅ ${updated} budgets updated with spent amounts`)
}

// New project codes added in this expansion
const NEW_PROJECT_CODES = [
  'DW-401', 'DW-402', 'DW-403', 'DW-404', 'TL-501', 'TL-502', 'TL-503', 'TL-504',
  'DW-405', 'DW-406', 'DW-407', 'DW-408', 'TL-505', 'TL-506', 'TL-507', 'TL-508',
  'DW-105', 'CV-303', 'OR-204', 'DW-106', 'CV-304', 'OR-205'
]

// New builder IDs added in this expansion
const NEW_BUILDER_IDS = [BUILDER_MCD_ID, BUILDER_CURTIS_ID]

async function insertBuildersAppend() {
  console.log('\n📊 Inserting NEW builders only...')
  
  const newBuilders = [
    {
      id: BUILDER_MCD_ID,
      company_name: 'MCD Homes',
      borrower_name: 'Michael C. Davis',
      email: 'mike@mcdhomes.com',
      phone: '512-555-0404',
      address_street: '3200 Research Blvd',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78759',
      bank_name: 'Wells Fargo',
      bank_routing_number: '121042882',
      bank_account_number: '3456789012',
      bank_account_name: 'MCD Homes LLC',
      notes: 'Established builder specializing in energy-efficient homes.'
    },
    {
      id: BUILDER_CURTIS_ID,
      company_name: 'Curtis Homes',
      borrower_name: 'Amanda Curtis',
      email: 'amanda@curtishomes.com',
      phone: '512-555-0505',
      address_street: '1500 S Congress Ave',
      address_city: 'Austin',
      address_state: 'TX',
      address_zip: '78704',
      bank_name: 'Bank of America',
      bank_routing_number: '111000025',
      bank_account_number: '5678901234',
      bank_account_name: 'Curtis Homes Inc',
      notes: 'Family-owned builder with 25 years experience in Central Texas.'
    }
  ]
  
  const { error } = await supabase.from('builders').insert(newBuilders)
  if (error) {
    console.error(`   ❌ Failed to insert new builders: ${error.message}`)
  } else {
    console.log(`   ✅ ${newBuilders.length} new builders inserted`)
  }
}

async function insertProjectsAppend() {
  console.log('\n📊 Inserting NEW projects only...')
  
  const newProjects = projectsData.filter(p => NEW_PROJECT_CODES.includes(p.project_code))
  
  // Update lender IDs to use actual DB IDs
  const projectsToInsert = newProjects.map(p => {
    const project = { ...p }
    if (project.lender_id === LENDER_TD2_ID) {
      project.lender_id = getLenderTD2Id()
    } else if (project.lender_id === LENDER_TENNBROOK_ID) {
      project.lender_id = getLenderTennbrookId()
    }
    // Remove status field - let DB use default
    delete (project as any).status
    return project
  })
  
  const { error } = await supabase.from('projects').insert(projectsToInsert)
  if (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  } else {
    console.log(`   ✅ ${projectsToInsert.length} new projects inserted`)
  }
}

async function insertBudgetsAppend() {
  console.log('\n📊 Inserting budgets for NEW projects only (45 lines per project)...')
  
  const newProjects = projectsData.filter(p => NEW_PROJECT_CODES.includes(p.project_code))
  
  let totalLines = 0
  for (const project of newProjects) {
    const budgetLines = generateBudgetLines(project.id, project.loan_amount)
    const { error } = await supabase.from('budgets').insert(budgetLines)
    if (error) {
      console.error(`   ❌ Failed for ${project.project_code}: ${error.message}`)
    } else {
      totalLines += budgetLines.length
    }
  }
  console.log(`   ✅ ${totalLines} budget lines inserted for ${newProjects.length} new projects`)
}

function generateDrawRequestsAppend() {
  const draws: any[] = []
  let drawCounter = 100 // Start at 100 to avoid conflicts with existing draw IDs
  
  function genDrawId() {
    drawCounter++
    const hex = drawCounter.toString(16).padStart(12, '0')
    return `d2a3b4c5-e6f7-4a2b-9c0d-${hex}`
  }

  // MCD HOMES ACTIVE DRAWS
  const dw402Draws = [
    { draw_number: 1, status: 'funded', total_amount: 72000, request_date: '2025-07-25', funded_at: '2025-07-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 98000, request_date: '2025-08-28', funded_at: '2025-09-02T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 115000, request_date: '2025-10-15', funded_at: '2025-10-20T10:00:00Z' },
    { draw_number: 4, status: 'staged', total_amount: 88000, request_date: '2025-12-12' }
  ]
  dw402Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-402'], ...d }))

  const dw403Draws = [
    { draw_number: 1, status: 'funded', total_amount: 68000, request_date: '2025-09-12', funded_at: '2025-09-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 92000, request_date: '2025-11-05', funded_at: '2025-11-10T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 78000, request_date: '2025-12-14' }
  ]
  dw403Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-403'], ...d }))

  const tl502Draws = [
    { draw_number: 1, status: 'funded', total_amount: 55000, request_date: '2025-10-12', funded_at: '2025-10-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 72000, request_date: '2025-11-18', funded_at: '2025-11-23T10:00:00Z' },
    { draw_number: 3, status: 'staged', total_amount: 65000, request_date: '2025-12-15' }
  ]
  tl502Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-502'], ...d }))

  const tl503Draws = [
    { draw_number: 1, status: 'funded', total_amount: 62000, request_date: '2025-08-12', funded_at: '2025-08-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 85000, request_date: '2025-09-18', funded_at: '2025-09-23T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 105000, request_date: '2025-11-08', funded_at: '2025-11-13T10:00:00Z' },
    { draw_number: 4, status: 'review', total_amount: 82000, request_date: '2025-12-16' }
  ]
  tl503Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-503'], ...d }))

  // MCD HOMES HISTORIC DRAWS
  const dw404Draws = [
    { draw_number: 1, status: 'funded', total_amount: 64000, request_date: '2025-01-08', funded_at: '2025-01-13T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 88000, request_date: '2025-02-15', funded_at: '2025-02-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 115000, request_date: '2025-03-22', funded_at: '2025-03-27T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 105000, request_date: '2025-05-01', funded_at: '2025-05-06T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 135000, request_date: '2025-06-18', funded_at: '2025-06-23T10:00:00Z' },
    { draw_number: 6, status: 'funded', total_amount: 133000, request_date: '2025-08-05', funded_at: '2025-08-10T10:00:00Z' }
  ]
  dw404Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-404'], ...d }))

  const tl504Draws = [
    { draw_number: 1, status: 'funded', total_amount: 52000, request_date: '2025-03-10', funded_at: '2025-03-15T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 75000, request_date: '2025-04-18', funded_at: '2025-04-23T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 98000, request_date: '2025-06-02', funded_at: '2025-06-07T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 125000, request_date: '2025-07-20', funded_at: '2025-07-25T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 175000, request_date: '2025-09-08', funded_at: '2025-09-13T10:00:00Z' }
  ]
  tl504Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-504'], ...d }))

  // CURTIS HOMES ACTIVE DRAWS
  const dw406Draws = [
    { draw_number: 1, status: 'funded', total_amount: 69000, request_date: '2025-08-25', funded_at: '2025-08-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 95000, request_date: '2025-10-02', funded_at: '2025-10-07T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 112000, request_date: '2025-11-15', funded_at: '2025-11-20T10:00:00Z' },
    { draw_number: 4, status: 'staged', total_amount: 85000, request_date: '2025-12-13' }
  ]
  dw406Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-406'], ...d }))

  const dw407Draws = [
    { draw_number: 1, status: 'funded', total_amount: 66000, request_date: '2025-10-22', funded_at: '2025-10-27T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 88000, request_date: '2025-11-28', funded_at: '2025-12-03T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 75000, request_date: '2025-12-15' }
  ]
  dw407Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-407'], ...d }))

  const tl506Draws = [
    { draw_number: 1, status: 'funded', total_amount: 54000, request_date: '2025-11-12', funded_at: '2025-11-17T10:00:00Z' },
    { draw_number: 2, status: 'staged', total_amount: 68000, request_date: '2025-12-14' }
  ]
  tl506Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-506'], ...d }))

  const tl507Draws = [
    { draw_number: 1, status: 'funded', total_amount: 59000, request_date: '2025-09-12', funded_at: '2025-09-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 82000, request_date: '2025-10-28', funded_at: '2025-11-02T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 72000, request_date: '2025-12-16' }
  ]
  tl507Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-507'], ...d }))

  // CURTIS HOMES HISTORIC DRAWS
  const dw408Draws = [
    { draw_number: 1, status: 'funded', total_amount: 62000, request_date: '2025-02-22', funded_at: '2025-02-27T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 85000, request_date: '2025-03-28', funded_at: '2025-04-02T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 108000, request_date: '2025-05-08', funded_at: '2025-05-13T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 98000, request_date: '2025-06-18', funded_at: '2025-06-23T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 130000, request_date: '2025-08-02', funded_at: '2025-08-07T10:00:00Z' },
    { draw_number: 6, status: 'funded', total_amount: 137000, request_date: '2025-09-18', funded_at: '2025-09-23T10:00:00Z' }
  ]
  dw408Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-408'], ...d }))

  const tl508Draws = [
    { draw_number: 1, status: 'funded', total_amount: 50000, request_date: '2025-04-08', funded_at: '2025-04-13T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 72000, request_date: '2025-05-15', funded_at: '2025-05-20T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 95000, request_date: '2025-06-28', funded_at: '2025-07-03T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 120000, request_date: '2025-08-12', funded_at: '2025-08-17T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 168000, request_date: '2025-10-02', funded_at: '2025-10-07T10:00:00Z' }
  ]
  tl508Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['TL-508'], ...d }))

  // EXISTING BUILDERS ADDITIONAL DRAWS
  const dw105Draws = [
    { draw_number: 1, status: 'funded', total_amount: 74000, request_date: '2025-09-25', funded_at: '2025-09-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 102000, request_date: '2025-11-08', funded_at: '2025-11-13T10:00:00Z' },
    { draw_number: 3, status: 'staged', total_amount: 92000, request_date: '2025-12-14' }
  ]
  dw105Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['DW-105'], ...d }))

  const or204Draws = [
    { draw_number: 1, status: 'funded', total_amount: 61000, request_date: '2025-10-12', funded_at: '2025-10-17T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 84000, request_date: '2025-11-22', funded_at: '2025-11-27T10:00:00Z' },
    { draw_number: 3, status: 'review', total_amount: 76000, request_date: '2025-12-15' }
  ]
  or204Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['OR-204'], ...d }))

  const cv304Draws = [
    { draw_number: 1, status: 'funded', total_amount: 54000, request_date: '2025-10-25', funded_at: '2025-10-30T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 75000, request_date: '2025-11-30', funded_at: '2025-12-05T10:00:00Z' },
    { draw_number: 3, status: 'staged', total_amount: 68000, request_date: '2025-12-16' }
  ]
  cv304Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['CV-304'], ...d }))

  const or205Draws = [
    { draw_number: 1, status: 'funded', total_amount: 48000, request_date: '2025-03-22', funded_at: '2025-03-27T10:00:00Z' },
    { draw_number: 2, status: 'funded', total_amount: 68000, request_date: '2025-04-28', funded_at: '2025-05-03T10:00:00Z' },
    { draw_number: 3, status: 'funded', total_amount: 92000, request_date: '2025-06-12', funded_at: '2025-06-17T10:00:00Z' },
    { draw_number: 4, status: 'funded', total_amount: 115000, request_date: '2025-07-28', funded_at: '2025-08-02T10:00:00Z' },
    { draw_number: 5, status: 'funded', total_amount: 162000, request_date: '2025-09-15', funded_at: '2025-09-20T10:00:00Z' }
  ]
  or205Draws.forEach(d => draws.push({ id: genDrawId(), project_id: PROJECT_IDS['OR-205'], ...d }))

  return draws
}

async function insertDrawsAppend() {
  console.log('\n📊 Inserting draws for NEW projects only...')
  const draws = generateDrawRequestsAppend()
  
  const { error } = await supabase.from('draw_requests').insert(draws)
  if (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  } else {
    console.log(`   ✅ ${draws.length} draw requests inserted`)
  }
  
  return draws
}

async function main() {
  console.log('🚀 TD3 SQL Executor')
  console.log('========================')
  console.log('🔗 Supabase URL:', supabaseUrl)
  
  const args = process.argv.slice(2)
  const clearOnly = args.includes('--clear-only')
  const addLinesOnly = args.includes('--add-lines')
  const appendMode = args.includes('--append')
  const repairLines = args.includes('--repair-lines')
  const repairBudgets = args.includes('--repair-budgets')
  const repairAll = args.includes('--repair-all')
  const cleanOrphans = args.includes('--clean-orphans')
  const backfillDraws = args.includes('--backfill-draws')
  
  if (cleanOrphans) {
    // Delete draws referencing projects without budgets
    await cleanOrphanedDraws()
    console.log('\n✅ Orphan cleanup complete!')
    return
  }
  
  if (backfillDraws) {
    // Add funded draws to low-utilization loans (target 85%)
    await backfillLowUtilizationLoans(false)
    await updateBudgetSpentAmounts()
    console.log('\n✅ Backfill complete!')
    return
  }
  
  const backfillLight = args.includes('--backfill-light')
  if (backfillLight) {
    // Add funded draws to bring loans to 25-50% (light backfill)
    await backfillLowUtilizationLoans(true)
    await updateBudgetSpentAmounts()
    console.log('\n✅ Light backfill complete!')
    return
  }
  
  const fixMismatch = args.includes('--fix-mismatch')
  if (fixMismatch) {
    // Fix budget mismatch for original seed projects
    await fixBudgetMismatch()
    console.log('\n✅ Mismatch fix complete!')
    return
  }
  
  if (repairAll) {
    // Full repair: budgets first, then draw lines
    await repairMissingBudgets()
    await repairMissingDrawLines()
    await updateBudgetSpentAmounts()
    console.log('\n✅ Full repair complete!')
    return
  }
  
  if (repairBudgets) {
    // Repair projects that are missing budgets
    await repairMissingBudgets()
    console.log('\n✅ Budget repair complete!')
    return
  }
  
  if (repairLines) {
    // Repair draws that are missing draw_request_lines
    await repairMissingDrawLines()
    await updateBudgetSpentAmounts()
    console.log('\n✅ Draw lines repair complete!')
    return
  }
  
  if (addLinesOnly) {
    // Just add the draw lines and wire batches
    await insertDrawLines()
    await insertWireBatches()
    await updateBudgetSpentAmounts()
    console.log('\n✅ Draw lines and wire batches added!')
    return
  }
  
  if (appendMode) {
    console.log('\n📌 APPEND MODE - Only inserting NEW data')
    console.log('   (Skipping clear, inserting 2 new builders + 22 new projects)\n')
    
    // Step 0: Ensure lenders exist and fetch their IDs
    await insertLenders()
    
    // Step 1: Insert new builders only
    await insertBuildersAppend()
    
    // Step 2: Insert new projects only
    await insertProjectsAppend()
    
    // Step 3: Insert budgets for new projects only
    await insertBudgetsAppend()
    
    // Step 4: Insert draws for new projects only
    await insertDrawsAppend()
    
    // Step 5: Generate draw lines and wire batches (these work on all draws)
    await insertDrawLines()
    await insertWireBatches()
    await updateBudgetSpentAmounts()
    
    console.log('\n✅ New sample data appended!')
    console.log('\n📊 Summary:')
    console.log('   - 2 new builders (MCD Homes, Curtis Homes)')
    console.log('   - 22 new projects across Discovery West, Talline, Oak Ridge, Cedar Valley')
    console.log('   - 990 new budget lines (45 per project)')
    console.log('   - 60+ new draw requests with varied statuses')
    return
  }
  
  // Step 1: Clear all data
  await clearAllData()
  
  if (clearOnly) {
    console.log('\n✅ Data cleared! Use --verify to confirm.')
    return
  }
  
  // Step 2: Insert all sample data
  await insertLenders()
  await insertBuilders()
  await insertProjects()
  await insertBudgets()
  await insertDraws()
  await insertDrawLines()
  await insertWireBatches()
  await updateBudgetSpentAmounts()
  
  console.log('\n✅ All sample data inserted!')
  console.log('\n📝 Run verification: npx tsx scripts/seed-database.ts --verify')
}

main().catch(console.error)

