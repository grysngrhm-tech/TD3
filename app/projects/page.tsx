'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useNavigation } from '@/app/context/NavigationContext'
import { Project } from '@/types/database'

export default function ProjectsPage() {
  const { setCurrentPageTitle } = useNavigation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('All Projects')
  }, [setCurrentPageTitle])

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

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { background: string; color: string }> = {
      active: { background: 'var(--success-muted)', color: 'var(--success)' },
      completed: { background: 'var(--accent-muted)', color: 'var(--accent)' },
      on_hold: { background: 'var(--warning-muted)', color: 'var(--warning)' },
    }
    return styles[status] || { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div 
          className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projects</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Manage construction projects</p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          + New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
          <Link href="/projects/new" className="btn-primary">
            Create Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const statusStyle = getStatusStyle(project.status)
            return (
              <div key={project.id} className="card hover:shadow-elevation-3 transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={statusStyle}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                
                {project.address && (
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{project.address}</p>
                )}
                
                <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loan Amount</div>
                  <div className="text-xl font-bold financial-value" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(project.loan_amount)}
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/budgets?project=${project.id}`}
                    className="text-sm font-medium transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    View Budget →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

