'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FilterSidebar } from '@/app/components/ui/FilterSidebar'
import { ProjectTile } from '@/app/components/ui/ProjectTile'
import { StageSelector } from '@/app/components/ui/StageSelector'
import { ImportPreview } from '@/app/components/import/ImportPreview'
import { toast } from '@/app/components/ui/Toast'
import { useFilters } from '@/app/hooks/useFilters'
import type { LifecycleStage, Builder } from '@/types/database'

type ProjectWithBudget = {
  id: string
  project_code: string | null
  name: string
  address: string | null
  loan_amount: number | null
  status: string
  lifecycle_stage: LifecycleStage
  builder_id: string | null
  subdivision_name: string | null
  subdivision_abbrev: string | null
  lot_number: string | null
  total_budget: number
  total_spent: number
  appraised_value: number | null
  sales_price: number | null
  square_footage: number | null
  builder?: Builder | null
}

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithBudget[]>([])
  const [builders, setBuilders] = useState<Builder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<LifecycleStage>('active')
  const [importModal, setImportModal] = useState<'budget' | 'draw' | null>(null)
  const { filters, toggleFilter, clearAll } = useFilters()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Fetch builders
      const { data: buildersData } = await supabase
        .from('builders')
        .select('*')
        .order('company_name', { ascending: true })

      setBuilders(buildersData || [])

      // Create a map for quick builder lookup
      const builderMap = new Map(buildersData?.map(b => [b.id, b]) || [])

      // Get projects with budget totals
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (!projectsData) {
        setProjects([])
        return
      }

      // Get budget totals for each project
      const projectsWithBudgets = await Promise.all(
        projectsData.map(async (project) => {
          const { data: budgets } = await supabase
            .from('budgets')
            .select('original_amount, current_amount, spent_amount')
            .eq('project_id', project.id)

          const totalBudget = budgets?.reduce((sum, b) => sum + (b.current_amount || 0), 0) || 0
          const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

          return {
            ...project,
            lifecycle_stage: (project.lifecycle_stage || 'active') as LifecycleStage,
            total_budget: totalBudget,
            total_spent: totalSpent,
            builder: project.builder_id ? builderMap.get(project.builder_id) || null : null,
          }
        })
      )

      setProjects(projectsWithBudgets)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stage counts for StageSelector
  const stageCounts = useMemo(() => {
    return projects.reduce(
      (acc, p) => {
        const stage = p.lifecycle_stage || 'active'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      },
      { pending: 0, active: 0, historic: 0 }
    )
  }, [projects])

  // Filter by lifecycle stage first
  const projectsInStage = useMemo(() => {
    return projects.filter(p => p.lifecycle_stage === selectedStage)
  }, [projects, selectedStage])

  // Build filter sections from data (within selected stage)
  const filterSections = useMemo(() => {
    const builderCounts = new Map<string, { name: string; count: number }>()
    const subdivisions = new Map<string, number>()

    projectsInStage.forEach(p => {
      if (p.builder_id && p.builder) {
        const existing = builderCounts.get(p.builder_id)
        if (existing) {
          existing.count++
        } else {
          builderCounts.set(p.builder_id, { name: p.builder.company_name, count: 1 })
        }
      }
      if (p.subdivision_name) {
        subdivisions.set(p.subdivision_name, (subdivisions.get(p.subdivision_name) || 0) + 1)
      }
    })

    return [
      {
        id: 'builder',
        title: 'Builder',
        type: 'multi' as const,
        options: Array.from(builderCounts.entries()).map(([id, { name, count }]) => ({
          id,
          label: name,
          count,
        })),
      },
      {
        id: 'subdivision',
        title: 'Subdivision',
        type: 'multi' as const,
        options: Array.from(subdivisions.entries()).map(([name, count]) => ({
          id: name,
          label: name,
          count,
        })),
      },
    ]
  }, [projectsInStage])

  // Apply additional filters
  const filteredProjects = useMemo(() => {
    return projectsInStage.filter(project => {
      // Builder filter (now using builder_id)
      if (filters.builder?.length > 0) {
        if (!project.builder_id || !filters.builder.includes(project.builder_id)) {
          return false
        }
      }
      // Subdivision filter
      if (filters.subdivision?.length > 0) {
        if (!project.subdivision_name || !filters.subdivision.includes(project.subdivision_name)) {
          return false
        }
      }
      return true
    })
  }, [projectsInStage, filters])

  // Get the selected builder info if exactly one is selected
  const selectedBuilder = useMemo(() => {
    if (filters.builder?.length === 1) {
      return builders.find(b => b.id === filters.builder[0]) || null
    }
    return null
  }, [filters.builder, builders])

  // Calculate totals for current view
  const totals = useMemo(() => {
    return filteredProjects.reduce(
      (acc, p) => ({
        budget: acc.budget + p.total_budget,
        spent: acc.spent + p.total_spent,
        count: acc.count + 1,
      }),
      { budget: 0, spent: 0, count: 0 }
    )
  }, [filteredProjects])

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleImportSuccess = () => {
    toast({
      type: 'success',
      title: importModal === 'budget' ? 'Budget Submitted' : 'Draw Submitted',
      message: 'Data sent to processing workflow. Refresh in a moment to see updates.'
    })
    setTimeout(() => loadData(), 2000)
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  // Stage-specific labels
  const stageLabels = {
    pending: { title: 'Loans in Origination', stat: 'Pipeline Value' },
    active: { title: 'Active Loans', stat: 'Total Drawn' },
    historic: { title: 'Historical Loans', stat: 'Total Funded' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <FilterSidebar
        sections={filterSections}
        selectedFilters={filters}
        onFilterChange={toggleFilter}
        onClearAll={clearAll}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Stage Selector */}
          <div className="flex items-center justify-center mb-6">
            <StageSelector
              value={selectedStage}
              onChange={setSelectedStage}
              counts={stageCounts}
            />
          </div>

          {/* Builder Navigation Banner - shown when exactly one builder is filtered */}
          {selectedBuilder && (
            <div 
              className="mb-6 p-4 rounded-ios-sm flex items-center justify-between"
              style={{ background: 'var(--bg-card)', borderLeft: '4px solid var(--accent)' }}
            >
              <div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Showing loans for
                </div>
                <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {selectedBuilder.company_name}
                </div>
              </div>
              <button
                onClick={() => router.push(`/builders/${selectedBuilder.id}`)}
                className="btn-primary flex items-center gap-2"
              >
                View Builder Page
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Stats Bar */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {selectedStage === 'pending' ? 'In Pipeline' : selectedStage === 'active' ? 'Active Loans' : 'Completed'}
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totals.count}</div>
            </div>
            <div className="w-px h-10" style={{ background: 'var(--border)' }} />
            <div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Budget</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.budget)}</div>
            </div>
            <div className="w-px h-10" style={{ background: 'var(--border)' }} />
            <div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{stageLabels[selectedStage].stat}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(totals.spent)}</div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => router.push('/projects/new')}
                className="btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Loan
              </button>
              {selectedStage === 'active' && (
                <button 
                  onClick={() => setImportModal('draw')}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Draw
                </button>
              )}
            </div>
          </div>

          {/* Project Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--bg-card)' }}
              >
                <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                No {selectedStage} loans found
              </h3>
              <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                {Object.values(filters).some(f => f.length > 0) 
                  ? 'Try adjusting your filters'
                  : selectedStage === 'pending' 
                    ? 'Start a new loan to begin origination'
                    : selectedStage === 'active'
                      ? 'No active loans at this time'
                      : 'No completed loans yet'}
              </p>
              {selectedStage === 'pending' && (
                <button onClick={() => router.push('/projects/new')} className="btn-primary">
                  New Loan
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectTile
                  key={project.id}
                  id={project.id}
                  projectCode={project.project_code || project.name}
                  address={project.address}
                  builderName={project.builder?.company_name || null}
                  builderId={project.builder_id}
                  subdivisionName={project.subdivision_name}
                  totalBudget={project.total_budget}
                  totalSpent={project.total_spent}
                  loanAmount={project.loan_amount}
                  lifecycleStage={project.lifecycle_stage}
                  appraisedValue={project.appraised_value}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Modals */}
      <ImportPreview
        isOpen={importModal === 'budget'}
        onClose={() => setImportModal(null)}
        onSuccess={handleImportSuccess}
        importType="budget"
      />
      <ImportPreview
        isOpen={importModal === 'draw'}
        onClose={() => setImportModal(null)}
        onSuccess={handleImportSuccess}
        importType="draw"
      />
    </div>
  )
}
