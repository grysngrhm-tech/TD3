'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectTile } from '@/app/components/ui/ProjectTile'
import { StageSelector } from '@/app/components/ui/StageSelector'
import { StageStatsBar } from '@/app/components/ui/StageStatsBar'
import type { LifecycleStage, Builder } from '@/types/custom'

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
  totalIncome?: number
  irr?: number | null
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

  // Prepare stats data for StageStatsBar
  const statsData = useMemo(() => {
    return filteredProjects.map(p => ({
      id: p.id,
      loan_amount: p.loan_amount || null,
      appraised_value: p.appraised_value || null,
      total_budget: p.total_budget,
      total_spent: p.total_spent,
      totalIncome: p.totalIncome,
      irr: p.irr,
    }))
  }, [filteredProjects])

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const totalProjects = stageCounts.pending + stageCounts.active + stageCounts.historic

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-text-primary">
          Loans
          <span className="text-sm font-normal ml-2 text-text-muted">
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
        <StageStatsBar
          stage={selectedStage}
          projects={statsData}
        />
      )}

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div 
          className="text-center py-12 rounded-ios-sm bg-background-card"
        >
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-background-hover"
          >
            <svg
              className="w-6 h-6 text-text-muted"
              
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
          <p className="font-medium text-text-primary">
            No {selectedStage} loans
          </p>
          <p className="text-sm mt-1 text-text-muted">
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
              totalIncome={project.totalIncome}
              irr={project.irr}
              onClick={() => handleProjectClick(project.id)}
              hideBuilderLink // Don't show builder link since we're already on builder page
            />
          ))}
        </div>
      )}
    </div>
  )
}
