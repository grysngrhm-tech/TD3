'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { ScatteredDocs, RepetitiveClock } from './visuals'

interface ProblemsSectionProps {
  progress?: number
}

const problemsData = {
  header: 'Construction lending creates two persistent challenges that compound as the portfolio grows.',
  footer: 'A small team can hold all this in their heads—until they can\'t.',
  columns: [
    {
      title: 'Everything Lives in Too Many Places',
      description: 'Understanding a single loan means checking multiple sources: budget spreadsheets someone emailed last month, approval threads buried in inboxes, handwritten notes from phone calls, and whatever someone is keeping track of in their head.',
      bullets: [
        'No single source of truth',
        'Decisions disappear into email',
        'Reporting takes hours',
        'Audits are painful',
      ],
      Visual: ScatteredDocs,
    },
    {
      title: 'Too Much Time on Repetitive Work',
      description: 'Even with good intentions and smart people, manual processes eat time that should go elsewhere.',
      bullets: [
        'Budget categorization is tedious',
        'Invoice matching is slow',
        'Data entry crowds out judgment',
        'Inconsistency undermines reporting',
      ],
      Visual: RepetitiveClock,
    },
  ],
}

export const ProblemsSection = forwardRef<HTMLElement, ProblemsSectionProps>(
  function ProblemsSection({ progress = 0 }, ref) {
    // Map 0-1 progress to animation stages (compressed for tighter scroll)
    const headerOpacity = Math.min(1, progress * 5)                          // 0-20%
    const col1Progress = Math.max(0, Math.min(1, (progress - 0.1) * 4))      // 10-35%
    const col2Progress = Math.max(0, Math.min(1, (progress - 0.3) * 4))      // 30-55%
    const footerOpacity = Math.max(0, Math.min(1, (progress - 0.55) * 3))    // 55-88%

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 md:py-16"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Warm color accent overlay - reinforces problem/challenge tone */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 20%, color-mix(in srgb, var(--warning) 6%, transparent) 0%, transparent 70%)',
          }}
        />
        <div className="w-full max-w-5xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-8 md:mb-10"
            style={{ opacity: headerOpacity }}
          >
            <motion.span
              className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
              style={{
                background: 'var(--error-muted)',
                color: 'var(--error)',
              }}
            >
              The Challenge
            </motion.span>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-semibold max-w-3xl mx-auto leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {problemsData.header}
            </h2>
          </motion.div>

          {/* Two Columns */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16">
            {problemsData.columns.map((column, colIndex) => {
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
                            style={{ background: 'var(--error-muted)' }}
                          >
                            <svg
                              className="w-3 h-3"
                              style={{ color: 'var(--error)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
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
            <p
              className="text-lg md:text-xl italic max-w-2xl mx-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              &ldquo;{problemsData.footer}&rdquo;
            </p>
          </motion.div>
        </div>
      </section>
    )
  }
)

export default ProblemsSection
