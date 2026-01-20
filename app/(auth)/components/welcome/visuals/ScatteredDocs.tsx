'use client'

import { motion } from 'framer-motion'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past

  // Scatter intensity increases with progress
  const scatterIntensity = progress * 1.5

  // At high progress, documents fly toward edges
  const deconstructAmount = Math.max(0, (progress - 0.7) * 3)

  // Documents with base positions - scatter outward based on progress
  const documents = [
    { id: 1, label: 'Budget_v3_final.xlsx', baseX: -35, baseY: -25, baseRotate: -5, colorVar: '--success' },
    { id: 2, label: 'Draw_Request_07.pdf', baseX: 40, baseY: -20, baseRotate: 8, colorVar: '--info' },
    { id: 3, label: 'Approval_chain.eml', baseX: -45, baseY: 20, baseRotate: -12, colorVar: '--warning' },
    { id: 4, label: 'Invoice_batch.zip', baseX: 50, baseY: 25, baseRotate: 6, colorVar: '--error' },
    { id: 5, label: 'Notes.txt', baseX: 5, baseY: 40, baseRotate: -3, colorVar: '--purple' },
  ]

  // Calculate document position based on progress
  const getDocPosition = (doc: typeof documents[0]) => {
    // Base scatter from progress
    const scatterX = doc.baseX * (1 + scatterIntensity * 0.8)
    const scatterY = doc.baseY * (1 + scatterIntensity * 0.6)

    // Extra scatter at high progress - documents fly toward screen edges
    const edgePush = deconstructAmount * 80
    const edgeX = doc.baseX > 0 ? edgePush : -edgePush
    const edgeY = doc.baseY > 0 ? edgePush * 0.5 : -edgePush * 0.5

    // Rotation increases with scatter
    const rotation = doc.baseRotate * (1 + scatterIntensity * 0.5 + deconstructAmount * 2)

    return {
      x: scatterX + edgeX,
      y: scatterY + edgeY,
      rotate: rotation,
    }
  }

  // Question marks appear and multiply at higher progress
  const questionMarkCount = Math.min(4, Math.floor((progress - 0.3) * 6))

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
        const pos = getDocPosition(doc)
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

      {/* Question marks - appear and scatter at higher progress */}
      {questionMarkCount > 0 && (
        <>
          {[
            { x: 70 + deconstructAmount * 30, y: -25 - deconstructAmount * 20, size: 'text-sm', color: '--error' },
            { x: -65 - deconstructAmount * 25, y: 30 + deconstructAmount * 15, size: 'text-xs', color: '--warning' },
            { x: 80 + deconstructAmount * 40, y: 35 + deconstructAmount * 25, size: 'text-base', color: '--error' },
            { x: -75 - deconstructAmount * 35, y: -20 - deconstructAmount * 20, size: 'text-sm', color: '--warning' },
          ].slice(0, questionMarkCount).map((qm, i) => (
            <div
              key={i}
              className={`absolute top-1/2 left-1/2 ${qm.size} font-bold`}
              style={{
                color: `var(${qm.color})`,
                transform: `translate(-50%, -50%) translate(${qm.x}px, ${qm.y}px)`,
                opacity: Math.min(1, (progress - 0.3 - i * 0.1) * 3),
              }}
            >
              ?
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default ScatteredDocs
