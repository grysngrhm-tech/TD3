/**
 * TD3 Database Sample Data Seeder
 * 
 * This script provides instructions and verification for seeding the database.
 * The actual seeding must be done via Supabase SQL Editor due to the complexity
 * of the data and foreign key relationships.
 * 
 * Usage:
 *   npx tsx scripts/seed-database.ts          # Show instructions
 *   npx tsx scripts/seed-database.ts --verify # Verify seed data after running SQL
 * 
 * To seed the database:
 *   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/uewqcbmaiuofdfvqmbmq/sql
 *   2. Copy contents of scripts/seed-sample-data.sql
 *   3. Paste and click "Run"
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyData() {
  console.log('\n🔍 Verifying seed data...\n')
  
  // Check lenders
  const { data: lenders, error: lendersError } = await supabase
    .from('lenders')
    .select('id, name, code')
  
  if (lendersError) {
    console.error('❌ Error fetching lenders:', lendersError.message)
  } else {
    console.log(`📊 Lenders: ${lenders?.length || 0}`)
    lenders?.forEach(l => console.log(`   - ${l.name} (${l.code})`))
  }

  // Check builders
  const { data: builders, error: buildersError } = await supabase
    .from('builders')
    .select('id, company_name')
  
  if (buildersError) {
    console.error('❌ Error fetching builders:', buildersError.message)
  } else {
    console.log(`\n📊 Builders: ${builders?.length || 0}`)
    builders?.forEach(b => console.log(`   - ${b.company_name}`))
  }

  // Check projects by stage
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_code, lifecycle_stage, lender_id')
    .order('lifecycle_stage')
  
  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError.message)
  } else {
    const pending = projects?.filter(p => p.lifecycle_stage === 'pending') || []
    const active = projects?.filter(p => p.lifecycle_stage === 'active') || []
    const historic = projects?.filter(p => p.lifecycle_stage === 'historic') || []
    
    console.log(`\n📊 Projects: ${projects?.length || 0} total`)
    console.log(`   - Pending: ${pending.length}`)
    console.log(`   - Active: ${active.length}`)
    console.log(`   - Historic: ${historic.length}`)
    
    // Check lender distribution
    const td2Count = projects?.filter(p => p.lender_id?.includes('td2')).length || 0
    const tennbrookCount = projects?.filter(p => p.lender_id?.includes('tennbrook')).length || 0
    console.log(`\n   Lender Distribution:`)
    console.log(`   - TD2: ${td2Count}`)
    console.log(`   - TennBrook: ${tennbrookCount}`)
  }

  // Check budgets
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('project_id')
  
  if (budgetsError) {
    console.error('❌ Error fetching budgets:', budgetsError.message)
  } else {
    const projectBudgetCounts = budgets?.reduce((acc: Record<string, number>, b) => {
      acc[b.project_id] = (acc[b.project_id] || 0) + 1
      return acc
    }, {}) || {}
    
    console.log(`\n📊 Budget Lines: ${budgets?.length || 0} total`)
    console.log(`   Average per project: ${(budgets?.length || 0) / Object.keys(projectBudgetCounts).length || 0}`)
  }

  // Check draw requests
  const { data: draws, error: drawsError } = await supabase
    .from('draw_requests')
    .select('id, status')
  
  if (drawsError) {
    console.error('❌ Error fetching draws:', drawsError.message)
  } else {
    const statusCounts = draws?.reduce((acc: Record<string, number>, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {}) || {}
    
    console.log(`\n📊 Draw Requests: ${draws?.length || 0} total`)
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
  }

  // Check draw request lines
  const { data: lines, error: linesError } = await supabase
    .from('draw_request_lines')
    .select('id')
  
  if (linesError) {
    console.error('❌ Error fetching draw lines:', linesError.message)
  } else {
    console.log(`\n📊 Draw Request Lines: ${lines?.length || 0}`)
  }

  // Check wire batches
  const { data: batches, error: batchesError } = await supabase
    .from('wire_batches')
    .select('id, status')
  
  if (batchesError) {
    console.error('❌ Error fetching wire batches:', batchesError.message)
  } else {
    console.log(`\n📊 Wire Batches: ${batches?.length || 0}`)
  }

  console.log('\n')
}

function showInstructions() {
  const seedPath = path.join(__dirname, 'seed-sample-data.sql')
  const fileExists = fs.existsSync(seedPath)
  
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    TD3 Sample Data Seeding Instructions                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  The sample data must be loaded via Supabase SQL Editor due to the         ║
║  complexity of the data and foreign key relationships.                     ║
║                                                                            ║
║  STEPS TO SEED:                                                            ║
║  ─────────────                                                             ║
║  1. Open Supabase SQL Editor:                                              ║
║     https://supabase.com/dashboard/project/uewqcbmaiuofdfvqmbmq/sql        ║
║                                                                            ║
║  2. Copy the contents of:                                                  ║
║     scripts/seed-sample-data.sql                                           ║
║     ${fileExists ? '✅ File exists' : '❌ File not found!'}                                                     ║
║                                                                            ║
║  3. Paste into the SQL Editor and click "Run"                              ║
║                                                                            ║
║  4. Verify by running:                                                     ║
║     npx tsx scripts/seed-database.ts --verify                              ║
║                                                                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║                          WHAT GETS SEEDED                                  ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  • 2 Lenders: TD2 (primary), TennBrook (secondary)                         ║
║  • 3 Builders: Ridgeline, Westbrook, Horizon                               ║
║  • 12 Projects:                                                            ║
║    - 3 Pending (origination only, no draws)                                ║
║    - 6 Active (3-5 funded draws + 1 in review/staged)                      ║
║    - 3 Historic (5-7 funded draws, paid off)                               ║
║  • ~400 Budget lines (30-61 per project)                                   ║
║  • ~40 Draw requests with varied statuses                                  ║
║  • ~150 Draw request lines linked to budgets                               ║
║  • Wire batches for funded draws                                           ║
║                                                                            ║
║  Discovery West subdivision: 50% TD2, 50% TennBrook                        ║
║  Oak Ridge & Cedar Valley: 100% TD2                                        ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`)
}

async function main() {
  console.log('🚀 TD3 Database Seeder')
  console.log('========================')
  console.log('🔗 Connected to:', supabaseUrl)
  
  const args = process.argv.slice(2)
  
  if (args.includes('--verify')) {
    await verifyData()
  } else {
    showInstructions()
  }
}

main()
