'use client'

import { useEffect, useState } from 'react'
import type { AuditEvent } from '@/types/database'
import { getAuditHistory, formatAuditAction, formatEntityType } from '@/lib/audit'

interface AuditTimelineProps {
  entityType: 'project' | 'budget' | 'draw_request' | 'invoice' | 'document' | 'approval'
  entityId: string
  initialEvents?: AuditEvent[]
}

export function AuditTimeline({ entityType, entityId, initialEvents }: AuditTimelineProps) {
  const [events, setEvents] = useState<AuditEvent[]>(initialEvents || [])
  const [loading, setLoading] = useState(!initialEvents)

  useEffect(() => {
    if (!initialEvents) {
      loadEvents()
    }
  }, [entityType, entityId])

  async function loadEvents() {
    setLoading(true)
    const history = await getAuditHistory(entityType, entityId)
    setEvents(history)
    setLoading(false)
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: 'bg-blue-500',
      updated: 'bg-slate-500',
      submitted: 'bg-amber-500',
      approved: 'bg-emerald-500',
      rejected: 'bg-red-500',
      paid: 'bg-primary-500',
      deleted: 'bg-red-700',
    }
    return colors[action] || 'bg-slate-400'
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'approved':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'rejected':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'submitted':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )
      case 'paid':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      if (hours < 1) {
        const minutes = Math.floor(diff / 60000)
        return minutes < 1 ? 'Just now' : `${minutes}m ago`
      }
      return `${hours}h ago`
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}d ago`
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No history recorded yet</p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, idx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {idx !== events.length - 1 && (
                <span
                  className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-start space-x-3">
                <div className="relative">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${getActionColor(event.action)}`}
                  >
                    {getActionIcon(event.action)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div>
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{formatAuditAction(event.action)}</span>
                      {event.actor && event.actor !== 'system' && (
                        <span className="text-slate-500"> by {event.actor}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTimestamp(event.created_at)}
                    </p>
                  </div>
                  {/* Show comments if present in metadata */}
                  {event.metadata && (event.metadata as any).comments && (
                    <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                      "{(event.metadata as any).comments}"
                    </div>
                  )}
                  {/* Show data changes if present */}
                  {event.old_data && event.new_data && (
                    <div className="mt-2 text-xs">
                      {Object.keys(event.new_data as object).map((key) => {
                        const oldVal = (event.old_data as any)?.[key]
                        const newVal = (event.new_data as any)?.[key]
                        if (oldVal !== newVal && oldVal !== undefined) {
                          return (
                            <p key={key} className="text-slate-500">
                              <span className="font-medium">{key}:</span>{' '}
                              <span className="line-through text-slate-400">{String(oldVal)}</span>
                              {' → '}
                              <span className="text-slate-700">{String(newVal)}</span>
                            </p>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

