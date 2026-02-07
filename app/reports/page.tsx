'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useNavigation } from '@/app/context/NavigationContext'
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner'
import type { Project } from '@/types/custom'

export default function ReportsPage() {
  const { setCurrentPageTitle } = useNavigation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('Reports')
  }, [setCurrentPageTitle])

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true })

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-600 mt-1">Generate and view project reports</p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Progress Budget Report */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Progress Budget Report</h3>
              <p className="text-sm text-slate-600 mt-1">
                View budget status by category with draw history and completion percentages.
              </p>
            </div>
          </div>
        </div>

        {/* Draw Summary Report (Placeholder) */}
        <div className="card opacity-60">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-500">Draw Summary Report</h3>
              <p className="text-sm text-slate-400 mt-1">
                Coming soon - Summary of all draws for a project.
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Report (Placeholder) */}
        <div className="card opacity-60">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-500">Invoice Report</h3>
              <p className="text-sm text-slate-400 mt-1">
                Coming soon - All invoices by vendor or category.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Generate Progress Budget Report</h2>
        
        {projects.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No projects found. Create a project first.
          </p>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-slate-900">{project.name}</h3>
                  <p className="text-sm text-slate-500">
                    {project.address || 'No address'}
                    {project.project_code && ` • ${project.project_code}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/reports/progress/${project.id}`}
                    className="btn-primary text-sm px-3 py-1.5"
                  >
                    View Report
                  </Link>
                  <a
                    href={`/api/reports/progress/${project.id}?format=html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Print
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

