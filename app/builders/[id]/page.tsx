'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BuilderInfoCard } from '@/app/components/builders/BuilderInfoCard'
import { BuilderLoanGrid } from '@/app/components/builders/BuilderLoanGrid'
import { BuilderTimeline, type ProjectWithDraws, type DrawWithProject } from '@/app/components/builders/BuilderTimeline'
import { useNavigation } from '@/app/context/NavigationContext'
import { calculateLoanIncome, calculateIRR } from '@/lib/calculations'
import type { Builder, LifecycleStage, DrawRequest, Project, Lender } from '@/types/database'

type ProjectWithBudget = {
  id: string
  project_code: string | null
  name: string
  address: string | null
  builder_id: string | null
  subdivision_name: string | null
  subdivision_abbrev: string | null
  lot_number: string | null
  total_budget: number
  total_spent: number
  loan_amount: number | null
  lifecycle_stage: LifecycleStage
  appraised_value: number | null
  payoff_amount: number | null
  totalIncome?: number
  irr?: number | null
}

export default function BuilderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { setCurrentPageTitle } = useNavigation()
  const builderId = params.id as string

  const [builder, setBuilder] = useState<Builder | null>(null)
  const [projects, setProjects] = useState<ProjectWithBudget[]>([])
  const [projectsWithDraws, setProjectsWithDraws] = useState<ProjectWithDraws[]>([])
  const [stagedDraws, setStagedDraws] = useState<DrawWithProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBuilder()
  }, [builderId])

  // Update page title when builder loads
  useEffect(() => {
    if (builder) {
      setCurrentPageTitle(builder.company_name)
    }
  }, [builder, setCurrentPageTitle])

  async function loadBuilder() {
    try {
      // Fetch builder
      const { data: builderData, error: builderError } = await supabase
        .from('builders')
        .select('*')
        .eq('id', builderId)
        .single()

      if (builderError) throw builderError
      setBuilder(builderData)

      // Fetch projects for this builder WITH lender relation
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, lender:lenders(*)')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false })

      if (!projectsData) {
        setProjects([])
        setProjectsWithDraws([])
        return
      }

      // Get budget totals, draw data, and all draws for each project
      const projectsWithBudgets: ProjectWithBudget[] = []
      const projectsForTimeline: ProjectWithDraws[] = []

      await Promise.all(
        projectsData.map(async (project) => {
          // Get budgets
          const { data: budgets } = await supabase
            .from('budgets')
            .select('original_amount, current_amount, spent_amount')
            .eq('project_id', project.id)

          const totalBudget = budgets?.reduce((sum, b) => sum + (b.current_amount || 0), 0) || 0
          const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

          // Get ALL draws for this project (for timeline)
          const { data: drawsData } = await supabase
            .from('draw_requests')
            .select('*')
            .eq('project_id', project.id)
            .order('request_date', { ascending: true })

          const draws = drawsData || []

          // Get draws for historic projects (for income/IRR calculation)
          let totalIncome = 0
          let irr: number | null = null

          if (project.lifecycle_stage === 'historic') {
            // Calculate income and IRR
            const incomeResult = calculateLoanIncome(project, draws)
            totalIncome = incomeResult.total
            irr = calculateIRR(draws, project.payoff_amount, project.payoff_date)
          }

          // Add to both arrays
          projectsWithBudgets.push({
            id: project.id,
            project_code: project.project_code,
            name: project.name,
            address: project.address,
            builder_id: project.builder_id,
            subdivision_name: project.subdivision_name,
            subdivision_abbrev: project.subdivision_abbrev,
            lot_number: project.lot_number,
            loan_amount: project.loan_amount,
            appraised_value: project.appraised_value,
            payoff_amount: project.payoff_amount,
            lifecycle_stage: (project.lifecycle_stage || 'active') as LifecycleStage,
            total_budget: totalBudget,
            total_spent: totalSpent,
            totalIncome,
            irr,
          })

          // For timeline - include lender and draws
          projectsForTimeline.push({
            ...project,
            lender: (project as any).lender as Lender | null,
            draws: draws,
            total_budget: totalBudget,
            total_spent: totalSpent,
          })
        })
      )

      setProjects(projectsWithBudgets)
      setProjectsWithDraws(projectsForTimeline)

      // Fetch staged draws for this builder's projects
      const projectIds = projectsData.map(p => p.id)
      if (projectIds.length > 0) {
        const { data: stagedDrawsData } = await supabase
          .from('draw_requests')
          .select('*, projects(*)')
          .in('project_id', projectIds)
          .eq('status', 'staged')
          .order('created_at', { ascending: false })

        setStagedDraws(
          (stagedDrawsData || []).map(draw => ({
            ...draw,
            project: (draw as any).projects as Project
          }))
        )
      } else {
        setStagedDraws([])
      }
    } catch (error) {
      console.error('Error loading builder:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    )
  }

  if (!builder) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)]">
        <div
          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
          style={{ background: 'var(--bg-card)' }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Builder Not Found
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          This builder may have been deleted or you don't have access.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Builder title */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {builder.company_name}
              </h1>
              {builder.borrower_name && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {builder.borrower_name}
                </p>
              )}
            </div>

            {/* Quick stats and actions */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Total Loans
                </div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {projects.length}
                </div>
              </div>
              <div className="w-px h-10" style={{ background: 'var(--border)' }} />
              <div className="text-right">
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Active
                </div>
                <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                  {projects.filter((p) => p.lifecycle_stage === 'active').length}
                </div>
              </div>
              {/* New Draw Button - only show if builder has active loans */}
              {projects.some(p => p.lifecycle_stage === 'active') && (
                <>
                  <div className="w-px h-10" style={{ background: 'var(--border)' }} />
                  <button
                    onClick={() => router.push(`/draws/new?builder=${builderId}`)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Draw
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {/* Builder Information Card */}
        <BuilderInfoCard builder={builder} onDataRefresh={loadBuilder} />

        {/* Builder Timeline - NEW: Interactive timeline with Gantt/Spreadsheet views */}
        <BuilderTimeline
          builder={builder}
          projects={projectsWithDraws}
          stagedDraws={stagedDraws}
          onRefresh={loadBuilder}
        />

        {/* Loan Grid */}
        <BuilderLoanGrid projects={projects} builder={builder} />
      </div>
    </div>
  )
}
