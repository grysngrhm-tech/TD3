'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FilterSidebar } from '@/app/components/ui/FilterSidebar'
import { ProjectTile } from '@/app/components/ui/ProjectTile'
import { StageSelector } from '@/app/components/ui/StageSelector'
import { StageStatsBar } from '@/app/components/ui/StageStatsBar'
import { DashboardHeader } from '@/app/components/ui/DashboardHeader'
import { useFilters } from '@/app/hooks/useFilters'
import { useNavigation } from '@/app/context/NavigationContext'
import { calculateLoanIncome, calculateIRR } from '@/lib/calculations'
import type { LifecycleStage, Builder, Lender, DrawRequest } from '@/types/database'

type ProjectWithBudget = {
  id: string
  project_code: string | null
  name: string
  address: string | null
  loan_amount: number | null
  status: string
  lifecycle_stage: LifecycleStage
  builder_id: string | null
  lender_id: string | null
  subdivision_name: string | null
  subdivision_abbrev: string | null
  lot_number: string | null
  total_budget: number
  total_spent: number
  appraised_value: number | null
  sales_price: number | null
  square_footage: number | null
  origination_fee_pct: number | null
  interest_rate_annual: number | null
  loan_start_date: string | null
  payoff_date: string | null
  payoff_amount: number | null
  builder?: Builder | null
  lender?: Lender | null
  draws?: DrawRequest[]
  totalIncome?: number
  irr?: number | null
}

export default function Dashboard() {
  const router = useRouter()
  const { setLastDashboard, setCurrentPageTitle } = useNavigation()
  const [projects, setProjects] = useState<ProjectWithBudget[]>([])
  const [builders, setBuilders] = useState<Builder[]>([])
  const [lenders, setLenders] = useState<Lender[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<LifecycleStage>('active')
  const { filters, toggleFilter, clearAll, clearSection } = useFilters()

  // Register this as the Portfolio dashboard
  useEffect(() => {
    setLastDashboard('portfolio')
    setCurrentPageTitle('Portfolio')
  }, [setLastDashboard, setCurrentPageTitle])

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
      const builderMap = new Map(buildersData?.map(b => [b.id, b]) || [])

      // Fetch lenders
      const { data: lendersData } = await supabase
        .from('lenders')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      setLenders(lendersData || [])
      const lenderMap = new Map(lendersData?.map(l => [l.id, l]) || [])

      // Get projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (!projectsData) {
        setProjects([])
        return
      }

      // Get budget totals and draw requests for each project
      const projectsWithBudgets = await Promise.all(
        projectsData.map(async (project) => {
          // Get budgets
          const { data: budgets } = await supabase
            .from('budgets')
            .select('original_amount, current_amount, spent_amount')
            .eq('project_id', project.id)

          const totalBudget = budgets?.reduce((sum, b) => sum + (b.current_amount || 0), 0) || 0
          const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

          // Get draws for historic projects (for income/IRR calculation)
          let draws: DrawRequest[] = []
          let totalIncome = 0
          let irr: number | null = null

          if (project.lifecycle_stage === 'historic') {
            const { data: drawsData } = await supabase
              .from('draw_requests')
              .select('*')
              .eq('project_id', project.id)
              .order('request_date', { ascending: true })

            draws = drawsData || []

            // Calculate income and IRR
            const incomeResult = calculateLoanIncome(project, draws)
            totalIncome = incomeResult.total
            irr = calculateIRR(draws, project.payoff_amount, project.payoff_date)
          }

          return {
            ...project,
            lifecycle_stage: (project.lifecycle_stage || 'active') as LifecycleStage,
            total_budget: totalBudget,
            total_spent: totalSpent,
            builder: project.builder_id ? builderMap.get(project.builder_id) || null : null,
            lender: project.lender_id ? lenderMap.get(project.lender_id) || null : null,
            draws,
            totalIncome,
            irr,
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

  // Build filter sections with cross-filtering
  // Each category's options are filtered by the OTHER categories' selections
  const filterSections = useMemo(() => {
    // Helper to check if a project matches specific filters
    const matchesFilters = (
      p: ProjectWithBudget,
      checkBuilder: boolean,
      checkSubdiv: boolean,
      checkLender: boolean
    ) => {
      if (checkBuilder && filters.builder?.length > 0) {
        if (!p.builder_id || !filters.builder.includes(p.builder_id)) return false
      }
      if (checkSubdiv && filters.subdivision?.length > 0) {
        if (!p.subdivision_name || !filters.subdivision.includes(p.subdivision_name)) return false
      }
      if (checkLender && filters.lender?.length > 0) {
        if (!p.lender_id || !filters.lender.includes(p.lender_id)) return false
      }
      return true
    }

    // Get all unique options first (for showing disabled state)
    const allBuilders = new Map<string, string>()
    const allSubdivisions = new Set<string>()
    const allLenders = new Map<string, string>()

    projectsInStage.forEach(p => {
      if (p.builder_id && p.builder) {
        allBuilders.set(p.builder_id, p.builder.company_name)
      }
      if (p.subdivision_name) {
        allSubdivisions.add(p.subdivision_name)
      }
      if (p.lender_id && p.lender) {
        allLenders.set(p.lender_id, p.lender.name)
      }
    })

    // Builder options: count from projects matching subdivision AND lender filters
    const builderCounts = new Map<string, number>()
    projectsInStage.forEach(p => {
      if (p.builder_id && matchesFilters(p, false, true, true)) {
        builderCounts.set(p.builder_id, (builderCounts.get(p.builder_id) || 0) + 1)
      }
    })

    // Subdivision options: count from projects matching builder AND lender filters
    const subdivisionCounts = new Map<string, number>()
    projectsInStage.forEach(p => {
      if (p.subdivision_name && matchesFilters(p, true, false, true)) {
        subdivisionCounts.set(p.subdivision_name, (subdivisionCounts.get(p.subdivision_name) || 0) + 1)
      }
    })

    // Lender options: count from projects matching builder AND subdivision filters
    const lenderCounts = new Map<string, number>()
    projectsInStage.forEach(p => {
      if (p.lender_id && matchesFilters(p, true, true, false)) {
        lenderCounts.set(p.lender_id, (lenderCounts.get(p.lender_id) || 0) + 1)
      }
    })

    return {
      builder: Array.from(allBuilders.entries()).map(([id, name]) => ({
        id,
        label: name,
        count: builderCounts.get(id) || 0,
        disabled: (builderCounts.get(id) || 0) === 0,
      })),
      subdivision: Array.from(allSubdivisions).map(name => ({
        id: name,
        label: name,
        count: subdivisionCounts.get(name) || 0,
        disabled: (subdivisionCounts.get(name) || 0) === 0,
      })),
      lender: Array.from(allLenders.entries()).map(([id, name]) => ({
        id,
        label: name,
        count: lenderCounts.get(id) || 0,
        disabled: (lenderCounts.get(id) || 0) === 0,
      })),
    }
  }, [projectsInStage, filters])

  // Apply additional filters
  const filteredProjects = useMemo(() => {
    return projectsInStage.filter(project => {
      // Builder filter
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
      // Lender filter
      if (filters.lender?.length > 0) {
        if (!project.lender_id || !filters.lender.includes(project.lender_id)) {
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

  // Prepare stats data for StageStatsBar
  const statsData = useMemo(() => {
    return filteredProjects.map(p => ({
      id: p.id,
      loan_amount: p.loan_amount,
      appraised_value: p.appraised_value,
      total_budget: p.total_budget,
      total_spent: p.total_spent,
      totalIncome: p.totalIncome,
      irr: p.irr,
    }))
  }, [filteredProjects])

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
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
        onClearSection={clearSection}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Dashboard Header */}
          <DashboardHeader
            title="Portfolio Dashboard"
            subtitle="Manage construction loans and track performance"
            toggleElement={
              <StageSelector
                value={selectedStage}
                onChange={setSelectedStage}
                counts={stageCounts}
              />
            }
            actions={null}
          />

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

          {/* Stats Bar with Nav Button */}
          <div className="mb-6">
            <StageStatsBar
              stage={selectedStage}
              projects={statsData}
              navButton={{
                href: '/staging',
                label: 'Draw Dashboard',
                icon: 'chart',
                position: 'right'
              }}
            />
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
                  payoffAmount={project.payoff_amount}
                  totalIncome={project.totalIncome}
                  irr={project.irr}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
