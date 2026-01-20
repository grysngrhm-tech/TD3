'use client'

import { motion } from 'framer-motion'

interface AutomationFlowProps {
  progress?: number
  className?: string
}

export function AutomationFlow({ progress = 0, className = '' }: AutomationFlowProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past - positive accumulation continues

  // Processing counter grows with scroll - accelerates past progress=1
  const growthMultiplier = progress > 1 ? 1 + (progress - 1) * 0.5 : 1
  const processedCount = Math.floor(progress * 500 * growthMultiplier)

  // Current step based on progress (completes by progress=1)
  const currentStep = Math.min(Math.floor(Math.min(progress, 1) * 3), 2)

  // NO deconstruction for Solutions section - keeps positive, contained appearance

  const steps = [
    { icon: 'upload', label: 'Upload', colorVar: '--info' },
    { icon: 'ai', label: 'AI Process', colorVar: '--purple' },
    { icon: 'check', label: 'Validated', colorVar: '--success' },
  ]

  // Data packet positions based on progress (appear at thresholds)
  const packetPositions = [0.3, 0.45, 0.6, 0.75, 0.9]
  const activePackets = packetPositions.filter(p => progress > p).length

  return (
    <div className={`relative w-full h-28 md:h-32 flex items-center justify-center ${className}`}>
      <div className="flex items-center gap-2 md:gap-4">
        {steps.map((step, index) => {
          const isActive = index <= currentStep
          const isCurrent = index === currentStep
          // Progress within this step (0-1)
          const stepLocalProgress = Math.max(0, Math.min(1, (progress - index * 0.33) * 3))

          return (
            <div key={step.label} className="flex items-center">
              {/* Step circle */}
              <div className="relative">
                <div
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                  style={{
                    background: isActive
                      ? `color-mix(in srgb, var(${step.colorVar}) 15%, transparent)`
                      : 'var(--bg-secondary)',
                    border: `2px solid ${isActive ? `var(${step.colorVar})` : 'var(--border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: isCurrent
                      ? `0 0 ${16 + stepLocalProgress * 8}px color-mix(in srgb, var(${step.colorVar}) ${30 + stepLocalProgress * 20}%, transparent)`
                      : 'none',
                    transform: `scale(${isActive ? 1 : 0.85})`,
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {step.icon === 'upload' && (
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  {step.icon === 'ai' && (
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      style={{
                        color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)',
                        // Rotation driven by progress when this step is current
                        transform: isCurrent ? `rotate(${stepLocalProgress * 360}deg)` : 'none',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {step.icon === 'check' && (
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      style={{ color: isActive ? `var(${step.colorVar})` : 'var(--text-muted)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Label */}
                <p
                  className="text-[9px] md:text-[10px] font-medium text-center mt-1"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector line with scroll-driven packets */}
              {index < steps.length - 1 && (
                <div className="relative w-6 md:w-8 h-0.5 mx-1">
                  <div
                    className="absolute inset-0"
                    style={{ background: 'var(--border)' }}
                  />
                  {/* Progress fill */}
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      background: `var(${steps[index].colorVar})`,
                      width: index < currentStep ? '100%' : isCurrent ? `${stepLocalProgress * 100}%` : '0%',
                    }}
                  />
                  {/* Data packets - position based on progress */}
                  {index < currentStep && activePackets > index && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: `var(${steps[index + 1].colorVar})`,
                        boxShadow: `0 0 4px var(${steps[index + 1].colorVar})`,
                        left: `${((progress * 3 - index) % 1) * 100}%`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Processing counter - grows with scroll */}
      <div
        className="absolute -top-1 right-2 font-mono text-xs"
        style={{
          color: 'var(--success)',
          fontVariantNumeric: 'tabular-nums',
          opacity: progress > 0.4 ? 1 : Math.max(0, (progress - 0.2) * 5),
        }}
      >
        {processedCount.toLocaleString()} processed
      </div>

      {/* Speed indicator */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1"
        style={{
          opacity: progress > 0.6 ? Math.min(1, (progress - 0.6) * 3) : 0,
        }}
      >
        <svg
          className="w-3 h-3"
          style={{ color: 'var(--success)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span
          className="text-[10px] font-medium"
          style={{ color: 'var(--success)' }}
        >
          Seconds, not hours
        </span>
      </div>

    </div>
  )
}

export default AutomationFlow
