'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type StageData } from './WorkflowTimeline'
import { type ComponentType } from 'react'

// Placeholder animation components - will be replaced with actual stage animations
const PlaceholderAnimation = ({ progress }: { progress: number }) => (
  <div
    className="w-full h-full flex items-center justify-center rounded-xl"
    style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
    }}
  >
    <div
      className="text-sm font-medium"
      style={{ color: 'var(--text-muted)' }}
    >
      Animation {Math.round(progress * 100)}%
    </div>
  </div>
)

interface WorkflowStageDetailProps {
  stage: StageData
  stageIndex: number
  progress: number // 0-1 within this stage
  isActive: boolean
  AnimationComponent?: ComponentType<{ progress: number }>
  isMobile?: boolean
}

export function WorkflowStageDetail({
  stage,
  stageIndex,
  progress,
  isActive,
  AnimationComponent = PlaceholderAnimation,
  isMobile = false,
}: WorkflowStageDetailProps) {
  if (isMobile) {
    // Mobile: Inline expanded content
    return (
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-6 pt-2">
              {/* Animation container */}
              <div className="relative h-48 mb-4 rounded-xl overflow-hidden">
                <AnimationComponent progress={progress} />
              </div>

              {/* Title and description */}
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {stage.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {stage.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // Desktop: Full right panel with crossfade transitions
  return (
    <div className="relative h-full flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          {/* Animation container - takes ~50% of height */}
          <div className="relative flex-1 min-h-[200px] mb-6 rounded-2xl overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
              }}
            />
            <div className="relative h-full p-4">
              <AnimationComponent progress={progress} />
            </div>
          </div>

          {/* Stage number badge */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 4px 12px rgba(149, 6, 6, 0.25)',
              }}
            >
              <span className="text-sm font-bold text-white">
                {stage.number}
              </span>
            </div>
            <div
              className="h-px flex-1"
              style={{ background: 'var(--border)' }}
            />
          </div>

          {/* Title */}
          <motion.h3
            className="text-xl md:text-2xl font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {stage.title}
          </motion.h3>

          {/* Description */}
          <motion.p
            className="text-sm md:text-base leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            {stage.description}
          </motion.p>

          {/* Progress indicator */}
          <div className="mt-auto pt-6">
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-hover, #740505))',
                  width: `${progress * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Step {stage.number} of 6
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                {Math.round(progress * 100)}%
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default WorkflowStageDetail
