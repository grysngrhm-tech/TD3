'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BuilderInfoCard } from '@/app/components/builders/BuilderInfoCard'
import { useNavigation } from '@/app/context/NavigationContext'
import { useAuth } from '@/app/context/AuthContext'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import { toast } from '@/app/components/ui/Toast'
import type { Builder } from '@/types/database'

export default function NewBuilderPage() {
  const router = useRouter()
  const { setCurrentPageTitle } = useNavigation()
  const { isLoading } = useAuth()
  const canProcess = useHasPermission('processor')

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('New Builder')
  }, [setCurrentPageTitle])

  // Redirect if no permission
  useEffect(() => {
    if (!canProcess && !isLoading) {
      toast.error('Access denied', 'You do not have permission to create builders')
      window.location.href = '/'
    }
  }, [canProcess, isLoading])

  // Don't render until we've verified permission
  if (!canProcess) {
    return null
  }

  const handleSave = (builder: Builder) => {
    // Navigate to the newly created builder page
    router.push(`/builders/${builder.id}`)
  }

  const handleCancel = () => {
    // Go back to the previous page or staging dashboard
    router.back()
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              New Builder
            </h1>
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}
            >
              Creating
            </span>
          </div>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
            Add builder information and banking details
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <BuilderInfoCard 
          isNew={true}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}

