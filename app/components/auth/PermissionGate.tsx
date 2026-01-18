'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { Permission } from '@/lib/supabase'

interface PermissionGateProps {
  /** Single permission or array of permissions (any match allows access) */
  permission: Permission | Permission[]
  /** Content to render if permission check fails */
  fallback?: ReactNode
  /** Content to render if permission check passes */
  children: ReactNode
  /** If true, requires ALL permissions instead of ANY */
  requireAll?: boolean
}

/**
 * Conditionally renders children based on user permissions.
 *
 * By default, if an array of permissions is passed, the user needs ANY of them.
 * Use requireAll={true} to require ALL permissions.
 *
 * @example
 * // Single permission
 * <PermissionGate permission="processor">
 *   <EditButton />
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions
 * <PermissionGate permission={['processor', 'fund_draws']}>
 *   <ActionButton />
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate permission={['processor', 'users.manage']} requireAll>
 *   <AdminProcessorButton />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="fund_draws" fallback={<ReadOnlyView />}>
 *   <FundingControls />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
  requireAll = false,
}: PermissionGateProps) {
  const { permissions, isLoading } = useAuth()

  // Don't render anything while loading auth state
  if (isLoading) {
    return null
  }

  const permissionArray = Array.isArray(permission) ? permission : [permission]

  const hasAccess = requireAll
    ? permissionArray.every(p => permissions.includes(p))
    : permissionArray.some(p => permissions.includes(p))

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook version for programmatic permission checks.
 * Use when you need permission logic outside of JSX.
 *
 * @example
 * const canFund = useHasPermission('fund_draws')
 * const canProcess = useHasPermission(['processor', 'fund_draws'])
 */
export function useHasPermission(permission: Permission | Permission[], requireAll = false): boolean {
  const { permissions, isLoading } = useAuth()

  if (isLoading) {
    return false
  }

  const permissionArray = Array.isArray(permission) ? permission : [permission]

  return requireAll
    ? permissionArray.every(p => permissions.includes(p))
    : permissionArray.some(p => permissions.includes(p))
}
