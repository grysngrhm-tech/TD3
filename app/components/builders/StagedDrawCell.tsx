'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { DrawWithProject } from './BuilderTimeline'

type StagedDrawCellProps = {
  draws: DrawWithProject[]
  projectId: string
}

/**
 * StagedDrawCell - Pulsing indicator for staged draws
 * 
 * Features:
 * - Solid warning color for visibility
 * - Pulsing glow animation to draw attention
 * - Shows amount (single draw) or count (multiple draws)
 * - Click to expand and see details
 */
export function StagedDrawCell({ draws, projectId }: StagedDrawCellProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  const totalAmount = draws.reduce((sum, d) => sum + (d.total_amount || 0), 0)

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${Math.round(amount / 1000)}k`
    }
    return `$${amount}`
  }

  if (draws.length === 0) return null

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-bold"
        style={{
          background: 'var(--warning)',
          color: 'white',
          minWidth: 40,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulsing glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'var(--warning)' }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Content */}
        <span 
          className="relative z-10"
          style={{ 
            fontFamily: 'var(--font-mono)',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
        >
          {draws.length > 1 ? (
            `${draws.length}x`
          ) : (
            formatCompactCurrency(totalAmount)
          )}
        </span>
      </motion.button>

      {/* Expanded Dropdown */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 min-w-[200px]"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div 
                className="rounded-lg overflow-hidden"
                style={{ 
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--elevation-4)',
                }}
              >
                {/* Header */}
                <div 
                  className="px-3 py-2 text-xs font-semibold"
                  style={{ 
                    background: 'var(--warning)',
                    color: 'white'
                  }}
                >
                  Staged Draws
                </div>
                
                {/* Draw List */}
                <div className="py-1">
                  {draws.map(draw => (
                    <button
                      key={draw.id}
                      onClick={() => {
                        setIsExpanded(false)
                        router.push(`/draws/${draw.id}`)
                      }}
                      className="w-full px-3 py-2 flex items-center justify-between transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Draw #{draw.draw_number}
                      </span>
                      <span 
                        className="text-sm font-bold"
                        style={{ 
                          color: 'var(--warning)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {formatCompactCurrency(draw.total_amount)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Footer Total */}
                {draws.length > 1 && (
                  <div 
                    className="px-3 py-2 flex justify-between items-center"
                    style={{ 
                      borderTop: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)'
                    }}
                  >
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</span>
                    <span 
                      className="text-sm font-bold"
                      style={{ 
                        color: 'var(--warning)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {formatCompactCurrency(totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
