'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project } from '@/types/database'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-primary-100 text-primary-700',
      on_hold: 'bg-amber-100 text-amber-700',
    }
    return classes[status] || 'bg-slate-100 text-slate-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-600 mt-1">Manage construction projects</p>
        </div>
        <a href="/projects/new" className="btn-primary">
          + New Project
        </a>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 mb-4">No projects yet</p>
          <a href="/projects/new" className="btn-primary">
            Create Your First Project
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-slate-900">{project.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              
              {project.address && (
                <p className="text-slate-600 text-sm mb-3">{project.address}</p>
              )}
              
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-500">Loan Amount</div>
                <div className="text-xl font-bold text-slate-900">
                  {formatCurrency(project.loan_amount)}
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <a
                  href={`/budgets?project=${project.id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View Budget →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

