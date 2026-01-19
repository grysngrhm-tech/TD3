'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

type NavButtonConfig = {
  href: string
  label: string
  icon: 'home' | 'chart'
  position: 'left' | 'right'
}

type DrawStatsBarProps = {
  pendingReviewCount: number
  pendingReviewAmount: number
  stagedCount: number
  stagedAmount: number
  pendingWireCount: number
  pendingWireAmount: number
  navButton?: NavButtonConfig
}

const icons = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DrawStatsBar({
  pendingReviewCount,
  pendingReviewAmount,
  stagedCount,
  stagedAmount,
  pendingWireCount,
  pendingWireAmount,
  navButton,
}: DrawStatsBarProps) {
  const router = useRouter()
  const totalAmount = pendingReviewAmount + stagedAmount + pendingWireAmount
  const totalCount = pendingReviewCount + stagedCount + pendingWireCount
  
  // Calculate progress through the pipeline
  const fundedPercentage = totalAmount > 0 
    ? ((stagedAmount + pendingWireAmount) / totalAmount) * 100 
    : 0

  // Render nav button
  const renderNavButton = () => {
    if (!navButton) return null
    
    const isLeft = navButton.position === 'left'
    
    return (
      <motion.button
        onClick={() => router.push(navButton.href)}
        className="flex items-center gap-3 px-6 py-3 font-semibold transition-all touch-target cursor-pointer"
        style={{
          background: 'var(--accent)',
          color: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elevation-2), 0 0 20px var(--accent-glow)',
          border: 'none',
        }}
        whileHover={{
          scale: 1.03,
          boxShadow: 'var(--elevation-3), 0 0 30px var(--accent-glow)',
        }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isLeft && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        )}
        {icons[navButton.icon]}
        <span>{navButton.label}</span>
        {!isLeft && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </motion.button>
    )
  }

  const isLeftNav = navButton?.position === 'left'

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="p-5 mb-6"
      style={{ 
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Nav button on left if configured */}
        {isLeftNav && renderNavButton()}
        {isLeftNav && navButton && (
          <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />
        )}

        {/* Pending Review */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2"
              style={{ 
                background: 'var(--warning)', 
                borderRadius: 'var(--radius-full)' 
              }}
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Pending Review
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold financial-value" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-2xl)' }}>
              {pendingReviewCount}
            </span>
            <span className="text-sm financial-value" style={{ color: 'var(--text-secondary)' }}>
              {formatCurrency(pendingReviewAmount)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />

        {/* Staged */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2"
              style={{ 
                background: 'var(--info)', 
                borderRadius: 'var(--radius-full)' 
              }}
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Staged
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold financial-value" style={{ color: 'var(--info)', fontSize: 'var(--text-2xl)' }}>
              {formatCurrency(stagedAmount)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {stagedCount} draws
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />

        {/* Pending Wire */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2"
              style={{ 
                background: 'var(--purple)', 
                borderRadius: 'var(--radius-full)' 
              }}
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Pending Wire
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold financial-value" style={{ color: 'var(--purple)', fontSize: 'var(--text-2xl)' }}>
              {formatCurrency(pendingWireAmount)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {pendingWireCount} batch{pendingWireCount !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />

        {/* Pipeline Total */}
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Pipeline Total
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold financial-value" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-2xl)' }}>
              {formatCurrency(totalAmount)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {totalCount} items
            </span>
          </div>
          {/* Progress bar */}
          <div 
            className="mt-2 h-1.5 overflow-hidden" 
            style={{ 
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fundedPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full"
              style={{ 
                background: `linear-gradient(90deg, var(--info) 0%, var(--purple) 100%)`,
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        </div>

        {/* Nav button on right if configured */}
        {!isLeftNav && navButton && (
          <div className="w-px h-12" style={{ background: 'var(--border-subtle)' }} />
        )}
        {!isLeftNav && renderNavButton()}
      </div>
    </motion.div>
  )
}
