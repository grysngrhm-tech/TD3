'use client'

import { motion, AnimatePresence } from 'framer-motion'

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
  compact?: boolean
  expandInline?: boolean      // Show expanded content inline within the timeline
  showProgressBar?: boolean   // Show progress bar in expanded view
}

export function WorkflowTimeline({
  stages,
  activeStage,
  stageProgress,
  isMobile = false,
  compact = false,
  expandInline = false,
  showProgressBar = false,
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
  // Sizing based on expandInline mode (larger when showing inline content)
  const circleSize = expandInline ? 'w-10 h-10' : compact ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = expandInline ? 'w-5 h-5' : compact ? 'w-4 h-4' : 'w-5 h-5'
  const fontSize = expandInline ? 'text-sm' : compact ? 'text-xs' : 'text-sm'
  const lineLeft = expandInline ? 'left-5' : compact ? 'left-4' : 'left-5'

  return (
    <div className={`relative flex flex-col ${compact ? 'gap-0.5' : expandInline ? 'gap-1' : 'gap-1'} py-2`}>
      {/* Vertical progress line */}
      <div
        className={`absolute ${lineLeft} top-6 bottom-6 w-0.5`}
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
            layout
            className={`relative flex flex-col ${expandInline ? 'pl-2 pr-3 py-2' : compact ? 'pl-1 pr-2 py-1' : 'pl-2 pr-3 py-2'} rounded-xl cursor-default transition-all duration-300`}
            style={{
              background: isActive
                ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))'
                : 'transparent',
              border: isActive
                ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'
                : '1px solid transparent',
              opacity,
              marginTop: index > 0 ? (compact ? '-2px' : expandInline ? '0px' : '-4px') : 0,
              zIndex: isActive ? 10 : stages.length - distance,
            }}
          >
            {/* Stage header row */}
            <div className="flex items-center gap-2">
              {/* Step number circle */}
              <div
                className={`relative z-10 flex items-center justify-center ${circleSize} rounded-full flex-shrink-0 transition-all duration-300`}
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
                    : isCompleted
                    ? '0 0 8px rgba(16, 185, 129, 0.25)'
                    : 'none',
                  transform: isActive ? `scale(${scale})` : `scale(${scale})`,
                }}
              >
                {isCompleted ? (
                  <svg
                    className={`${iconSize} text-white`}
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
                    className={`${fontSize} font-bold`}
                    style={{
                      color: isActive ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {stage.number}
                  </span>
                )}
              </div>

              {/* Stage title - show full title when active and inline, short title otherwise */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`${isActive && expandInline ? 'text-base' : fontSize} font-semibold ${isActive && expandInline ? '' : 'truncate'} transition-colors duration-300`}
                  style={{
                    color: isActive
                      ? 'var(--text-primary)'
                      : isCompleted
                      ? 'var(--text-secondary)'
                      : 'var(--text-muted)',
                  }}
                >
                  {isActive && expandInline ? stage.title : stage.shortTitle}
                </h4>
              </div>

              {/* Active indicator arrow - only show when NOT inline expanding */}
              {isActive && !expandInline && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-shrink-0"
                >
                  <svg
                    className={compact ? 'w-3 h-3' : 'w-4 h-4'}
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
            </div>

            {/* Inline expanded content - only for active stage when expandInline is true */}
            <AnimatePresence>
              {isActive && expandInline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {/* Indented content area - aligns with title */}
                  <div className="pl-12 pr-2 pt-3 pb-2">
                    {/* Description */}
                    <p
                      className="text-sm leading-relaxed mb-4"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {stage.description}
                    </p>

                    {/* Progress bar */}
                    {showProgressBar && (
                      <div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--border)' }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: 'linear-gradient(90deg, var(--accent), var(--accent-hover, #740505))',
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${stageProgress * 100}%` }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          />
                        </div>
                        <div className="flex justify-between mt-2">
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Step {stage.number} of {stages.length}
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {Math.round(stageProgress * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

export default WorkflowTimeline
