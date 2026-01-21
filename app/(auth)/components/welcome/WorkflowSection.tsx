'use client'

import { forwardRef, useState, useEffect, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { WorkflowTimeline, type StageData } from './WorkflowTimeline'
import { WorkflowStageDetail } from './WorkflowStageDetail'
import {
  ImportStage,
  SubmitStage,
  ReviewStage,
  StagingStage,
  FundingStage,
  TrackingStage,
} from './visuals/workflow'

interface WorkflowSectionProps {
  progress?: number
  viewportScale?: number
}

// Map stage index to animation component
const STAGE_ANIMATIONS: ComponentType<{ progress: number }>[] = [
  ImportStage,
  SubmitStage,
  ReviewStage,
  StagingStage,
  FundingStage,
  TrackingStage,
]

// Workflow stages data matching the copywriting
const WORKFLOW_STAGES: StageData[] = [
  {
    id: 'import',
    number: 1,
    title: 'Import & Standardize',
    shortTitle: 'Import',
    description:
      'Budgets are uploaded directly from Excel or CSV files. TD3 detects structure, identifies line items, and applies AI-powered standardization to NAHB cost codes, allowing teams to confirm mappings while preserving original formatting and intent.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    ),
  },
  {
    id: 'submit',
    number: 2,
    title: 'Submit & Match',
    shortTitle: 'Submit',
    description:
      'When a draw request is received, amounts are automatically matched to existing budget lines. Supporting invoices can be uploaded at the same time, with AI-assisted extraction and matching that highlights discrepancies and confidence levels for review.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    ),
  },
  {
    id: 'review',
    number: 3,
    title: 'Review with Full Context',
    shortTitle: 'Review',
    description:
      'Review screens present the complete picture in one place: requested amounts, remaining budget, invoice details, validation flags, and historical draw activity. Issues are resolved directly in the interface without switching tools.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    ),
  },
  {
    id: 'stage',
    number: 4,
    title: 'Stage for Funding',
    shortTitle: 'Stage',
    description:
      'Approved draws move into a staging area where they are grouped by builder. This staging step creates a clear separation between review and funding, allowing teams to prepare wire batches with visibility into totals and readiness.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    ),
  },
  {
    id: 'fund',
    number: 5,
    title: 'Fund with Controls',
    shortTitle: 'Fund',
    description:
      'Funding is recorded in a controlled step. Authorized users select a funding date, add wire references if needed, and mark staged draws as funded. TD3 records the transaction, updates balances, and locks historical data automatically.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
  },
  {
    id: 'track',
    number: 6,
    title: 'Track Across the Portfolio',
    shortTitle: 'Track',
    description:
      'Dashboards provide real-time visibility across all loans and projects. Budget utilization, draw history, amortization progress, and risk indicators are continuously updated, eliminating the need for manual compilation or offline reporting.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
  },
]

export const WorkflowSection = forwardRef<HTMLElement, WorkflowSectionProps>(
  function WorkflowSection({ progress = 0, viewportScale = 1 }, ref) {
    const [isMobile, setIsMobile] = useState(false)

    // Check for mobile on mount and resize
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Header is always visible so it scrolls into view naturally before pinning
    // Content area fades in after the section pins (progress > 0)
    const contentOpacity = Math.max(0, Math.min(1, progress * 20))  // 0-5%

    // Stages start after 10% progress, use remaining 90% for 6 stages
    // With doubled scroll distance (300%), each stage now gets ~15% of scroll
    // which equals ~45% of viewport height - plenty of dwell time
    const stageStartProgress = 0.10
    const normalizedStageProgress = Math.max(0, progress - stageStartProgress) / (1 - stageStartProgress)
    const activeStageFloat = Math.min(normalizedStageProgress * 6, 5.999)
    const activeStage = Math.floor(activeStageFloat)
    // Progress within the current stage (0-1)
    const stageProgress = activeStageFloat - activeStage

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-start px-4 pt-0 pb-8"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Content wrapper with viewport-based scaling */}
        <div
          className="w-full max-w-6xl mx-auto"
          style={{
            transform: viewportScale < 1 ? `scale(${viewportScale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          {/* Section Header - always visible, scrolls into view naturally */}
          <div className="text-center mb-8 md:mb-12">
            <span
              className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
            >
              The Workflow
            </span>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-semibold max-w-2xl mx-auto leading-tight mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              From budget to funded.{' '}
              <span style={{ color: 'var(--accent)' }}>Fully visible.</span>
            </h2>
            <p
              className="text-base md:text-lg max-w-2xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              TD3 guides each draw through a structured, end-to-end workflow
              designed for accuracy, transparency, and efficient funding
              operations.
            </p>
          </div>

          {/* Main content area */}
          <motion.div
            style={{ opacity: contentOpacity }}
            className="relative"
          >
            {isMobile ? (
              /* Mobile: Vertical stack with inline expansion */
              <div className="space-y-2">
                {/* Compact stage indicators */}
                <WorkflowTimeline
                  stages={WORKFLOW_STAGES}
                  activeStage={activeStage}
                  stageProgress={stageProgress}
                  isMobile={true}
                />

                {/* Active stage title bar */}
                <div
                  className="px-4 py-3 rounded-xl"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))',
                    border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'var(--accent)',
                      }}
                    >
                      <span className="text-sm font-bold text-white">
                        {WORKFLOW_STAGES[activeStage].number}
                      </span>
                    </div>
                    <h3
                      className="text-base font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {WORKFLOW_STAGES[activeStage].title}
                    </h3>
                  </div>
                </div>

                {/* Stage detail with animation */}
                <WorkflowStageDetail
                  stage={WORKFLOW_STAGES[activeStage]}
                  stageIndex={activeStage}
                  progress={stageProgress}
                  isActive={true}
                  isMobile={true}
                  AnimationComponent={STAGE_ANIMATIONS[activeStage]}
                />
              </div>
            ) : (
              /* Desktop: Side-by-side layout */
              <div
                className="flex gap-6 lg:gap-8 min-h-[500px] rounded-2xl p-6"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--elevation-2)',
                }}
              >
                {/* Left column: Timeline */}
                <div className="w-48 lg:w-56 flex-shrink-0 border-r border-[var(--border-subtle)] pr-6">
                  <WorkflowTimeline
                    stages={WORKFLOW_STAGES}
                    activeStage={activeStage}
                    stageProgress={stageProgress}
                    isMobile={false}
                  />
                </div>

                {/* Right column: Stage detail */}
                <div className="flex-1 min-w-0">
                  <WorkflowStageDetail
                    stage={WORKFLOW_STAGES[activeStage]}
                    stageIndex={activeStage}
                    progress={stageProgress}
                    isActive={true}
                    isMobile={false}
                    AnimationComponent={STAGE_ANIMATIONS[activeStage]}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    )
  }
)

export default WorkflowSection
