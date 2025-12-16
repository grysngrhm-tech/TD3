'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { LifecycleStage } from '@/types/database'

type ProjectStats = {
  id: string
  loan_amount: number | null
  appraised_value: number | null
  total_budget: number
  total_spent: number
  totalIncome?: number
  irr?: number | null
}

type NavButtonConfig = {
  href: string
  label: string
  icon: 'home' | 'chart'
  position: 'left' | 'right'
}

type StageStatsBarProps = {
  stage: LifecycleStage
  projects: ProjectStats[]
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

export function StageStatsBar({ stage, projects, navButton }: StageStatsBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)

  const stats = useMemo(() => {
    const count = projects.length
    const totalBudget = projects.reduce((sum, p) => sum + p.total_budget, 0)
    const totalSpent = projects.reduce((sum, p) => sum + p.total_spent, 0)
    const totalLoanAmount = projects.reduce((sum, p) => sum + (p.loan_amount || 0), 0)
    const totalIncome = projects.reduce((sum, p) => sum + (p.totalIncome || 0), 0)
    
    // LTV distribution for pending (≤65% green, 66-74% yellow, ≥75% red)
    let ltvLow = 0, ltvMid = 0, ltvHigh = 0
    projects.forEach(p => {
      if (p.loan_amount && p.appraised_value && p.appraised_value > 0) {
        const ltv = (p.loan_amount / p.appraised_value) * 100
        if (ltv <= 65) ltvLow++
        else if (ltv <= 74) ltvMid++
        else ltvHigh++
      }
    })
    
    // Average LTV
    const projectsWithLTV = projects.filter(p => p.loan_amount && p.appraised_value && p.appraised_value > 0)
    const avgLTV = projectsWithLTV.length > 0
      ? projectsWithLTV.reduce((sum, p) => sum + ((p.loan_amount || 0) / (p.appraised_value || 1)) * 100, 0) / projectsWithLTV.length
      : null
    
    // Average IRR for historic
    const projectsWithIRR = projects.filter(p => p.irr !== null && p.irr !== undefined)
    const avgIRR = projectsWithIRR.length > 0
      ? projectsWithIRR.reduce((sum, p) => sum + (p.irr || 0), 0) / projectsWithIRR.length
      : null
    
    // Utilization for active
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    
    return {
      count,
      totalBudget,
      totalSpent,
      totalLoanAmount,
      totalIncome,
      ltvLow,
      ltvMid,
      ltvHigh,
      avgLTV,
      avgIRR,
      utilization,
      remaining: totalBudget - totalSpent,
    }
  }, [projects])

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Render visual element based on stage
  const renderVisualElement = () => {
    if (stage === 'pending') {
      // LTV Distribution Bar
      const total = stats.ltvLow + stats.ltvMid + stats.ltvHigh
      if (total === 0) return null
      
      const lowPct = (stats.ltvLow / total) * 100
      const midPct = (stats.ltvMid / total) * 100
      const highPct = (stats.ltvHigh / total) * 100
      
      return (
        <div className="flex-1 max-w-[200px]">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>LTV Distribution</div>
          <div className="relative h-6 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-hover)' }}>
            {lowPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lowPct}%` }}
                transition={{ duration: 0.5 }}
                className="h-full relative cursor-pointer"
                style={{ background: 'var(--success)' }}
                onMouseEnter={() => setHoveredSegment('low')}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {hoveredSegment === 'low' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap z-10"
                       style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    ≤65% LTV: {stats.ltvLow} loans
                  </div>
                )}
              </motion.div>
            )}
            {midPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${midPct}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="h-full relative cursor-pointer"
                style={{ background: 'var(--warning)' }}
                onMouseEnter={() => setHoveredSegment('mid')}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {hoveredSegment === 'mid' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap z-10"
                       style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    66-74% LTV: {stats.ltvMid} loans
                  </div>
                )}
              </motion.div>
            )}
            {highPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${highPct}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full relative cursor-pointer"
                style={{ background: 'var(--error)' }}
                onMouseEnter={() => setHoveredSegment('high')}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {hoveredSegment === 'high' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap z-10"
                       style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    ≥75% LTV: {stats.ltvHigh} loans
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )
    }
    
    if (stage === 'active') {
      // Utilization Progress Bar
      return (
        <div className="flex-1 max-w-[200px]">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-muted)' }}>Utilization</span>
            <span style={{ color: 'var(--accent)' }}>{stats.utilization.toFixed(1)}%</span>
          </div>
          <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(stats.utilization, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full relative"
              style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
            </motion.div>
            {hoveredSegment === 'util' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap z-10"
                   style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {formatCurrency(stats.totalSpent)} of {formatCurrency(stats.totalBudget)}
              </div>
            )}
          </div>
        </div>
      )
    }
    
    if (stage === 'historic') {
      // Income breakdown would go here, but we need to calculate fee vs interest
      // For now, show a simple metric
      return (
        <div className="flex-1 max-w-[200px]">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Avg IRR</div>
          <div className="h-6 flex items-center">
            <span 
              className="text-lg font-bold"
              style={{ 
                color: stats.avgIRR !== null 
                  ? stats.avgIRR >= 0.15 ? 'var(--success)' 
                    : stats.avgIRR >= 0.10 ? 'var(--warning)' 
                    : 'var(--error)'
                  : 'var(--text-muted)'
              }}
            >
              {stats.avgIRR !== null ? `${(stats.avgIRR * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      )
    }
    
    return null
  }

  // Render nav button
  const renderNavButton = () => {
    if (!navButton) return null
    
    const isLeft = navButton.position === 'left'
    
    return (
      <motion.a
        href={navButton.href}
        className="flex items-center gap-3 px-6 py-3 font-semibold transition-all touch-target"
        style={{ 
          background: 'var(--accent)',
          color: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elevation-2), 0 0 20px var(--accent-glow)',
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
      </motion.a>
    )
  }

  const isLeftNav = navButton?.position === 'left'

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-6 p-5"
      style={{ 
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      {/* Nav button on left if configured */}
      {isLeftNav && renderNavButton()}
      {isLeftNav && navButton && <div className="w-px h-10" style={{ background: 'var(--border)' }} />}

      {/* Count */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {stage === 'pending' ? 'In Pipeline' : stage === 'active' ? 'Active Loans' : 'Completed'}
        </div>
        <div className="font-bold financial-value" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-2xl)' }}>
          {stats.count}
        </div>
      </div>
      
      <div className="w-px h-10" style={{ background: 'var(--border)' }} />
      
      {/* Stage-specific primary metric */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {stage === 'pending' ? 'Pipeline Value' : stage === 'active' ? 'Total Committed' : 'Total Funded'}
        </div>
        <div className="font-bold financial-value" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-2xl)' }}>
          {formatCurrency(stage === 'pending' ? stats.totalLoanAmount : stats.totalBudget)}
        </div>
      </div>
      
      <div className="w-px h-10" style={{ background: 'var(--border)' }} />
      
      {/* Stage-specific secondary metric */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {stage === 'pending' ? 'Avg LTV' : stage === 'active' ? 'Total Drawn' : 'Total Income'}
        </div>
        <div className="font-bold financial-value" style={{ color: 'var(--accent)', fontSize: 'var(--text-2xl)' }}>
          {stage === 'pending' 
            ? (stats.avgLTV !== null ? `${stats.avgLTV.toFixed(1)}%` : '—')
            : stage === 'active'
              ? formatCurrency(stats.totalSpent)
              : formatCurrency(stats.totalIncome)
          }
        </div>
      </div>
      
      <div className="w-px h-10" style={{ background: 'var(--border)' }} />
      
      {/* Visual Element */}
      {renderVisualElement()}
      
      {/* Spacer and nav button on right if configured */}
      <div className="flex-1" />
      {!isLeftNav && renderNavButton()}
    </motion.div>
  )
}
