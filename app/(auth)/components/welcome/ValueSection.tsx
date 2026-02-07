'use client'

import { motion } from 'framer-motion'

const challenges = [
  'Data distributed across systems and files',
  'Limited real-time visibility into project status',
  'Manual reconciliation for reporting and review',
  'Time spent organizing budgets and draw requests',
]

const solutions = [
  'Consistent, current project and loan data in one system',
  'Complete historical record across the loan lifecycle',
  'Immediate access to portfolio-level insights',
  'Standardized categorization and assisted matching',
]

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const bulletVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
}

export function ValueSection() {
  return (
    <section
      className="relative px-4 py-20 md:py-28 bg-background-secondary"
    >
      {/* Section Header */}
      <div className="max-w-5xl mx-auto text-center mb-12 md:mb-16">
        <motion.span
          className="inline-block text-xs font-semibold tracking-wider uppercase mb-4 px-3 py-1 rounded-full"
          style={{
            background: 'var(--glass-bg)',
            color: 'var(--text-muted)',
            border: '1px solid var(--glass-border)',
          }}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          Why TD3?
        </motion.span>
        <motion.p
          className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-text-secondary"
          
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Construction lending requires coordinating large volumes of financial,
          contractual, and project data across long timelines and many
          participants.
        </motion.p>
      </div>

      {/* Side-by-side Cards */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8">
        {/* Challenge Card */}
        <motion.div
          className="card-glass relative overflow-hidden"
          style={{
            borderColor: 'var(--error-muted)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--error) 4%, var(--glass-bg)) 0%, var(--glass-bg) 100%)',
          }}
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Card Label */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-error-muted"
            >
              <svg
                className="w-3.5 h-3.5 text-error"
                
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
            <h3
              className="text-sm font-semibold uppercase tracking-wider text-error"
              
            >
              The Challenge
            </h3>
          </div>

          {/* Challenge Bullets */}
          <ul className="space-y-3">
            {challenges.map((bullet, i) => (
              <motion.li
                key={bullet}
                className="flex items-start gap-3"
                variants={bulletVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.4,
                  delay: 0.15 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-error-muted"
                >
                  <svg
                    className="w-3 h-3 text-error"
                    
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
                  className="text-sm md:text-base leading-relaxed text-text-secondary"
                  
                >
                  {bullet}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Solution Card */}
        <motion.div
          className="card-glass relative overflow-hidden"
          style={{
            borderColor: 'var(--success-muted)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--success) 4%, var(--glass-bg)) 0%, var(--glass-bg) 100%)',
          }}
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          transition={{
            duration: 0.5,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Card Label */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-success-muted"
            >
              <svg
                className="w-3.5 h-3.5 text-success"
                
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
            <h3
              className="text-sm font-semibold uppercase tracking-wider text-success"
              
            >
              The Solution
            </h3>
          </div>

          {/* Solution Bullets */}
          <ul className="space-y-3">
            {solutions.map((bullet, i) => (
              <motion.li
                key={bullet}
                className="flex items-start gap-3"
                variants={bulletVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.4,
                  delay: 0.15 + 0.15 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-success-muted"
                >
                  <svg
                    className="w-3 h-3 text-success"
                    
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
                  className="text-sm md:text-base leading-relaxed text-text-secondary"
                  
                >
                  {bullet}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Footer Quote */}
      <motion.div
        className="max-w-5xl mx-auto text-center mt-10 md:mt-14"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="inline-block px-6 py-4 rounded-xl"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <p
            className="text-base md:text-lg font-medium max-w-2xl mx-auto text-text-primary"
            
          >
            &ldquo;Automation supports accuracy and efficiency, while approvals
            and judgment remain human-led.&rdquo;
          </p>
        </div>
      </motion.div>
    </section>
  )
}

export default ValueSection
