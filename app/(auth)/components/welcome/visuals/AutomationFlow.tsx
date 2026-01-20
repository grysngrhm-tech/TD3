'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface AutomationFlowProps {
  progress?: number
  className?: string
}

export function AutomationFlow({ progress = 0, className = '' }: AutomationFlowProps) {
  // Continuous processing counter
  const [processedCount, setProcessedCount] = useState(0)
  const [dataPackets, setDataPackets] = useState<number[]>([])
  const isVisible = useRef(false)
  const packetId = useRef(0)

  useEffect(() => {
    isVisible.current = progress > 0.3

    const interval = setInterval(() => {
      if (isVisible.current) {
        // Increment processed count
        setProcessedCount(c => c + 1)

        // Occasionally spawn a new data packet
        if (Math.random() < 0.15) {
          packetId.current += 1
          setDataPackets(prev => [...prev.slice(-4), packetId.current])
        }
      }
    }, 150)

    return () => clearInterval(interval)
  }, [progress])

  useEffect(() => {
    isVisible.current = progress > 0.3
  }, [progress])

  // Using TD3 semantic colors
  const steps = [
    { icon: 'upload', label: 'Upload', colorVar: '--info' },
    { icon: 'ai', label: 'AI Process', colorVar: '--purple' },
    { icon: 'check', label: 'Validated', colorVar: '--success' },
  ]

  const currentStep = Math.floor(progress * 3)

  return (
    <div className={`relative w-full h-32 md:h-36 flex items-center justify-center ${className}`}>
      <div className="flex items-center gap-3 md:gap-5">
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
                  className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center"
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
                      className="w-5 h-5 md:w-6 md:h-6"
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
                      className="w-5 h-5 md:w-6 md:h-6"
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
                      className="w-5 h-5 md:w-6 md:h-6"
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
                  className="text-[10px] md:text-xs font-medium text-center mt-1.5"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isActive ? 1 : 0.5 }}
                >
                  {step.label}
                </motion.p>
              </motion.div>

              {/* Connector line with flowing packets */}
              {index < steps.length - 1 && (
                <div className="relative w-8 md:w-10 h-0.5 mx-1.5">
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
                  {/* Continuous flowing data packets */}
                  {index < currentStep && dataPackets.map((id) => (
                    <motion.div
                      key={`${index}-${id}`}
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: `var(${steps[index + 1].colorVar})` }}
                      initial={{ left: '-10%', opacity: 0 }}
                      animate={{ left: '110%', opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 0.8, ease: 'linear' }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Processing counter - increments continuously */}
      <motion.div
        className="absolute -top-1 right-4 font-mono text-xs"
        style={{
          color: 'var(--success)',
          fontVariantNumeric: 'tabular-nums',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.5 ? 1 : 0 }}
      >
        <motion.span
          key={processedCount}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.1 }}
        >
          {processedCount.toLocaleString()} processed
        </motion.span>
      </motion.div>

      {/* Speed indicator */}
      <motion.div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: progress > 0.7 ? 1 : 0,
          y: progress > 0.7 ? 0 : 10,
        }}
      >
        <svg
          className="w-3.5 h-3.5"
          style={{ color: 'var(--success)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--success)' }}
        >
          Seconds, not hours
        </span>
      </motion.div>
    </div>
  )
}

export default AutomationFlow
