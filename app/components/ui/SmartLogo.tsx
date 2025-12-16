'use client'

import Link from 'next/link'
import { useNavigation } from '@/app/context/NavigationContext'

export function SmartLogo() {
  const { getDashboardHref, lastDashboard } = useNavigation()
  const href = getDashboardHref()

  return (
    <Link
      href={href}
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <span 
        className="font-semibold hidden sm:inline" 
        style={{ color: 'var(--text-primary)' }}
      >
        Tennant Developments
      </span>
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-ios-xs"
        style={{ background: 'var(--accent)' }}
      >
        <span className="text-white font-bold text-xs">TD3</span>
        {/* Subtle indicator showing which dashboard this leads to */}
        {lastDashboard === 'draw' ? (
          <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )}
      </div>
    </Link>
  )
}

