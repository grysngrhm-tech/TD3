'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { UnifiedDashboard, AutomationFlow } from './visuals'

interface SolutionsSectionProps {
  progress?: number
}

const solutionsData = {
  header: 'TD3 addresses both problems directly: one place for everything and automation for the repetitive stuff.',
  footer: 'AI handles the pattern matching and data extraction. Humans review the results and make decisions.',
  columns: [
    {
      title: 'A Single Source of Truth',
      description: 'Every loan, builder, budget, draw request, invoice, and approval lives in one system. Not spreadsheets with version numbers in the filename—a real database that stays current.',
      bullets: [
        'Current state is always obvious',
        'History preserved automatically',
        'Reporting is instant',
        'Anyone can pick up where someone left off',
      ],
      Visual: UnifiedDashboard,
    },
    {
      title: 'Intelligent Automation Where It Matters',
      description: 'TD3 uses AI to handle the tedious, repetitive tasks that currently eat hours.',
      bullets: [
        'Automatic budget standardization (NAHB cost codes)',
        'Smart invoice matching',
        'Built-in validation',
      ],
      Visual: AutomationFlow,
    },
  ],
}

export const SolutionsSection = forwardRef<HTMLElement, SolutionsSectionProps>(
  function SolutionsSection({ progress = 0 }, ref) {
    // Map 0-1 progress to animation stages
    const headerOpacity = Math.min(1, progress * 4)
    const col1Progress = Math.max(0, Math.min(1, (progress - 0.15) * 3))
    const col2Progress = Math.max(0, Math.min(1, (progress - 0.4) * 3))
    const footerOpacity = Math.max(0, Math.min(1, (progress - 0.8) * 5))

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="w-full max-w-5xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12 md:mb-16"
            style={{ opacity: headerOpacity }}
          >
            <motion.span
              className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
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
                  {/* Visual */}
                  <div className="mb-6">
                    <Visual progress={colProgress} />
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
                      const bulletProgress = Math.max(0, Math.min(1, (colProgress - 0.3 - bulletIndex * 0.1) * 5))

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
                            style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                          >
                            <svg
                              className="w-3 h-3"
                              style={{ color: '#22c55e' }}
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
            className="text-center mt-12 md:mt-16"
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
