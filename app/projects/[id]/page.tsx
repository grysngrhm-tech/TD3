'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoanPageTabs } from '@/app/components/projects/LoanPageTabs'
import type { Project, Budget, DrawRequest, LifecycleStage, Builder } from '@/types/database'

type ProjectWithLifecycle = Project & {
  lifecycle_stage: LifecycleStage
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectWithLifecycle | null>(null)
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [draws, setDraws] = useState<DrawRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      
      // Ensure lifecycle_stage has a default value
      const projectWithLifecycle: ProjectWithLifecycle = {
        ...projectData,
        lifecycle_stage: (projectData.lifecycle_stage || 'active') as LifecycleStage,
      }
      setProject(projectWithLifecycle)

      // Fetch builder if project has builder_id
      if (projectData.builder_id) {
        const { data: builderData } = await supabase
          .from('builders')
          .select('*')
          .eq('id', projectData.builder_id)
          .single()

        setBuilder(builderData || null)
      } else {
        setBuilder(null)
      }

      // Fetch budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      setBudgets(budgetsData || [])

      // Fetch draws
      const { data: drawsData } = await supabase
        .from('draw_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('draw_number', { ascending: false })

      setDraws(drawsData || [])
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStageLabel = (stage: LifecycleStage) => {
    switch (stage) {
      case 'pending':
        return 'In Origination'
      case 'active':
        return 'Active'
      case 'historic':
        return 'Completed'
      default:
        return 'Unknown'
    }
  }

  const getStageBadgeStyle = (stage: LifecycleStage) => {
    switch (stage) {
      case 'pending':
        return { background: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)' }
      case 'active':
        return { background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }
      case 'historic':
        return { background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' }
      default:
        return { background: 'var(--bg-hover)', color: 'var(--text-muted)' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)]">
        <div 
          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
          style={{ background: 'var(--bg-card)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Project Not Found
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          This project may have been deleted or you don't have access.
        </p>
      </div>
    )
  }

  const totalBudget = budgets.reduce((sum, b) => sum + (b.current_amount || 0), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)

  return (
    <div className="min-h-[calc(100vh-3.5rem)]" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Project title and stage */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {project.project_code || project.name}
                </h1>
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={getStageBadgeStyle(project.lifecycle_stage)}
                >
                  {getStageLabel(project.lifecycle_stage)}
                </span>
              </div>
              {/* Builder link and address */}
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                {builder && (
                  <>
                    <button
                      onClick={() => router.push(`/builders/${builder.id}`)}
                      className="hover:underline transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      {builder.company_name}
                    </button>
                    {project.address && <span>·</span>}
                  </>
                )}
                {project.address && <span>{project.address}</span>}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loan Amount</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(project.loan_amount)}
                </div>
              </div>
              {project.lifecycle_stage !== 'pending' && (
                <>
                  <div className="w-px h-10" style={{ background: 'var(--border)' }} />
                  <div className="text-right">
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Drawn</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                      {formatCurrency(totalSpent)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <LoanPageTabs
          project={project}
          budgets={budgets}
          draws={draws}
          builder={builder}
          onDataRefresh={() => {
            // Immediate refresh for direct updates (like lifecycle changes)
            loadProject()
            // Delayed refresh for any background processing (N8N workflows)
            setTimeout(() => loadProject(), 2000)
          }}
        />
      </div>
    </div>
  )
}
