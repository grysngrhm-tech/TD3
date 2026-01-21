'use client'

import { motion } from 'framer-motion'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past

  // Continuous chaos system - builds quickly and stays intense
  const chaosIntensity = Math.min(1, progress * 1.8)  // Reaches full intensity by ~55%
  const turbulence = Math.sin(progress * 12) * 0.3   // Oscillating turbulence for jitter

  // Documents with base positions - slightly wider initial spread
  const documents = [
    { id: 1, label: 'Budget_v3_final.xlsx', baseX: -40, baseY: -28, baseRotate: -8, colorVar: '--success' },
    { id: 2, label: 'Draw_Request_07.pdf', baseX: 45, baseY: -22, baseRotate: 12, colorVar: '--info' },
    { id: 3, label: 'Approval_chain.eml', baseX: -50, baseY: 22, baseRotate: -15, colorVar: '--warning' },
    { id: 4, label: 'Invoice_batch.zip', baseX: 55, baseY: 28, baseRotate: 10, colorVar: '--error' },
    { id: 5, label: 'Notes.txt', baseX: 8, baseY: 45, baseRotate: -5, colorVar: '--purple' },
  ]

  // Calculate document position - continuous expansion with chaos
  const getDocPosition = (doc: typeof documents[0], docIndex: number) => {
    // Continuous horizontal spread (1.0 -> 2.2 range)
    const horizontalMultiplier = 1 + chaosIntensity * 1.2 + turbulence

    // Vertical spread also increases
    const verticalMultiplier = 1 + chaosIntensity * 0.6 + turbulence * 0.5

    // Swirl motion throughout (not just at contraction)
    const swirlAngle = progress * 90 * (docIndex % 2 === 0 ? 1 : -1)
    const swirlRad = (swirlAngle * Math.PI) / 180
    const swirlRadius = chaosIntensity * 25

    const baseScatterX = doc.baseX * horizontalMultiplier
    const baseScatterY = doc.baseY * verticalMultiplier

    // Apply swirl offset
    const swirlOffsetX = Math.cos(swirlRad + docIndex * 1.3) * swirlRadius
    const swirlOffsetY = Math.sin(swirlRad + docIndex * 1.3) * swirlRadius

    const scatterX = baseScatterX + swirlOffsetX
    const scatterY = baseScatterY + swirlOffsetY

    // Aggressive rotation - triple intensity
    const rotation = doc.baseRotate * (1 + chaosIntensity * 3 + turbulence * 2)

    return {
      x: scatterX,
      y: scatterY,
      rotate: rotation,
    }
  }

  // Question marks appear earlier (at 20% instead of 30%) and more of them (cap at 6)
  const questionMarkCount = Math.min(6, Math.floor((Math.min(progress, 1.2) - 0.2) * 6))

  return (
    <div className={`relative w-full h-28 md:h-32 ${className}`}>
      {/* Central chaos indicator - grows with progress */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: progress > 0.2 ? Math.min(0.2, (progress - 0.2) * 0.4) : 0 }}
      >
        <div
          className="rounded-full"
          style={{
            width: 60 + (progress * 40),
            height: 60 + (progress * 40),
            background: 'radial-gradient(circle, var(--error) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Scattered documents - positions driven by scroll progress */}
      {documents.map((doc, index) => {
        const pos = getDocPosition(doc, index)
        // Stagger appearance based on index
        const appearProgress = Math.max(0, Math.min(1, (progress - index * 0.05) * 3))

        return (
          <div
            key={doc.id}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg)`,
              opacity: appearProgress,
            }}
          >
            {/* Document card */}
            <div
              className="relative w-14 md:w-16 p-1"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              {/* File icon */}
              <div
                className="w-full h-8 md:h-9 mb-0.5 flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, var(${doc.colorVar}) 15%, transparent)`,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  style={{ color: `var(${doc.colorVar})` }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {/* Filename */}
              <p
                className="text-[6px] md:text-[7px] truncate font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {doc.label}
              </p>
            </div>
          </div>
        )
      })}

      {/* Connecting lines that break apart with progress */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: Math.max(0, 0.3 - progress * 0.4) }}
      >
        {[
          { x1: '50%', y1: '50%', x2: '25%', y2: '30%' },
          { x1: '50%', y1: '50%', x2: '75%', y2: '35%' },
          { x1: '50%', y1: '50%', x2: '22%', y2: '60%' },
          { x1: '50%', y1: '50%', x2: '78%', y2: '65%' },
        ].map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
            style={{
              strokeDashoffset: progress * 20,
            }}
          />
        ))}
      </svg>

      {/* Question marks - chaotic movement with documents */}
      {questionMarkCount > 0 && (
        <>
          {[
            // Base positions that will be affected by chaos
            { baseX: 65, baseY: -18, size: 'text-sm', color: '--error' },
            { baseX: -60, baseY: 12, size: 'text-xs', color: '--warning' },
            { baseX: 72, baseY: 22, size: 'text-base', color: '--error' },
            { baseX: -68, baseY: -10, size: 'text-sm', color: '--warning' },
            { baseX: 10, baseY: -35, size: 'text-xs', color: '--error' },
            { baseX: -15, baseY: 38, size: 'text-sm', color: '--warning' },
          ].slice(0, questionMarkCount).map((qm, i) => {
            // Question marks participate in chaos - expand and swirl
            const qmExpand = 1 + chaosIntensity * 0.4
            const qmSwirlAngle = progress * 120 * (i % 2 === 0 ? 1 : -1)
            const qmSwirlRad = (qmSwirlAngle * Math.PI) / 180
            const qmSwirlRadius = chaosIntensity * 15

            const qmX = qm.baseX * qmExpand + Math.cos(qmSwirlRad + i * 0.8) * qmSwirlRadius
            const qmY = qm.baseY * qmExpand + Math.sin(qmSwirlRad + i * 0.8) * qmSwirlRadius

            // Wild rotation for question marks
            const wobbleRotation = progress * 60 * (i % 2 === 0 ? 1 : -1) + turbulence * 30

            return (
              <div
                key={i}
                className={`absolute top-1/2 left-1/2 ${qm.size} font-bold`}
                style={{
                  color: `var(${qm.color})`,
                  transform: `translate(-50%, -50%) translate(${qmX}px, ${qmY}px) rotate(${wobbleRotation}deg)`,
                  opacity: Math.min(1, (progress - 0.2 - i * 0.08) * 4),
                }}
              >
                ?
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default ScatteredDocs
