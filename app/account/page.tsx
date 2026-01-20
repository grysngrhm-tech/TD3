'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import { ProfileTab } from './components/ProfileTab'
import { PreferencesTab } from './components/PreferencesTab'
import { ActivityTab } from './components/ActivityTab'
import { AdminActivityTab } from './components/AdminActivityTab'

type TabId = 'profile' | 'preferences' | 'activity' | 'admin-activity'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const TABS: Tab[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'admin-activity',
    label: 'All Activity',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    adminOnly: true,
  },
]

export default function AccountPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const canManageUsers = useHasPermission('users.manage')
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/login?redirect=/account'
    }
  }, [user, isLoading])

  // Filter tabs based on permissions
  const visibleTabs = TABS.filter(tab => !tab.adminOnly || canManageUsers)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen pt-[calc(var(--header-height)+24px)] pb-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Account Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage your profile, preferences, and view activity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 mb-6 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'shadow-sm'
                  : 'hover:bg-[var(--bg-hover)]'
              }`}
              style={{
                background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
            {activeTab === 'activity' && <ActivityTab />}
            {activeTab === 'admin-activity' && canManageUsers && <AdminActivityTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
