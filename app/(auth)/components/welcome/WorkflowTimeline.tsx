'use client'

import { motion } from 'framer-motion'

export interface StageData {
  id: string
  number: number
  title: string
  shortTitle: string
  description: string
  icon: React.ReactNode
}

interface WorkflowTimelineProps {
  stages: StageData[]
  activeStage: number // 0-5
  stageProgress: number // 0-1 within current stage
  isMobile?: boolean
}

export function WorkflowTimeline({
  stages,
  activeStage,
  stageProgress,
  isMobile = false,
}: WorkflowTimelineProps) {
  // Calculate overall progress for the vertical line fill
  const overallProgress = (activeStage + stageProgress) / stages.length

  if (isMobile) {
    // Mobile: Horizontal compact list at top
    return (
      <div className="flex items-center justify-between gap-1 px-2 py-3">
        {stages.map((stage, index) => {
          const isActive = index === activeStage
          const isCompleted = index < activeStage
          const isPending = index > activeStage

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Step indicator */}
              <div
                className="relative flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all duration-300"
                style={{
                  background: isActive
                    ? 'var(--accent)'
                    : isCompleted
                    ? 'var(--success)'
                    : 'var(--bg-secondary)',
                  border: `2px solid ${
                    isActive
                      ? 'var(--accent)'
                      : isCompleted
                      ? 'var(--success)'
                      : 'var(--border)'
                  }`,
                  boxShadow: isActive
                    ? '0 0 16px rgba(149, 6, 6, 0.4)'
                    : 'none',
                  transform: `scale(${isActive ? 1.1 : 1})`,
                }}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: isActive ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {stage.number}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {index < stages.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1"
                  style={{
                    background:
                      index < activeStage
                        ? 'var(--success)'
                        : 'var(--border)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Desktop: Vertical stacked cards with progress line
  return (
    <div className="relative flex flex-col gap-1 py-4">
      {/* Vertical progress line */}
      <div
        className="absolute left-5 top-8 bottom-8 w-0.5"
        style={{ background: 'var(--border)' }}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute top-0 left-0 w-full"
          style={{
            background: 'linear-gradient(180deg, var(--accent) 0%, var(--success) 100%)',
            height: `${overallProgress * 100}%`,
          }}
        />
      </div>

      {/* Stage cards */}
      {stages.map((stage, index) => {
        const isActive = index === activeStage
        const isCompleted = index < activeStage
        const isPending = index > activeStage

        // Calculate opacity and scale based on distance from active
        const distance = Math.abs(index - activeStage)
        const opacity = isActive ? 1 : isCompleted ? 0.7 : 0.4
        const scale = isActive ? 1 : 0.95

        return (
          <motion.div
            key={stage.id}
            className="relative flex items-center gap-3 pl-2 pr-3 py-2 rounded-xl cursor-default transition-all duration-300"
            style={{
              background: isActive
                ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))'
                : 'transparent',
              border: isActive
                ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'
                : '1px solid transparent',
              opacity,
              transform: `scale(${scale})`,
              marginTop: index > 0 ? '-4px' : 0, // Slight overlap for stacking effect
              zIndex: isActive ? 10 : stages.length - distance,
            }}
          >
            {/* Step number circle */}
            <div
              className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-all duration-300"
              style={{
                background: isActive
                  ? 'var(--accent)'
                  : isCompleted
                  ? 'var(--success)'
                  : 'var(--bg-secondary)',
                border: `2px solid ${
                  isActive
                    ? 'var(--accent)'
                    : isCompleted
                    ? 'var(--success)'
                    : 'var(--border)'
                }`,
                boxShadow: isActive
                  ? '0 0 20px rgba(149, 6, 6, 0.5)'
                  : isCompleted
                  ? '0 0 12px rgba(16, 185, 129, 0.3)'
                  : 'none',
              }}
            >
              {isCompleted ? (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span
                  className="text-sm font-bold"
                  style={{
                    color: isActive ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {stage.number}
                </span>
              )}
            </div>

            {/* Stage title */}
            <div className="flex-1 min-w-0">
              <h4
                className="text-sm font-semibold truncate transition-colors duration-300"
                style={{
                  color: isActive
                    ? 'var(--text-primary)'
                    : isCompleted
                    ? 'var(--text-secondary)'
                    : 'var(--text-muted)',
                }}
              >
                {stage.shortTitle}
              </h4>
            </div>

            {/* Active indicator arrow */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export default WorkflowTimeline
