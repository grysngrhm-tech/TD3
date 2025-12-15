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

type StageStatsBarProps = {
  stage: LifecycleStage
  projects: ProjectStats[]
  onNewLoan?: () => void
  onUploadDraw?: () => void
}

export function StageStatsBar({ stage, projects, onNewLoan, onUploadDraw }: StageStatsBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)

  const stats = useMemo(() => {
    const count = projects.length
    const totalBudget = projects.reduce((sum, p) => sum + p.total_budget, 0)
    const totalSpent = projects.reduce((sum, p) => sum + p.total_spent, 0)
    const totalLoanAmount = projects.reduce((sum, p) => sum + (p.loan_amount || 0), 0)
    const totalIncome = projects.reduce((sum, p) => sum + (p.totalIncome || 0), 0)
    
    // LTV distribution for pending
    let ltvLow = 0, ltvMid = 0, ltvHigh = 0
    projects.forEach(p => {
      if (p.loan_amount && p.appraised_value && p.appraised_value > 0) {
        const ltv = (p.loan_amount / p.appraised_value) * 100
        if (ltv <= 70) ltvLow++
        else if (ltv <= 80) ltvMid++
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
                    ≤70% LTV: {stats.ltvLow} loans
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
                    70-80% LTV: {stats.ltvMid} loans
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
                    &gt;80% LTV: {stats.ltvHigh} loans
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

  return (
    <div 
      className="flex items-center gap-6 p-4 rounded-ios-sm"
      style={{ background: 'var(--bg-card)' }}
    >
      {/* Count */}
      <div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {stage === 'pending' ? 'In Pipeline' : stage === 'active' ? 'Active Loans' : 'Completed'}
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {stats.count}
        </div>
      </div>
      
      <div className="w-px h-10" style={{ background: 'var(--border)' }} />
      
      {/* Stage-specific primary metric */}
      <div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {stage === 'pending' ? 'Pipeline Value' : stage === 'active' ? 'Total Committed' : 'Total Funded'}
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(stage === 'pending' ? stats.totalLoanAmount : stats.totalBudget)}
        </div>
      </div>
      
      <div className="w-px h-10" style={{ background: 'var(--border)' }} />
      
      {/* Stage-specific secondary metric */}
      <div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {stage === 'pending' ? 'Avg LTV' : stage === 'active' ? 'Total Drawn' : 'Total Income'}
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
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
      
      {/* Actions */}
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {onNewLoan && (
          <button onClick={onNewLoan} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Loan
          </button>
        )}
        {stage === 'active' && onUploadDraw && (
          <button onClick={onUploadDraw} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Draw
          </button>
        )}
      </div>
    </div>
  )
}
