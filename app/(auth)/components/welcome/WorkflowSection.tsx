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
              From request to funded.{' '}
              <span style={{ color: 'var(--accent)' }}>Seamlessly.</span>
            </h2>
            <p
              className="text-base md:text-lg max-w-xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              TD3 supports the full draw lifecycle with clear stages, defined responsibilities, and visibility for all stakeholders.
            </p>
          </motion.div>

          {/* Workflow Pipeline - receives unbounded progress for extended animations */}
          <div className="mb-8 md:mb-12">
            <WorkflowPipeline progress={progress} />
          </div>

          {/* Feature highlights */}
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto"
            style={{ opacity: footerOpacity }}
          >
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                ),
                title: 'Structured Draw Lifecycle',
                description: 'Each draw progresses through a clearly defined sequence—from submission and review to approval and funding—ensuring that every step is documented and consistently applied.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
                title: 'Comprehensive Audit Trail',
                description: 'All actions, decisions, and status changes are timestamped and attributable, creating a complete record suitable for internal review, partner coordination, and external audits.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ),
                title: 'Funding Controls and Approvals',
                description: 'Separation between processing and funding approval ensures that draw requests are reviewed thoroughly before funds are recorded and disbursed.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                ),
                title: 'Wire Batch Management',
                description: 'Multiple approved draws can be grouped into consolidated wire batches, simplifying funding operations while maintaining line-item traceability.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
                title: 'Built-in Validation',
                description: 'Automated checks help identify inconsistencies, missing documentation, or budget conflicts early, reducing downstream issues and rework.',
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
                transition={{ delay: index * 0.08 }}
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
