import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Inserting wire batches...')
  
  // Get builders
  const { data: builders } = await supabase.from('builders').select('id, company_name')
  console.log('Found', builders?.length, 'builders')
  
  if (!builders || builders.length === 0) {
    console.log('No builders found!')
    return
  }
  
  // Get funded draws with project info
  const { data: fundedDraws } = await supabase
    .from('draw_requests')
    .select('id, project_id, total_amount, funded_at, projects(builder_id)')
    .eq('status', 'funded')
  
  console.log('Found', fundedDraws?.length, 'funded draws')
  
  if (!fundedDraws || fundedDraws.length === 0) {
    console.log('No funded draws!')
    return
  }
  
  // Group by builder
  const byBuilder: Map<string, any[]> = new Map()
  for (const draw of fundedDraws) {
    const builderId = (draw.projects as any)?.builder_id
    if (!builderId) continue
    if (!byBuilder.has(builderId)) byBuilder.set(builderId, [])
    byBuilder.get(builderId)!.push(draw)
  }
  
  console.log('Grouped into', byBuilder.size, 'builders')
  
  // Create wire batches - one per builder
  const batches: any[] = []
  let counter = 0
  
  for (const [builderId, draws] of byBuilder) {
    counter++
    const totalAmount = draws.reduce((sum, d) => sum + d.total_amount, 0)
    const fundedAt = draws[0].funded_at
    
    batches.push({
      builder_id: builderId,
      total_amount: totalAmount,
      status: 'funded',
      submitted_at: fundedAt,
      funded_at: fundedAt,
      wire_reference: `WR${String(counter).padStart(6, '0')}`,
      notes: `Wire batch for ${draws.length} funded draw(s)`
    })
  }
  
  console.log('Inserting', batches.length, 'batches...')
  
  const { data, error } = await supabase.from('wire_batches').insert(batches).select()
  
  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('Success! Inserted', data?.length, 'wire batches')
  }
}

main()

