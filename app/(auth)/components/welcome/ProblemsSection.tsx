'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { ScatteredDocs, RepetitiveClock } from './visuals'

interface ProblemsSectionProps {
  progress?: number
  viewportScale?: number
}

const problemsData = {
  header: 'Construction lending requires coordinating large volumes of financial, contractual, and project data across long timelines and many participants.',
  footer: 'As portfolios grow, clarity and consistency become essential.',
  columns: [
    {
      title: 'Fragmented Information',
      description: 'A single construction loan can involve budgets, draw requests, invoices, approvals, inspections, and funding records. When this information lives across multiple tools and formats, maintaining a shared, up-to-date understanding becomes difficult.',
      bullets: [
        'Data distributed across systems and files',
        'Limited real-time visibility into project status',
        'Manual reconciliation for reporting and review',
        'Increased effort during audits and financial reviews',
      ],
      Visual: ScatteredDocs,
    },
    {
      title: 'Manual, Repetitive Processes',
      description: 'Even in well-run organizations, many construction finance workflows rely on repetitive manual steps that consume time and introduce inconsistency.',
      bullets: [
        'Time spent organizing budgets and draw requests',
        'Manual matching of invoices and supporting documents',
        'Repeated validation and review steps',
        'Process variation across projects and teams',
      ],
      Visual: RepetitiveClock,
    },
  ],
}

export const ProblemsSection = forwardRef<HTMLElement, ProblemsSectionProps>(
  function ProblemsSection({ progress = 0, viewportScale = 1 }, ref) {
    // Header is always visible so it scrolls into view naturally before pinning
    // Content fades in after the section pins (progress > 0)
    const col1Progress = Math.max(0, Math.min(1, progress * 5))              // 0-20%
    const col2Progress = Math.max(0, Math.min(1, (progress - 0.15) * 5))     // 15-35%
    const footerOpacity = Math.max(0, Math.min(1, (progress - 0.4) * 3))     // 40-73%

    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-start px-4 pt-0 pb-8"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Warm color accent overlay - reinforces problem/challenge tone */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 20%, color-mix(in srgb, var(--warning) 6%, transparent) 0%, transparent 70%)',
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
          {/* Section Header - always visible, scrolls into view naturally */}
          <div className="text-center mb-2">
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
          </div>

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
                  {/* Visual - fixed height container for title alignment */}
                  <div className="h-44 sm:h-52 md:h-64 flex items-center justify-center overflow-hidden">
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
