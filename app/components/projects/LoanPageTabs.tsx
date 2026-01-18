'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import type { Project, Budget, DrawRequest, DrawRequestLine, LifecycleStage, Builder } from '@/types/database'
import { OriginationTab } from './OriginationTab'
import { LoanStatusTab } from './LoanStatusTab'
import { PerformanceTab } from './PerformanceTab'

type TabConfig = {
  id: string
  label: string
  stages: LifecycleStage[]
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'origination', label: 'Origination', stages: ['pending', 'active', 'historic'] },
  { id: 'status', label: 'Loan Status', stages: ['active', 'historic'] },
  { id: 'performance', label: 'Performance', stages: ['historic'] },
]

type DrawLineWithBudget = DrawRequestLine & {
  budget?: Budget | null
  draw_request?: DrawRequest | null
}

type LoanPageTabsProps = {
  project: Project & { lifecycle_stage: LifecycleStage }
  budgets: Budget[]
  draws: DrawRequest[]
  drawLines?: DrawLineWithBudget[]
  builder?: Builder | null
  onDataRefresh?: () => void
}

export function LoanPageTabs({ project, budgets, draws, drawLines = [], builder, onDataRefresh }: LoanPageTabsProps) {
  const lifecycleStage = project.lifecycle_stage

  // Get available tabs for current lifecycle stage
  const availableTabs = TAB_CONFIG.filter(tab => tab.stages.includes(lifecycleStage))

  // Determine default tab based on lifecycle stage
  const getDefaultTab = () => {
    switch (lifecycleStage) {
      case 'pending':
        return 'origination'
      case 'active':
        return 'status'
      case 'historic':
        return 'performance'
      default:
        return 'origination'
    }
  }

  const [activeTab, setActiveTab] = useState(getDefaultTab())

  // Update active tab when lifecycle stage changes
  useEffect(() => {
    const defaultTab = getDefaultTab()
    if (!availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(defaultTab)
    }
  }, [lifecycleStage])

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
      {/* Tab Bar */}
      <div className="border-b mb-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <Tabs.List className="flex gap-1">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id
            const isCurrentStage = 
              (tab.id === 'origination' && lifecycleStage === 'pending') ||
              (tab.id === 'status' && lifecycleStage === 'active') ||
              (tab.id === 'performance' && lifecycleStage === 'historic')

            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="relative px-4 py-3 text-sm font-medium transition-colors"
                style={{ 
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)'
                }}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {isCurrentStage && (
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--accent)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>
      </div>

      {/* Tab Content */}
      <Tabs.Content value="origination" className="flex-1 focus:outline-none">
        <OriginationTab 
          project={project} 
          budgets={budgets}
          builder={builder}
          onBudgetImported={onDataRefresh}
        />
      </Tabs.Content>

      <Tabs.Content value="status" className="flex-1 focus:outline-none">
        <LoanStatusTab 
          project={project} 
          budgets={budgets}
          draws={draws}
          drawLines={drawLines}
          onDrawImported={onDataRefresh}
        />
      </Tabs.Content>

      <Tabs.Content value="performance" className="flex-1 focus:outline-none">
        <PerformanceTab 
          project={project} 
          budgets={budgets}
          draws={draws}
        />
      </Tabs.Content>
    </Tabs.Root>
  )
}
