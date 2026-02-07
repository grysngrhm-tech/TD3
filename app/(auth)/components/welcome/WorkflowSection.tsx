'use client'

import { motion } from 'framer-motion'

interface StageCard {
  id: string
  number: number
  title: string
  description: string
  icon: React.ReactNode
}

const WORKFLOW_STAGES: StageCard[] = [
  {
    id: 'import',
    number: 1,
    title: 'Import & Standardize',
    description:
      'Upload budgets from Excel. TD3 detects structure and maps line items to NAHB cost codes.',
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
    description:
      'Draw requests match to budget lines automatically. Invoices are extracted and scored for review.',
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
    description:
      'See amounts, remaining budget, invoices, and validation flags together in one screen.',
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
    description:
      'Approved draws group by builder into wire batches with full visibility into totals and readiness.',
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
    description:
      'Authorized users record funding, add wire references, and lock historical data in a controlled step.',
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
    description:
      'Dashboards show budget utilization, draw history, and risk indicators across all loans.',
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

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export function WorkflowSection() {
  return (
    <section
      className="relative flex flex-col items-center justify-start px-4 py-16 md:py-24"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
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

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {WORKFLOW_STAGES.map((stage, i) => (
            <motion.div
              key={stage.id}
              className="card-glass flex flex-col gap-3"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              {/* Top row: badge + icon */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  <span className="text-sm font-bold text-white">
                    {stage.number}
                  </span>
                </div>
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--accent)' }}
                >
                  {stage.icon}
                </svg>
              </div>

              {/* Title */}
              <h3
                className="text-base font-semibold leading-snug"
                style={{ color: 'var(--text-primary)' }}
              >
                {stage.title}
              </h3>

              {/* Description */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {stage.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WorkflowSection
