'use client'

import { motion } from 'framer-motion'

interface AutomationFlowProps {
  progress?: number
  className?: string
}

export function AutomationFlow({ progress = 0, className = '' }: AutomationFlowProps) {
  // Using TD3 semantic colors
  const steps = [
    { icon: 'upload', label: 'Upload', colorVar: '--info' },
    { icon: 'ai', label: 'AI Process', colorVar: '--purple' },
    { icon: 'check', label: 'Validated', colorVar: '--success' },
  ]

  const currentStep = Math.floor(progress * 3)

  return (
    <div className={`relative w-full h-48 md:h-64 flex items-center justify-center ${className}`}>
      <div className="flex items-center gap-4 md:gap-6">
        {steps.map((step, index) => {
          const isActive = index <= currentStep
          const isCurrent = index === currentStep

          return (
            <div key={step.label} className="flex items-center">
              {/* Step circle */}
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: isActive ? 1 : 0.8,
                  opacity: isActive ? 1 : 0.4,
                }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <motion.div
                  className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center"
                  style={{
                    background: isActive
                      ? `color-mix(in srgb, var(${step.colorVar}) 15%, transparent)`
                      : 'var(--bg-secondary)',
                    border: `2px solid ${isActive ? `var(${step.colorVar})` : 'var(--border)'}`,
                    borderRadius: 'var(--radius-xl)',
                  }}
                  animate={{
                    boxShadow: isCurrent
                      ? `0 0 20px color-mix(in srgb, var(${step.colorVar}) 40%, transparent)`
                      : 'none',
                  }}
                >
                  {step.icon === 'upload' && (
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7"
                      style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  {step.icon === 'ai' && (
                    <motion.svg
                      className="w-6 h-6 md:w-7 md:h-7"
                      style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      animate={isCurrent ? { rotate: 360 } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </motion.svg>
                  )}
                  {step.icon === 'check' && (
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7"
                      style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </motion.div>

                {/* Label */}
                <motion.p
                  className="text-xs font-medium text-center mt-2"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isActive ? 1 : 0.5 }}
                >
                  {step.label}
                </motion.p>

                {/* Processing indicator dots */}
                {isCurrent && step.icon === 'ai' && (
                  <motion.div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 rounded-full"
                        style={{ background: `var(${step.colorVar})` }}
                        animate={{
                          y: [0, -4, 0],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="relative w-8 md:w-12 h-0.5 mx-2">
                  <div
                    className="absolute inset-0"
                    style={{ background: 'var(--border)' }}
                  />
                  <motion.div
                    className="absolute inset-y-0 left-0"
                    style={{ background: `var(${steps[index].colorVar})` }}
                    initial={{ width: '0%' }}
                    animate={{ width: index < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                  {/* Animated particle traveling along connector */}
                  {index < currentStep && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                      style={{ background: `var(${steps[index + 1].colorVar})` }}
                      initial={{ left: 0, opacity: 0 }}
                      animate={{ left: '100%', opacity: [0, 1, 0] }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Speed indicator - using TD3 success color */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: progress > 0.7 ? 1 : 0,
          y: progress > 0.7 ? 0 : 10,
        }}
      >
        <svg
          className="w-4 h-4"
          style={{ color: 'var(--success)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--success)' }}
        >
          Seconds, not hours
        </span>
      </motion.div>
    </div>
  )
}

export default AutomationFlow
