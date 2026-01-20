'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getAllActivity, getAllActivityCount } from '@/lib/activity'
import { ActivityFeed } from './ActivityFeed'
import type { UserActivityWithUser, ActivityActionType, ActivityEntityType } from '@/types/database'
import { ACTION_TYPE_LABELS, ENTITY_TYPE_LABELS } from '@/types/database'

const PAGE_SIZE = 30

type UserOption = { id: string; email: string; full_name: string | null }

export function AdminActivityTab() {
  const [activities, setActivities] = useState<UserActivityWithUser[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Filters
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<ActivityActionType | ''>('')
  const [selectedEntity, setSelectedEntity] = useState<ActivityEntityType | ''>('')

  // Load users for filter dropdown
  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true })

      if (data) {
        setUsers(data)
      }
    }
    loadUsers()
  }, [])

  const loadActivities = useCallback(async (offset = 0) => {
    try {
      const filters = {
        userId: selectedUser || undefined,
        actionType: selectedAction || undefined,
        entityType: selectedEntity || undefined,
      }

      const [data, count] = await Promise.all([
        getAllActivity(PAGE_SIZE, offset, filters),
        offset === 0 ? getAllActivityCount(filters) : Promise.resolve(totalCount),
      ])

      if (offset === 0) {
        setActivities(data)
        setTotalCount(count)
      } else {
        setActivities(prev => [...prev, ...data])
      }
    } catch (err) {
      console.error('Error loading activities:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [selectedUser, selectedAction, selectedEntity, totalCount])

  // Reload when filters change
  useEffect(() => {
    setIsLoading(true)
    setActivities([])
    loadActivities(0)
  }, [selectedUser, selectedAction, selectedEntity])

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    loadActivities(activities.length)
  }

  const hasMore = activities.length < totalCount

  const clearFilters = () => {
    setSelectedUser('')
    setSelectedAction('')
    setSelectedEntity('')
  }

  const hasFilters = selectedUser || selectedAction || selectedEntity

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card-ios">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Filter:
          </span>

          {/* User Filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="input-ios text-sm py-1.5"
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>

          {/* Action Type Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as ActivityActionType | '')}
            className="input-ios text-sm py-1.5"
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="">All Actions</option>
            {(Object.entries(ACTION_TYPE_LABELS) as [ActivityActionType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Entity Type Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value as ActivityEntityType | '')}
            className="input-ios text-sm py-1.5"
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="">All Types</option>
            {(Object.entries(ENTITY_TYPE_LABELS) as [ActivityEntityType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="card-ios">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            All User Activity
          </h2>
          {totalCount > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {totalCount} {totalCount === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>

        <ActivityFeed
          activities={activities}
          showUser={true}
          loading={isLoading || isLoadingMore}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          emptyMessage={hasFilters ? 'No activity matches your filters' : 'No activity recorded yet'}
        />
      </div>
    </div>
  )
}
