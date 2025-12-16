'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useNavigation } from '@/app/context/NavigationContext'
import { Project, BudgetInsert } from '@/types/database'

type BudgetLine = {
  category: string
  description: string
  amount: string
}

export default function NewBudgetPage() {
  const router = useRouter()
  const { setCurrentPageTitle } = useNavigation()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([
    { category: '', description: '', amount: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('New Budget')
  }, [setCurrentPageTitle])

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name')
    setProjects(data || [])
  }

  const addLine = () => {
    setBudgetLines([...budgetLines, { category: '', description: '', amount: '' }])
  }

  const removeLine = (index: number) => {
    if (budgetLines.length > 1) {
      setBudgetLines(budgetLines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof BudgetLine, value: string) => {
    const updated = [...budgetLines]
    updated[index][field] = value
    setBudgetLines(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    const validLines = budgetLines.filter(
      (line) => line.category.trim() && parseFloat(line.amount) > 0
    )

    if (validLines.length === 0) {
      setError('Please add at least one budget line with a category and amount')
      return
    }

    setSaving(true)

    try {
      const budgetsToInsert: BudgetInsert[] = validLines.map((line, index) => ({
        project_id: selectedProject,
        category: line.category.trim(),
        description: line.description.trim() || null,
        original_amount: parseFloat(line.amount),
        current_amount: parseFloat(line.amount),
        spent_amount: 0,
        sort_order: index,
      }))

      const { error: insertError } = await supabase
        .from('budgets')
        .insert(budgetsToInsert)

      if (insertError) throw insertError

      router.push('/budgets')
    } catch (err: any) {
      setError(err.message || 'Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = budgetLines.reduce(
    (sum, line) => sum + (parseFloat(line.amount) || 0),
    0
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Budget</h1>
        <p className="text-slate-600 mt-1">Add budget line items for a project</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
          {projects.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              No active projects found. <a href="/projects/new" className="underline">Create a project first</a>
            </p>
          )}
        </div>

        {/* Budget Lines */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Budget Lines</h2>
            <button type="button" onClick={addLine} className="btn-secondary text-sm">
              + Add Line
            </button>
          </div>

          <div className="space-y-4">
            {budgetLines.map((line, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={line.category}
                    onChange={(e) => updateLine(index, 'category', e.target.value)}
                    placeholder="e.g., Sitework, Foundation, Framing..."
                    className="input"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    placeholder="Optional details..."
                    className="input"
                  />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
                  <input
                    type="number"
                    value={line.amount}
                    onChange={(e) => updateLine(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="mt-6 text-slate-400 hover:text-red-500"
                  disabled={budgetLines.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
            <div className="text-right">
              <span className="text-sm text-slate-600">Total Budget: </span>
              <span className="text-xl font-bold text-slate-900">
                ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <a href="/budgets" className="btn-secondary">
            Cancel
          </a>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Create Budget'}
          </button>
        </div>
      </form>
    </div>
  )
}

