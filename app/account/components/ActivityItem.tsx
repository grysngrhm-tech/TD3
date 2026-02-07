'use client'

import Link from 'next/link'
import { formatRelativeTime, getActionColor } from '@/lib/activity'
import type { UserActivity, UserActivityWithUser } from '@/types/custom'
import { ACTION_TYPE_LABELS, ENTITY_TYPE_LABELS } from '@/types/custom'

// Icons for different action types
const ActionIcons: Record<string, React.ReactNode> = {
  login: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  ),
  created: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  updated: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  deleted: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  funded: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approved: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rejected: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  staged: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  submitted: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  exported: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
}

// Device icons for login events
const DeviceIcons: Record<string, React.ReactNode> = {
  desktop: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  mobile: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  tablet: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
}

interface ActivityItemProps {
  activity: UserActivity | UserActivityWithUser
  showUser?: boolean
}

export function ActivityItem({ activity, showUser = false }: ActivityItemProps) {
  const actionColor = getActionColor(activity.action_type)
  const icon = ActionIcons[activity.action_type] || ActionIcons.updated
  const isLogin = activity.action_type === 'login'

  // Get user info for admin view
  const userInfo = 'profiles' in activity ? activity.profiles : null

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: `${actionColor}20`, color: actionColor }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* User name (admin view) */}
        {showUser && userInfo && (
          <div className="text-xs font-medium mb-0.5 text-text-secondary">
            {userInfo.full_name || userInfo.email}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-text-primary">
          {activity.description}
        </p>

        {/* Entity label */}
        {activity.entity_label && (
          <p className="text-xs mt-0.5 truncate text-text-muted">
            {activity.entity_type && ENTITY_TYPE_LABELS[activity.entity_type]}: {activity.entity_label}
          </p>
        )}

        {/* Login metadata */}
        {isLogin && (activity.browser || activity.location_city) && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {activity.device_type && DeviceIcons[activity.device_type] && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-background-hover text-text-muted"
              >
                {DeviceIcons[activity.device_type]}
                {activity.browser}
              </span>
            )}
            {activity.location_city && activity.location_country && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-background-hover text-text-muted"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {activity.location_city}, {activity.location_country}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-xs text-text-muted">
        {formatRelativeTime(activity.created_at)}
      </div>
    </div>
  )

  // Wrap in Link if url_path exists
  if (activity.url_path) {
    return (
      <Link href={activity.url_path} className="block">
        {content}
      </Link>
    )
  }

  return content
}
