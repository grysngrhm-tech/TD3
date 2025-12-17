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
 * - Pulsing glow animation to draw attention
 * - Shows count if multiple staged draws
 * - Click to expand and see details
 * - Link to individual draw pages
 */
export function StagedDrawCell({ draws, projectId }: StagedDrawCellProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  const totalAmount = draws.reduce((sum, d) => sum + d.total_amount, 0)

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`
    }
    return `$${amount}`
  }

  if (draws.length === 0) return null

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold"
        style={{
          background: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--warning)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulsing glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(245, 158, 11, 0.3)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-1">
          {draws.length > 1 ? (
            <>
              <span>{draws.length}</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </>
          ) : (
            formatCurrency(totalAmount)
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
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 min-w-[180px]"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div 
                className="rounded-lg shadow-xl overflow-hidden"
                style={{ 
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div 
                  className="px-3 py-2 border-b text-xs font-semibold"
                  style={{ 
                    borderColor: 'var(--border-subtle)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: 'var(--warning)'
                  }}
                >
                  Staged Draws
                </div>
                
                <div className="py-1">
                  {draws.map(draw => (
                    <button
                      key={draw.id}
                      onClick={() => {
                        setIsExpanded(false)
                        router.push(`/draws/${draw.id}`)
                      }}
                      className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-opacity"
                      style={{ background: 'transparent' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        Draw #{draw.draw_number}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                        {formatCurrency(draw.total_amount)}
                      </span>
                    </button>
                  ))}
                </div>

                <div 
                  className="px-3 py-2 border-t flex justify-between items-center"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

