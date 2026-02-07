'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { getUserActivity, getUserActivityCount } from '@/lib/activity'
import { ActivityFeed } from './ActivityFeed'
import type { UserActivity } from '@/types/custom'

const PAGE_SIZE = 20

export function ActivityTab() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadActivities = useCallback(async (offset = 0) => {
    if (!user) return

    try {
      const [data, count] = await Promise.all([
        getUserActivity(user.id, PAGE_SIZE, offset),
        offset === 0 ? getUserActivityCount(user.id) : Promise.resolve(totalCount),
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
  }, [user, totalCount])

  useEffect(() => {
    loadActivities(0)
  }, [loadActivities])

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    loadActivities(activities.length)
  }

  const hasMore = activities.length < totalCount

  return (
    <div className="card-ios">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Your Activity
        </h2>
        {totalCount > 0 && (
          <span className="text-sm text-text-muted">
            {totalCount} {totalCount === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>

      <ActivityFeed
        activities={activities}
        loading={isLoading || isLoadingMore}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        emptyMessage="No activity recorded yet. Your actions will appear here."
      />
    </div>
  )
}
