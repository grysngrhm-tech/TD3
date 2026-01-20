'use client'

import { motion } from 'framer-motion'

interface WorkflowPipelineProps {
  progress?: number
  className?: string
}

// Using TD3's actual draw workflow statuses and colors
const steps = [
  {
    id: 'review',
    label: 'Review',
    description: 'Validate line items against budget',
    colorVar: '--accent', // TD3 accent for review status
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    id: 'staged',
    label: 'Staged',
    description: "Group with builder's other draws",
    colorVar: '--info', // TD3 info/blue for staged status
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    ),
  },
  {
    id: 'pending_wire',
    label: 'Pending Wire',
    description: 'Send to bookkeeper for processing',
    colorVar: '--purple', // TD3 purple for pending wire status
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    id: 'funded',
    label: 'Funded',
    description: 'Wire sent, budgets updated, audit complete',
    colorVar: '--success', // TD3 success/green for funded status
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
]

export function WorkflowPipeline({ progress = 0, className = '' }: WorkflowPipelineProps) {
  // Calculate which step is active based on progress (0-1)
  const activeStepIndex = Math.min(Math.floor(progress * 4), 3)
  const stepProgress = (progress * 4) % 1

  return (
    <div className={`relative w-full max-w-3xl mx-auto ${className}`}>
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between">
          {steps.map((step, index) => {
            const isActive = index <= activeStepIndex
            const isCurrent = index === activeStepIndex
            const isCompleted = index < activeStepIndex

            return (
              <div key={step.id} className="flex-1 relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-1/2 w-full h-1 -z-10">
                    <div
                      className="absolute inset-0"
                      style={{ background: 'var(--border)' }}
                    />
                    <motion.div
                      className="absolute inset-y-0 left-0"
                      style={{ background: `var(${step.colorVar})` }}
                      initial={{ width: '0%' }}
                      animate={{
                        width: isCompleted ? '100%' : isCurrent ? `${stepProgress * 100}%` : '0%',
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                )}

                {/* Step content */}
                <div className="flex flex-col items-center text-center px-2">
                  {/* Circle - using TD3 styling */}
                  <motion.div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: isActive
                        ? `color-mix(in srgb, var(${step.colorVar}) 15%, transparent)`
                        : 'var(--bg-secondary)',
                      border: `3px solid ${isActive ? `var(${step.colorVar})` : 'var(--border)'}`,
                    }}
                    animate={{
                      scale: isCurrent ? [1, 1.05, 1] : 1,
                      boxShadow: isCurrent
                        ? `0 0 24px color-mix(in srgb, var(${step.colorVar}) 50%, transparent)`
                        : 'var(--elevation-1)',
                    }}
                    transition={{
                      scale: { duration: 1, repeat: isCurrent ? Infinity : 0 },
                    }}
                  >
                    <svg
                      className="w-7 h-7"
                      style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {step.icon}
                    </svg>

                    {/* Completed checkmark badge */}
                    {isCompleted && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: `var(${step.colorVar})` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.h3
                    className="text-sm font-semibold mb-1"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    animate={{ opacity: isActive ? 1 : 0.5 }}
                  >
                    {step.label}
                  </motion.h3>

                  {/* Description */}
                  <motion.p
                    className="text-xs max-w-[140px]"
                    style={{ color: 'var(--text-muted)' }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{
                      opacity: isCurrent ? 1 : 0.5,
                      y: isCurrent ? 0 : 5,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {step.description}
                  </motion.p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Vertical layout */}
      <div className="md:hidden space-y-4">
        {steps.map((step, index) => {
          const isActive = index <= activeStepIndex
          const isCurrent = index === activeStepIndex
          const isCompleted = index < activeStepIndex

          return (
            <motion.div
              key={step.id}
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: isActive ? 1 : 0.4,
                x: 0,
              }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {/* Timeline line + circle */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive
                      ? `color-mix(in srgb, var(${step.colorVar}) 15%, transparent)`
                      : 'var(--bg-secondary)',
                    border: `2px solid ${isActive ? `var(${step.colorVar})` : 'var(--border)'}`,
                  }}
                  animate={{
                    boxShadow: isCurrent
                      ? `0 0 16px color-mix(in srgb, var(${step.colorVar}) 40%, transparent)`
                      : 'none',
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {step.icon}
                  </svg>
                </motion.div>

                {/* Vertical connector */}
                {index < steps.length - 1 && (
                  <div
                    className="w-0.5 h-8 mt-2"
                    style={{ background: 'var(--border)' }}
                  >
                    <motion.div
                      className="w-full"
                      style={{ background: `var(${step.colorVar})` }}
                      initial={{ height: '0%' }}
                      animate={{ height: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="pt-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {step.label}
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {step.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkflowPipeline
