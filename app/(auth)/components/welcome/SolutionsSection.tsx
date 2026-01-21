'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { UnifiedDashboard, AutomationFlow } from './visuals'

interface SolutionsSectionProps {
  progress?: number
  viewportScale?: number
}

const solutionsData = {
  header: 'TD3 provides a structured foundation for construction finance while supporting efficient, repeatable workflows.',
  footer: 'Automation supports accuracy and efficiency, while approvals and judgment remain human-led.',
  columns: [
    {
      title: 'A Centralized System of Record',
      description: 'TD3 brings loan data, budgets, draw requests, invoices, approvals, and funding records into a single, continuously updated system designed for long-term traceability and operational clarity.',
      bullets: [
        'Consistent, current project and loan data',
        'Complete historical record across the loan lifecycle',
        'Immediate access to portfolio-level insights',
        'Continuity across teams, roles, and project phases',
      ],
      Visual: UnifiedDashboard,
    },
    {
      title: 'Targeted Automation',
      description: 'TD3 applies automation selectively, focusing on tasks that benefit from consistency and pattern recognition without obscuring accountability.',
      bullets: [
        'Standardized budget categorization',
        'Assisted invoice-to-draw matching',
        'Built-in consistency and validation checks',
        'Reduced manual data entry for repeatable workflows',
      ],
      Visual: AutomationFlow,
    },
  ],
}

export const SolutionsSection = forwardRef<HTMLElement, SolutionsSectionProps>(
  function SolutionsSection({ progress = 0, viewportScale = 1 }, ref) {
    // Map 0-1 progress to animation stages (compressed for tighter scroll)
    const headerOpacity = Math.min(1, progress * 5)                          // 0-20%
    const col1Progress = Math.max(0, Math.min(1, (progress - 0.1) * 4))      // 10-35%
    const col2Progress = Math.max(0, Math.min(1, (progress - 0.3) * 4))      // 30-55%
    const footerOpacity = Math.max(0, Math.min(1, (progress - 0.55) * 3))    // 55-88%

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center px-4 pt-16 md:pt-20 pb-8"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Cool color accent overlay - reinforces solution/success tone */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 80%, color-mix(in srgb, var(--success) 5%, transparent) 0%, transparent 70%)',
          }}
        />
        {/* Content wrapper with viewport-based scaling */}
        <div
          className="w-full max-w-5xl mx-auto"
          style={{
            transform: viewportScale < 1 ? `scale(${viewportScale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          {/* Section Header */}
          <motion.div
            className="text-center mb-8 md:mb-10"
            style={{ opacity: headerOpacity }}
          >
            <motion.span
              className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
              style={{
                background: 'var(--success-muted)',
                color: 'var(--success)',
              }}
            >
              The Solution
            </motion.span>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-semibold max-w-3xl mx-auto leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {solutionsData.header}
            </h2>
          </motion.div>

          {/* Two Columns */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16">
            {solutionsData.columns.map((column, colIndex) => {
              const colProgress = colIndex === 0 ? col1Progress : col2Progress
              const Visual = column.Visual

              return (
                <motion.div
                  key={column.title}
                  className="relative"
                  style={{
                    opacity: Math.min(1, colProgress * 2),
                    transform: `translateY(${(1 - Math.min(1, colProgress * 2)) * 30}px)`,
                  }}
                >
                  {/* Visual - receives unbounded progress for extended animations */}
                  <div className="mb-6">
                    <Visual progress={progress} />
                  </div>

                  {/* Title */}
                  <h3
                    className="text-xl md:text-2xl font-semibold mb-3"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {column.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-sm md:text-base mb-6 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {column.description}
                  </p>

                  {/* Bullet Points */}
                  <ul className="space-y-3">
                    {column.bullets.map((bullet, bulletIndex) => {
                      const bulletProgress = Math.max(0, Math.min(1, (colProgress - 0.2 - bulletIndex * 0.05) * 6))

                      return (
                        <motion.li
                          key={bullet}
                          className="flex items-start gap-3"
                          style={{
                            opacity: bulletProgress,
                            transform: `translateX(${(1 - bulletProgress) * -20}px)`,
                          }}
                        >
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: 'var(--success-muted)' }}
                          >
                            <svg
                              className="w-3 h-3"
                              style={{ color: 'var(--success)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                          <span
                            className="text-sm md:text-base"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {bullet}
                          </span>
                        </motion.li>
                      )
                    })}
                  </ul>
                </motion.div>
              )
            })}
          </div>

          {/* Footer Quote */}
          <motion.div
            className="text-center mt-8 md:mt-10"
            style={{ opacity: footerOpacity }}
          >
            <div
              className="inline-block px-6 py-4 rounded-xl"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <p
                className="text-base md:text-lg font-medium max-w-2xl mx-auto"
                style={{ color: 'var(--text-primary)' }}
              >
                &ldquo;{solutionsData.footer}&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }
)

export default SolutionsSection
