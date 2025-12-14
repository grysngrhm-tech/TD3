'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProjectInsert } from '@/types/database'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    setSaving(true)

    try {
      const project: ProjectInsert = {
        name: name.trim(),
        address: address.trim() || null,
        loan_amount: loanAmount ? parseFloat(loanAmount) : null,
        status: 'active',
      }

      const { error: insertError } = await supabase
        .from('projects')
        .insert(project)

      if (insertError) throw insertError

      router.push('/projects')
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Project</h1>
        <p className="text-slate-600 mt-1">Create a new construction project</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 123 Main Street Renovation"
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Property Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main Street, City, State 12345"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Loan Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input pl-8"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end pt-4">
          <a href="/projects" className="btn-secondary">
            Cancel
          </a>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

