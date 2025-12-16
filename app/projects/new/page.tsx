'use client'

import { useRouter } from 'next/navigation'
import { OriginationTab } from '@/app/components/projects/OriginationTab'

export default function NewLoanPage() {
  const router = useRouter()

  const handleSave = (projectId: string) => {
    // Navigate to the newly created project
    router.push(`/projects/${projectId}`)
  }

  const handleCancel = () => {
    router.push('/')
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              New Loan
            </h1>
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)' }}
            >
              In Origination
            </span>
          </div>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
            Fill in the loan details to get started
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <OriginationTab 
          budgets={[]}
          isNew={true}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
