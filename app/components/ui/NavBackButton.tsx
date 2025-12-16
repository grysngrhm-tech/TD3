'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useNavigation } from '@/app/context/NavigationContext'

/**
 * Navigation back button with breadcrumb support
 * Hidden on dashboard pages
 */
export function NavBackButton() {
  const router = useRouter()
  const { isDashboard, breadcrumbs, previousPageTitle } = useNavigation()

  // Don't render on dashboard pages
  if (isDashboard) {
    return null
  }

  // Build breadcrumb display (skip current page, show path to here)
  const breadcrumbsToShow = breadcrumbs.slice(0, -1) // Exclude current page

  // Back arrow icon
  const BackIcon = (
    <svg 
      className="w-4 h-4" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M15 19l-7-7 7-7" 
      />
    </svg>
  )

  // Separator icon
  const SeparatorIcon = (
    <svg 
      className="w-3 h-3 flex-shrink-0" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      style={{ color: 'var(--text-disabled)' }}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 5l7 7-7 7" 
      />
    </svg>
  )

  // If we have breadcrumbs, show them as a trail
  if (breadcrumbsToShow.length > 0) {
    return (
      <div className="flex items-center gap-1">
        <motion.button
          onClick={() => router.back()}
          className="flex items-center gap-1 px-2 py-1.5 touch-target"
          style={{ 
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
          }}
          whileHover={{ 
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-primary)',
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1 }}
        >
          {BackIcon}
        </motion.button>
        
        {/* Breadcrumb trail */}
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbsToShow.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <motion.button
                onClick={() => router.push(crumb.path)}
                className="truncate max-w-[120px] transition-colors"
                style={{ 
                  color: 'var(--text-muted)',
                }}
                whileHover={{
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                }}
                title={crumb.title}
              >
                {crumb.title}
              </motion.button>
              {index < breadcrumbsToShow.length - 1 && SeparatorIcon}
            </span>
          ))}
        </nav>
      </div>
    )
  }

  // Fallback: show previous page title or "Back"
  return (
    <motion.button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 px-3 py-2 touch-target"
      style={{ 
        color: 'var(--text-secondary)',
        borderRadius: 'var(--radius-sm)',
      }}
      whileHover={{ 
        backgroundColor: 'var(--bg-hover)',
        color: 'var(--text-primary)',
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      {BackIcon}
      <span className="text-sm font-medium truncate max-w-[150px]">
        {previousPageTitle || 'Back'}
      </span>
    </motion.button>
  )
}
