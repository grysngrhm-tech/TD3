'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BuilderInfoCard } from '@/app/components/builders/BuilderInfoCard'
import { BuilderLoanGrid } from '@/app/components/builders/BuilderLoanGrid'
import { calculateLoanIncome, calculateIRR } from '@/lib/calculations'
import type { Builder, LifecycleStage, DrawRequest } from '@/types/database'

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
  const builderId = params.id as string

  const [builder, setBuilder] = useState<Builder | null>(null)
  const [projects, setProjects] = useState<ProjectWithBudget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBuilder()
  }, [builderId])

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

      // Fetch projects for this builder
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false })

      if (!projectsData) {
        setProjects([])
        return
      }

      // Get budget totals and draw data for each project
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
          let totalIncome = 0
          let irr: number | null = null

          if (project.lifecycle_stage === 'historic') {
            const { data: drawsData } = await supabase
              .from('draw_requests')
              .select('*')
              .eq('project_id', project.id)
              .order('request_date', { ascending: true })

            const draws = drawsData || []

            // Calculate income and IRR
            const incomeResult = calculateLoanIncome(project, draws)
            totalIncome = incomeResult.total
            irr = calculateIRR(draws, project.payoff_amount, project.payoff_date)
          }

          return {
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
          }
        })
      )

      setProjects(projectsWithBudgets)
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
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          This builder may have been deleted or you don't have access.
        </p>
        <button onClick={() => router.push('/')} className="btn-primary">
          Back to Dashboard
        </button>
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
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-sm mb-4 transition-colors hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </button>

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

            {/* Quick stats */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {/* Builder Information Card */}
        <BuilderInfoCard builder={builder} onDataRefresh={loadBuilder} />

        {/* Loan Grid */}
        <BuilderLoanGrid projects={projects} builder={builder} />
      </div>
    </div>
  )
}
