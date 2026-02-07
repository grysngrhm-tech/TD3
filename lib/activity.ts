import { supabase } from './supabase'
import { parseUserAgent } from './deviceInfo'
import type {
  UserActivity,
  UserActivityWithUser,
  UserActivityInsert,
  ActivityActionType,
  ActivityEntityType,
  DeviceType,
} from '@/types/custom'

/**
 * Log user activity (fire-and-forget, never throws)
 * This function should never block the UI or throw errors
 * Note: user_activity is a new table not yet in generated types
 */
export async function logActivity(activity: UserActivityInsert): Promise<void> {
  try {
    await (supabase as any).from('user_activity').insert(activity)
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

/**
 * Log a login event (client-side convenience)
 * For full IP/geolocation, call the API route instead
 */
export async function logLoginClient(userId: string): Promise<void> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const { deviceType, browser, os } = parseUserAgent(userAgent)

  await logActivity({
    user_id: userId,
    action_type: 'login',
    description: `Signed in from ${browser} on ${os}`,
    user_agent: userAgent,
    device_type: deviceType,
    browser,
    os,
  })
}

/**
 * Log entity mutation (convenience function)
 */
export async function logEntityAction({
  userId,
  action,
  entityType,
  entityId,
  entityLabel,
  description,
  urlPath,
  metadata,
}: {
  userId: string
  action: ActivityActionType
  entityType: ActivityEntityType
  entityId: string
  entityLabel: string
  description: string
  urlPath?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await logActivity({
    user_id: userId,
    action_type: action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    description,
    url_path: urlPath,
    metadata,
  })
}

/**
 * Get user's own activity (paginated)
 * Note: user_activity is a new table not yet in generated types
 */
export async function getUserActivity(
  userId: string,
  limit = 50,
  offset = 0
): Promise<UserActivity[]> {
  const { data, error } = await (supabase as any)
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch user activity:', error)
    return []
  }
  return (data || []) as UserActivity[]
}

/**
 * Get all activity (admin only, paginated)
 * Note: user_activity is a new table not yet in generated types
 */
export async function getAllActivity(
  limit = 50,
  offset = 0,
  filters?: {
    userId?: string
    actionType?: ActivityActionType
    entityType?: ActivityEntityType
  }
): Promise<UserActivityWithUser[]> {
  let query = (supabase as any)
    .from('user_activity')
    .select(`
      *,
      profiles (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.userId) query = query.eq('user_id', filters.userId)
  if (filters?.actionType) query = query.eq('action_type', filters.actionType)
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType)

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch all activity:', error)
    return []
  }
  return (data || []) as UserActivityWithUser[]
}

/**
 * Get activity count for a user
 * Note: user_activity is a new table not yet in generated types
 */
export async function getUserActivityCount(userId: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to count user activity:', error)
    return 0
  }
  return count || 0
}

/**
 * Get all activity count (admin)
 * Note: user_activity is a new table not yet in generated types
 */
export async function getAllActivityCount(filters?: {
  userId?: string
  actionType?: ActivityActionType
  entityType?: ActivityEntityType
}): Promise<number> {
  let query = (supabase as any)
    .from('user_activity')
    .select('*', { count: 'exact', head: true })

  if (filters?.userId) query = query.eq('user_id', filters.userId)
  if (filters?.actionType) query = query.eq('action_type', filters.actionType)
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType)

  const { count, error } = await query

  if (error) {
    console.error('Failed to count all activity:', error)
    return 0
  }
  return count || 0
}

/**
 * Format relative time from timestamp
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  // Format as date for older entries
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Unified action type configuration for icon and color.
 */
const ACTION_CONFIG: Record<string, { icon: string; color: string }> = {
  login:     { icon: 'log-in',       color: 'var(--info)' },
  created:   { icon: 'plus-circle',  color: 'var(--success)' },
  updated:   { icon: 'edit',         color: 'var(--accent)' },
  deleted:   { icon: 'trash-2',      color: 'var(--error)' },
  funded:    { icon: 'dollar-sign',  color: 'var(--success)' },
  approved:  { icon: 'check-circle', color: 'var(--success)' },
  rejected:  { icon: 'x-circle',    color: 'var(--error)' },
  staged:    { icon: 'layers',       color: 'var(--info)' },
  submitted: { icon: 'send',         color: 'var(--warning)' },
  exported:  { icon: 'download',     color: 'var(--text-muted)' },
}

/**
 * Get icon name based on action type
 */
export function getActionIcon(actionType: ActivityActionType): string {
  return ACTION_CONFIG[actionType]?.icon || 'activity'
}

/**
 * Get color class based on action type
 */
export function getActionColor(actionType: ActivityActionType): string {
  return ACTION_CONFIG[actionType]?.color || 'var(--text-muted)'
}
