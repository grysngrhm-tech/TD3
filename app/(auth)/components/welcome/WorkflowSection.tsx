'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { WorkflowPipeline } from './visuals'

interface WorkflowSectionProps {
  progress?: number
}

export const WorkflowSection = forwardRef<HTMLElement, WorkflowSectionProps>(
  function WorkflowSection({ progress = 0 }, ref) {
    // Compressed timing for tighter scroll
    const headerOpacity = Math.min(1, progress * 5)                          // 0-20%
    const pipelineProgress = Math.max(0, Math.min(1, (progress - 0.15) * 2)) // 15-65%
    const footerOpacity = Math.max(0, Math.min(1, (progress - 0.6) * 3))     // 60-93%

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 md:py-16"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="w-full max-w-5xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-8 md:mb-12"
            style={{ opacity: headerOpacity }}
          >
            <motion.span
              className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
            >
              The Workflow
            </motion.span>
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
              TD3 guides each draw through a structured, end-to-end workflow designed for accuracy, transparency, and efficient funding operations.
            </p>
          </motion.div>

          {/* Workflow Pipeline - receives unbounded progress for extended animations */}
          <div className="mb-8 md:mb-12">
            <WorkflowPipeline progress={progress} />
          </div>

          {/* Feature highlights */}
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
            style={{ opacity: footerOpacity }}
          >
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                ),
                title: 'Import & Standardize',
                description: 'Budgets are uploaded directly from Excel or CSV files. TD3 detects structure, identifies line items, and applies AI-powered standardization to NAHB cost codes, allowing teams to confirm mappings while preserving original formatting and intent.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                ),
                title: 'Submit & Match',
                description: 'When a draw request is received, amounts are automatically matched to existing budget lines. Supporting invoices can be uploaded at the same time, with AI-assisted extraction and matching that highlights discrepancies and confidence levels for review.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                ),
                title: 'Review with Full Context',
                description: 'Review screens present the complete picture in one place: requested amounts, remaining budget, invoice details, validation flags, and historical draw activity. Issues are resolved directly in the interface without switching tools.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                ),
                title: 'Stage for Funding',
                description: 'Approved draws move into a staging area where they are grouped by builder. This staging step creates a clear separation between review and funding, allowing teams to prepare wire batches with visibility into totals and readiness.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ),
                title: 'Fund with Controls',
                description: 'Funding is recorded in a controlled step. Authorized users select a funding date, add wire references if needed, and mark staged draws as funded. TD3 records the transaction, updates balances, and locks historical data automatically.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                ),
                title: 'Track Across the Portfolio',
                description: 'Dashboards provide real-time visibility across all loans and projects. Budget utilization, draw history, amortization progress, and risk indicators are continuously updated, eliminating the need for manual compilation or offline reporting.',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="text-left p-4 rounded-xl"
                style={{ background: 'var(--bg-secondary)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: footerOpacity,
                  y: footerOpacity > 0.5 ? 0 : 20,
                }}
                transition={{ delay: index * 0.06 }}
              >
                <div
                  className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center"
                  style={{
                    background: 'var(--accent-muted)',
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: 'var(--accent)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    )
  }
)

export default WorkflowSection
