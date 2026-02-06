'use client'

import { ActivityItem } from './ActivityItem'
import type { UserActivity, UserActivityWithUser } from '@/types/custom'

interface ActivityFeedProps {
  activities: UserActivity[] | UserActivityWithUser[]
  showUser?: boolean
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  emptyMessage?: string
}

export function ActivityFeed({
  activities,
  showUser = false,
  loading = false,
  onLoadMore,
  hasMore = false,
  emptyMessage = 'No activity yet',
}: ActivityFeedProps) {
  if (loading && activities.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--bg-hover)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'var(--bg-hover)' }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'var(--bg-hover)' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--text-muted)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            showUser={showUser}
          />
        ))}
      </div>

      {/* Load More */}
      {(hasMore || loading) && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="btn-ghost text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
