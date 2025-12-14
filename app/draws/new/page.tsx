'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project, Budget, DrawRequestInsert, DrawRequestLineInsert } from '@/types/database'

type DrawLine = {
  budget_id: string
  category: string
  remaining: number
  amount: string
}

export default function NewDrawPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [nextDrawNumber, setNextDrawNumber] = useState(1)
  const [notes, setNotes] = useState('')
  const [drawLines, setDrawLines] = useState<DrawLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectData()
    }
  }, [selectedProject])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name')
    setProjects(data || [])
  }

  async function loadProjectData() {
    // Load budgets for selected project
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .eq('project_id', selectedProject)
      .order('sort_order')

    setBudgets(budgetData || [])

    // Initialize draw lines from budgets
    setDrawLines(
      (budgetData || []).map((b) => ({
        budget_id: b.id,
        category: b.category,
        remaining: b.remaining_amount,
        amount: '',
      }))
    )

    // Get next draw number
    const { data: lastDraw } = await supabase
      .from('draw_requests')
      .select('draw_number')
      .eq('project_id', selectedProject)
      .order('draw_number', { ascending: false })
      .limit(1)
      .single()

    setNextDrawNumber((lastDraw?.draw_number || 0) + 1)
  }

  const updateLineAmount = (budgetId: string, amount: string) => {
    setDrawLines(
      drawLines.map((line) =>
        line.budget_id === budgetId ? { ...line, amount } : line
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'submitted') => {
    e.preventDefault()
    setError('')

    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    const validLines = drawLines.filter(
      (line) => parseFloat(line.amount) > 0
    )

    if (validLines.length === 0) {
      setError('Please enter at least one draw amount')
      return
    }

    // Validate amounts don't exceed remaining
    for (const line of validLines) {
      const amount = parseFloat(line.amount)
      if (amount > line.remaining) {
        setError(`Amount for ${line.category} exceeds remaining budget ($${line.remaining.toLocaleString()})`)
        return
      }
    }

    setSaving(true)

    try {
      const totalAmount = validLines.reduce(
        (sum, line) => sum + parseFloat(line.amount),
        0
      )

      // Create draw request
      const drawRequest: DrawRequestInsert = {
        project_id: selectedProject,
        draw_number: nextDrawNumber,
        total_amount: totalAmount,
        status,
        notes: notes.trim() || null,
      }

      const { data: newDraw, error: drawError } = await supabase
        .from('draw_requests')
        .insert(drawRequest)
        .select()
        .single()

      if (drawError) throw drawError

      // Create draw request lines
      const drawRequestLines: DrawRequestLineInsert[] = validLines.map((line) => ({
        draw_request_id: newDraw.id,
        budget_id: line.budget_id,
        amount_requested: parseFloat(line.amount),
        amount_approved: status === 'submitted' ? null : parseFloat(line.amount),
      }))

      const { error: linesError } = await supabase
        .from('draw_request_lines')
        .insert(drawRequestLines)

      if (linesError) throw linesError

      router.push('/draws')
    } catch (err: any) {
      setError(err.message || 'Failed to create draw request')
    } finally {
      setSaving(false)
    }
  }

  const totalRequested = drawLines.reduce(
    (sum, line) => sum + (parseFloat(line.amount) || 0),
    0
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Draw Request</h1>
        <p className="text-slate-600 mt-1">Request funds from project budget</p>
      </div>

      <form className="space-y-6">
        {/* Project Selection */}
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Project *
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input"
            required
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Draw Details */}
        {selectedProject && (
          <>
            <div className="card">
              <div className="flex items-center gap-8 mb-6">
                <div>
                  <span className="text-sm text-slate-600">Draw Number</span>
                  <div className="text-2xl font-bold text-slate-900">#{nextDrawNumber}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Request Date</span>
                  <div className="text-lg font-medium text-slate-900">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Add any notes about this draw request..."
                />
              </div>
            </div>

            {/* Draw Lines */}
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Draw Amounts</h2>

              {budgets.length === 0 ? (
                <p className="text-amber-600 text-center py-8">
                  No budget lines found for this project.{' '}
                  <a href="/budgets/new" className="underline">Create a budget first</a>
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-600 px-4">
                    <div className="col-span-4">Category</div>
                    <div className="col-span-3 text-right">Remaining</div>
                    <div className="col-span-3 text-right">Request Amount</div>
                    <div className="col-span-2"></div>
                  </div>

                  {drawLines.map((line) => {
                    const amount = parseFloat(line.amount) || 0
                    const exceedsRemaining = amount > line.remaining
                    return (
                      <div
                        key={line.budget_id}
                        className={`grid grid-cols-12 gap-4 items-center p-4 rounded-lg ${
                          exceedsRemaining ? 'bg-red-50' : 'bg-slate-50'
                        }`}
                      >
                        <div className="col-span-4 font-medium">{line.category}</div>
                        <div className="col-span-3 text-right text-slate-600">
                          {formatCurrency(line.remaining)}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={line.amount}
                            onChange={(e) => updateLineAmount(line.budget_id, e.target.value)}
                            placeholder="0.00"
                            min="0"
                            max={line.remaining}
                            step="0.01"
                            className={`input text-right ${exceedsRemaining ? 'border-red-300' : ''}`}
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          {amount > 0 && (
                            <span className={exceedsRemaining ? 'text-red-600 text-sm' : 'text-emerald-600 text-sm'}>
                              {exceedsRemaining ? 'Exceeds!' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Total */}
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center px-4">
                    <span className="font-semibold text-slate-900">Total Requested</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {formatCurrency(totalRequested)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <a href="/draws" className="btn-secondary">
            Cancel
          </a>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            className="btn-secondary"
            disabled={saving || !selectedProject}
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'submitted')}
            className="btn-primary"
            disabled={saving || !selectedProject}
          >
            {saving ? 'Submitting...' : 'Submit Draw Request'}
          </button>
        </div>
      </form>
    </div>
  )
}

