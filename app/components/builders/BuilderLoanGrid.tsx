'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectTile } from '@/app/components/ui/ProjectTile'
import { StageSelector } from '@/app/components/ui/StageSelector'
import type { LifecycleStage, Builder } from '@/types/database'

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
  loan_amount?: number | null
  lifecycle_stage: LifecycleStage
  appraised_value?: number | null
  payoff_amount?: number | null
  builder?: Builder | null
}

type BuilderLoanGridProps = {
  projects: ProjectWithBudget[]
  builder: Builder
}

export function BuilderLoanGrid({ projects, builder }: BuilderLoanGridProps) {
  const router = useRouter()
  const [selectedStage, setSelectedStage] = useState<LifecycleStage>('active')

  // Calculate stage counts
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

  // Filter projects by selected stage
  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.lifecycle_stage === selectedStage)
  }, [projects, selectedStage])

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

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  // Stage-specific labels
  const stageLabels = {
    pending: { title: 'In Origination', stat: 'Pipeline Value' },
    active: { title: 'Active Loans', stat: 'Total Drawn' },
    historic: { title: 'Completed Loans', stat: 'Total Funded' },
  }

  const totalProjects = stageCounts.pending + stageCounts.active + stageCounts.historic

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          Loans
          <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
            {totalProjects} total
          </span>
        </h3>
      </div>

      {/* Stage Selector */}
      <div className="flex items-center justify-center">
        <StageSelector
          value={selectedStage}
          onChange={setSelectedStage}
          counts={stageCounts}
        />
      </div>

      {/* Stats Bar */}
      {filteredProjects.length > 0 && (
        <div 
          className="flex items-center gap-6 p-4 rounded-ios-sm"
          style={{ background: 'var(--bg-card)' }}
        >
          <div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {stageLabels[selectedStage].title}
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {totals.count}
            </div>
          </div>
          <div className="w-px h-10" style={{ background: 'var(--border)' }} />
          <div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Budget</div>
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totals.budget)}
            </div>
          </div>
          <div className="w-px h-10" style={{ background: 'var(--border)' }} />
          <div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {stageLabels[selectedStage].stat}
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatCurrency(totals.spent)}
            </div>
          </div>
        </div>
      )}

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div 
          className="text-center py-12 rounded-ios-sm"
          style={{ background: 'var(--bg-card)' }}
        >
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--bg-hover)' }}
          >
            <svg
              className="w-6 h-6"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            No {selectedStage} loans
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedStage === 'pending'
              ? 'Create a new loan to start origination'
              : selectedStage === 'active'
              ? 'No active loans for this builder'
              : 'No completed loans yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectTile
              key={project.id}
              id={project.id}
              projectCode={project.project_code || project.name}
              address={project.address}
              builderName={builder.company_name}
              builderId={builder.id}
              subdivisionName={project.subdivision_name}
              totalBudget={project.total_budget}
              totalSpent={project.total_spent}
              loanAmount={project.loan_amount}
              lifecycleStage={project.lifecycle_stage}
              appraisedValue={project.appraised_value}
              payoffAmount={project.payoff_amount}
              onClick={() => handleProjectClick(project.id)}
              hideBuilderLink // Don't show builder link since we're already on builder page
            />
          ))}
        </div>
      )}
    </div>
  )
}
