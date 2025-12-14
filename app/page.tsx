'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { FilterSidebar } from '@/app/components/ui/FilterSidebar'
import { ProjectTile } from '@/app/components/ui/ProjectTile'
import { DetailPanel } from '@/app/components/ui/DetailPanel'
import { ImportPreview } from '@/app/components/import/ImportPreview'
import { useFilters } from '@/app/hooks/useFilters'

type ProjectWithBudget = {
  id: string
  project_code: string | null
  name: string
  address: string | null
  loan_amount: number | null
  status: string
  builder_name: string | null
  subdivision_name: string | null
  subdivision_abbrev: string | null
  lot_number: string | null
  total_budget: number
  total_spent: number
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const { filters, toggleFilter, clearAll } = useFilters()

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
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
            total_budget: totalBudget,
            total_spent: totalSpent,
          }
        })
      )

      setProjects(projectsWithBudgets)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Build filter sections from data
  const filterSections = useMemo(() => {
    const builders = new Map<string, number>()
    const subdivisions = new Map<string, number>()
    const statuses = new Map<string, number>()

    projects.forEach(p => {
      if (p.builder_name) {
        builders.set(p.builder_name, (builders.get(p.builder_name) || 0) + 1)
      }
      if (p.subdivision_name) {
        subdivisions.set(p.subdivision_name, (subdivisions.get(p.subdivision_name) || 0) + 1)
      }
      if (p.status) {
        statuses.set(p.status, (statuses.get(p.status) || 0) + 1)
      }
    })

    return [
      {
        id: 'builder',
        title: 'Builder',
        type: 'multi' as const,
        options: Array.from(builders.entries()).map(([name, count]) => ({
          id: name,
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
      {
        id: 'status',
        title: 'Status',
        type: 'multi' as const,
        options: Array.from(statuses.entries()).map(([name, count]) => ({
          id: name,
          label: name.replace('_', ' '),
          count,
        })),
      },
    ]
  }, [projects])

  // Apply filters
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Builder filter
      if (filters.builder?.length > 0) {
        if (!project.builder_name || !filters.builder.includes(project.builder_name)) {
          return false
        }
      }
      // Subdivision filter
      if (filters.subdivision?.length > 0) {
        if (!project.subdivision_name || !filters.subdivision.includes(project.subdivision_name)) {
          return false
        }
      }
      // Status filter
      if (filters.status?.length > 0) {
        if (!project.status || !filters.status.includes(project.status)) {
          return false
        }
      }
      return true
    })
  }, [projects, filters])

  // Calculate totals
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

  const handleImport = async (data: {
    categories: string[]
    budgetAmounts: number[]
    drawAmounts: { drawNumber: number; amounts: number[] }[]
  }) => {
    // For now, just log the data - this will be sent to n8n workflow
    console.log('Import data:', data)
    // TODO: Send to n8n workflow for processing
    alert(`Parsed ${data.categories.length} line items. n8n workflow integration coming soon!`)
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
          {/* Stats Bar */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Projects</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totals.count}</div>
            </div>
            <div className="w-px h-10" style={{ background: 'var(--border)' }} />
            <div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Budget</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.budget)}</div>
            </div>
            <div className="w-px h-10" style={{ background: 'var(--border)' }} />
            <div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Drawn</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(totals.spent)}</div>
            </div>
            <div className="flex-1" />
            <button 
              onClick={() => setShowImport(true)}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Budget
            </button>
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
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No projects found</h3>
              <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                {Object.values(filters).some(f => f.length > 0) 
                  ? 'Try adjusting your filters'
                  : 'Upload a budget to get started'}
              </p>
              <button className="btn-primary">Upload Budget</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectTile
                  key={project.id}
                  id={project.id}
                  projectCode={project.project_code || project.name}
                  address={project.address}
                  builderName={project.builder_name}
                  subdivisionName={project.subdivision_name}
                  totalBudget={project.total_budget}
                  totalSpent={project.total_spent}
                  status={project.status || 'active'}
                  onClick={() => setSelectedProject(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel 
        projectId={selectedProject} 
        onClose={() => setSelectedProject(null)} 
      />

      {/* Import Modal */}
      <ImportPreview
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        importType="budget"
      />
    </div>
  )
}
