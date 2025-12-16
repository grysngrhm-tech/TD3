'use client'

import { useRouter } from 'next/navigation'
import { useNavigation } from '@/app/context/NavigationContext'

export function NavBackButton() {
  const router = useRouter()
  const { isDashboard, breadcrumbs, previousPageTitle } = useNavigation()

  // Don't render on dashboard pages
  if (isDashboard) {
    return null
  }

  // Build breadcrumb display (skip current page, show path to here)
  const breadcrumbsToShow = breadcrumbs.slice(0, -1) // Exclude current page

  // If we have breadcrumbs, show them as a trail
  if (breadcrumbsToShow.length > 0) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 px-2 py-1.5 rounded-ios-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
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
        </button>
        
        {/* Breadcrumb trail */}
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbsToShow.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <button
                onClick={() => router.push(crumb.path)}
                className="hover:underline transition-colors truncate max-w-[120px]"
                style={{ color: 'var(--text-muted)' }}
                title={crumb.title}
              >
                {crumb.title}
              </button>
              {index < breadcrumbsToShow.length - 1 && (
                <span style={{ color: 'var(--text-muted)' }}>/</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    )
  }

  // Fallback: show previous page title or "Back"
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 px-3 py-2 rounded-ios-sm transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
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
      <span className="text-sm font-medium truncate max-w-[150px]">
        {previousPageTitle || 'Back'}
      </span>
    </button>
  )
}
