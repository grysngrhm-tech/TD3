'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useNavigation } from '@/app/context/NavigationContext'

/**
 * Smart logo that navigates to the last-visited dashboard
 * Shows subtle indicator of destination (Portfolio vs Draw)
 */
export function SmartLogo() {
  const { getDashboardHref, lastDashboard } = useNavigation()
  const href = getDashboardHref()

  return (
    <Link
      href={href}
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 group"
    >
      {/* Company Name */}
      <motion.span 
        className="font-semibold hidden sm:inline text-sm tracking-tight text-text-primary" 
        
        whileHover={{ opacity: 0.8 }}
      >
        Tennant Developments
      </motion.span>
      
      {/* TD3 Badge */}
      <motion.div 
        className="flex items-center gap-1.5 px-3 py-1.5"
        style={{ 
          background: 'var(--accent)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--elevation-2)',
        }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: 'var(--elevation-3), 0 0 20px var(--accent-glow)',
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <span 
          className="font-bold text-xs tracking-wide text-text-inverse"
          
        >
          TD3
        </span>
        
        {/* Dashboard indicator icon */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {lastDashboard === 'draw' ? (
            // Chart icon for Draw Dashboard
            <svg 
              className="w-3.5 h-3.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              style={{ color: 'rgba(255, 255, 255, 0.75)' }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
          ) : (
            // Home icon for Portfolio Dashboard
            <svg 
              className="w-3.5 h-3.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              style={{ color: 'rgba(255, 255, 255, 0.75)' }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
          )}
        </motion.div>
      </motion.div>
    </Link>
  )
}

