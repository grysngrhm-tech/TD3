'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { WorkflowPipeline } from './visuals'

interface WorkflowSectionProps {
  progress?: number
}

export const WorkflowSection = forwardRef<HTMLElement, WorkflowSectionProps>(
  function WorkflowSection({ progress = 0 }, ref) {
    const headerOpacity = Math.min(1, progress * 3)
    const pipelineProgress = Math.max(0, Math.min(1, (progress - 0.2) * 1.5))
    const footerOpacity = Math.max(0, Math.min(1, (progress - 0.85) * 7))

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="w-full max-w-5xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12 md:mb-20"
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
              Every draw follows a clear path with full visibility at each stage.
            </p>
          </motion.div>

          {/* Workflow Pipeline */}
          <div className="mb-12 md:mb-20">
            <WorkflowPipeline progress={pipelineProgress} />
          </div>

          {/* Feature highlights */}
          <motion.div
            className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
            style={{ opacity: footerOpacity }}
          >
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                ),
                title: 'Complete Audit Trail',
                description: 'Every action timestamped and attributed',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                ),
                title: 'Wire Batch Consolidation',
                description: 'Group multiple draws into single wires',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ),
                title: 'Built-in Validation',
                description: 'Catch issues before they become problems',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="text-center p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: footerOpacity,
                  y: footerOpacity > 0.5 ? 0 : 20,
                }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{
                    background: 'var(--accent-muted)',
                  }}
                >
                  <svg
                    className="w-6 h-6"
                    style={{ color: 'var(--accent)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-xs"
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
