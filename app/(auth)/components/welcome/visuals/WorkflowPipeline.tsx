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
    colorVar: '--accent',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    id: 'staged',
    label: 'Staged',
    description: "Group with builder's other draws",
    colorVar: '--info',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    ),
  },
  {
    id: 'pending_wire',
    label: 'Pending Wire',
    description: 'Send to bookkeeper for processing',
    colorVar: '--purple',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    id: 'funded',
    label: 'Funded',
    description: 'Wire sent, budgets updated, audit complete',
    colorVar: '--success',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
]

export function WorkflowPipeline({ progress = 0, className = '' }: WorkflowPipelineProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past

  // Calculate which step is active based on progress
  const activeStepIndex = Math.min(Math.floor(progress * 4), 3)
  const stepProgress = (progress * 4) % 1

  // At high progress, pipeline expands
  const deconstructAmount = Math.max(0, (progress - 0.85) * 6)

  return (
    <div className={`relative w-full max-w-3xl mx-auto ${className}`}>
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:block">
        <div
          className="flex items-start justify-between"
          style={{
            // Expand horizontally at high progress
            transform: `scaleX(${1 + deconstructAmount * 0.15})`,
          }}
        >
          {steps.map((step, index) => {
            const isActive = index <= activeStepIndex
            const isCurrent = index === activeStepIndex
            const isCompleted = index < activeStepIndex

            // Connector progress for this segment
            const connectorProgress = isCompleted ? 1 : isCurrent ? stepProgress : 0

            return (
              <div key={step.id} className="flex-1 relative">
                {/* Connector line with scroll-driven data packets */}
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-1/2 w-full h-1 -z-10">
                    <div
                      className="absolute inset-0"
                      style={{ background: 'var(--border)' }}
                    />
                    {/* Progress fill */}
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        background: `var(${step.colorVar})`,
                        width: `${connectorProgress * 100}%`,
                      }}
                    />

                    {/* Data packet - position driven by scroll progress */}
                    {connectorProgress > 0.1 && connectorProgress < 0.95 && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                        style={{
                          background: `var(${steps[index + 1].colorVar})`,
                          boxShadow: `0 0 8px var(${steps[index + 1].colorVar})`,
                          left: `${connectorProgress * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Step content */}
                <div className="flex flex-col items-center text-center px-2">
                  {/* Circle */}
                  <div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: isActive
                        ? `color-mix(in srgb, var(${step.colorVar}) 15%, transparent)`
                        : 'var(--bg-secondary)',
                      border: `3px solid ${isActive ? `var(${step.colorVar})` : 'var(--border)'}`,
                      boxShadow: isCurrent
                        ? `0 0 ${20 + stepProgress * 10}px color-mix(in srgb, var(${step.colorVar}) 50%, transparent)`
                        : 'var(--elevation-1)',
                      transform: `scale(${isCurrent ? 1 + stepProgress * 0.05 : 1})`,
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
                      <div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          background: `var(${step.colorVar})`,
                          transform: `scale(${1 + deconstructAmount * 0.3})`,
                        }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <h3
                    className="text-sm font-semibold mb-1"
                    style={{
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      opacity: isActive ? 1 : 0.5,
                    }}
                  >
                    {step.label}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-xs max-w-[140px]"
                    style={{
                      color: 'var(--text-muted)',
                      opacity: isCurrent ? 1 : 0.5,
                    }}
                  >
                    {step.description}
                  </p>
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
            <div
              key={step.id}
              className="flex items-start gap-4"
              style={{
                opacity: isActive ? 1 : 0.4,
              }}
            >
              {/* Timeline line + circle */}
              <div className="relative flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive
                      ? `color-mix(in srgb, var(${step.colorVar}) 15%, transparent)`
                      : 'var(--bg-secondary)',
                    border: `2px solid ${isActive ? `var(${step.colorVar})` : 'var(--border)'}`,
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
                </div>

                {/* Vertical connector */}
                {index < steps.length - 1 && (
                  <div
                    className="relative w-0.5 h-8 mt-2 overflow-hidden"
                    style={{ background: 'var(--border)' }}
                  >
                    <div
                      className="absolute top-0 w-full"
                      style={{
                        background: `var(${step.colorVar})`,
                        height: isCompleted ? '100%' : '0%',
                      }}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkflowPipeline
