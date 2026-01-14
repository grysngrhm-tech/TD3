'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logAuditEvent } from '@/lib/audit'
import { useNavigation } from '@/app/context/NavigationContext'
import type { Project } from '@/types/database'

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { setCurrentPageTitle } = useNavigation()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [status, setStatus] = useState<'active' | 'completed' | 'on_hold'>('active')
  const [projectCode, setProjectCode] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [borrowerName, setBorrowerName] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [loanTermMonths, setLoanTermMonths] = useState('')
  const [loanStartDate, setLoanStartDate] = useState('')
  const [maturityDate, setMaturityDate] = useState('')

  useEffect(() => {
    loadProject()
  }, [projectId])

  // Update page title when project loads
  useEffect(() => {
    if (project) {
      setCurrentPageTitle(`Edit ${project.project_code || project.name}`)
    }
  }, [project, setCurrentPageTitle])

  async function loadProject() {
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (fetchError) throw fetchError

      const projectData = data as Project
      setProject(projectData)
      // Populate form
      setName(projectData.name)
      setAddress(projectData.address || '')
      setLoanAmount(projectData.loan_amount?.toString() || '')
      setStatus((projectData.status || 'active') as 'active' | 'completed' | 'on_hold')
      setProjectCode(projectData.project_code || '')
      setBuilderName(projectData.builder_name || '')
      setBorrowerName(projectData.borrower_name || '')
      setInterestRate(projectData.interest_rate_annual ? (projectData.interest_rate_annual * 100).toString() : '')
      setLoanTermMonths(projectData.loan_term_months?.toString() || '')
      setLoanStartDate(projectData.loan_start_date || '')
      setMaturityDate(projectData.maturity_date || '')
    } catch (error) {
      console.error('Error loading project:', error)
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const updates = {
      name,
      address: address || null,
      loan_amount: loanAmount ? parseFloat(loanAmount) : null,
      status,
      project_code: projectCode || null,
      builder_name: builderName || null,
      borrower_name: borrowerName || null,
      interest_rate_annual: interestRate ? parseFloat(interestRate) / 100 : null,
      loan_term_months: loanTermMonths ? parseInt(loanTermMonths) : null,
      loan_start_date: loanStartDate || null,
      maturity_date: maturityDate || null,
    }

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)

      if (updateError) throw updateError

      // Log audit event
      await logAuditEvent({
        entityType: 'project',
        entityId: projectId,
        action: 'updated',
        oldData: project as Record<string, unknown>,
        newData: updates,
      })

      router.push(`/projects/${projectId}`)
    } catch (err) {
      console.error('Error updating project:', err)
      setError('Failed to update project. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Project Not Found</h2>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Project</h1>
        <p className="text-slate-600 mt-1">Update project details and loan information</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900">Basic Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Code
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="e.g., PRJ-001"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="input"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* People */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900">People</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Builder Name
              </label>
              <input
                type="text"
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Borrower Name
              </label>
              <input
                type="text"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Loan Details */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900">Loan Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Loan Amount
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                min="0"
                step="1000"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g., 8.5"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Loan Term (months)
              </label>
              <input
                type="number"
                value={loanTermMonths}
                onChange={(e) => setLoanTermMonths(e.target.value)}
                min="1"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={loanStartDate}
                onChange={(e) => setLoanStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Maturity Date
              </label>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !name}
            className="btn-primary flex-1"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
          <a
            href={`/projects/${projectId}`}
            className="btn-secondary flex-1 text-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}

