import { supabase } from './supabase'
import type { AuditEventInsert, AuditEvent, Json } from '@/types/database'

type EntityType = 'project' | 'budget' | 'draw_request' | 'invoice' | 'document' | 'approval'
type ActionType = 'created' | 'updated' | 'deleted' | 'submitted' | 'approved' | 'rejected' | 'paid'

/**
 * Log an audit event for entity changes
 */
export async function logAuditEvent({
  entityType,
  entityId,
  action,
  actor,
  oldData,
  newData,
  metadata,
}: {
  entityType: EntityType
  entityId: string
  action: ActionType
  actor?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}): Promise<AuditEvent | null> {
  try {
    const { data, error } = await supabase
      .from('audit_events')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor: actor || 'system',
        old_data: (oldData || null) as Json,
        new_data: (newData || null) as Json,
        metadata: (metadata || null) as Json,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to log audit event:', error)
      return null
    }

    return data as AuditEvent
  } catch (error) {
    console.error('Error logging audit event:', error)
    return null
  }
}

/**
 * Get audit history for an entity
 */
export async function getAuditHistory(
  entityType: EntityType,
  entityId: string
): Promise<AuditEvent[]> {
  try {
    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch audit history:', error)
      return []
    }

    return (data || []) as AuditEvent[]
  } catch (error) {
    console.error('Error fetching audit history:', error)
    return []
  }
}

/**
 * Get recent audit events across all entities
 */
export async function getRecentAuditEvents(limit: number = 50): Promise<AuditEvent[]> {
  try {
    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch recent audit events:', error)
      return []
    }

    return (data || []) as AuditEvent[]
  } catch (error) {
    console.error('Error fetching recent audit events:', error)
    return []
  }
}

/**
 * Log a status change specifically
 */
export async function logStatusChange({
  entityType,
  entityId,
  oldStatus,
  newStatus,
  actor,
  comments,
}: {
  entityType: EntityType
  entityId: string
  oldStatus: string
  newStatus: string
  actor?: string
  comments?: string
}): Promise<AuditEvent | null> {
  const action = newStatus as ActionType
  
  return logAuditEvent({
    entityType,
    entityId,
    action,
    actor,
    oldData: { status: oldStatus },
    newData: { status: newStatus },
    metadata: comments ? { comments } : undefined,
  })
}

/**
 * Format audit action for display
 */
export function formatAuditAction(action: string): string {
  const actionLabels: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    submitted: 'Submitted for approval',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Marked as paid',
  }
  
  return actionLabels[action] || action
}

/**
 * Format entity type for display
 */
export function formatEntityType(entityType: string): string {
  const labels: Record<string, string> = {
    project: 'Project',
    budget: 'Budget Line',
    draw_request: 'Draw Request',
    invoice: 'Invoice',
    document: 'Document',
    approval: 'Approval',
  }
  
  return labels[entityType] || entityType
}

/**
 * Get human-readable description of an audit event
 */
export function getAuditEventDescription(event: AuditEvent): string {
  const entityLabel = formatEntityType(event.entity_type)
  const actionLabel = formatAuditAction(event.action).toLowerCase()
  const actor = event.actor || 'System'
  
  return `${entityLabel} ${actionLabel} by ${actor}`
}

