'use client'

import { motion } from 'framer-motion'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past

  // Documents with final expanded positions and orbital parameters
  // They START overlapping in center and expand outward while orbiting
  const documents = [
    { id: 1, label: 'Budget_v3_final.xlsx', finalX: -55, finalY: -35, orbitSpeed: 1.2, orbitRadius: 20, colorVar: '--success' },
    { id: 2, label: 'Draw_Request_07.pdf', finalX: 60, finalY: -30, orbitSpeed: -0.9, orbitRadius: 25, colorVar: '--info' },
    { id: 3, label: 'Approval_chain.eml', finalX: -65, finalY: 30, orbitSpeed: 1.5, orbitRadius: 22, colorVar: '--warning' },
    { id: 4, label: 'Invoice_batch.zip', finalX: 70, finalY: 35, orbitSpeed: -1.1, orbitRadius: 28, colorVar: '--error' },
    { id: 5, label: 'Notes.txt', finalX: 5, finalY: 55, orbitSpeed: 0.8, orbitRadius: 18, colorVar: '--purple' },
  ]

  // Calculate document position with knotting/orbital motion
  const getDocPosition = (doc: typeof documents[0], docIndex: number) => {
    // Expansion: documents start at center (0,0) and move to final positions
    // Use easeOutCubic for natural expansion feel
    const expandProgress = Math.min(1, progress * 1.5)
    const easedExpand = 1 - Math.pow(1 - expandProgress, 3)

    // Base position interpolates from center to final
    const baseX = doc.finalX * easedExpand
    const baseY = doc.finalY * easedExpand

    // Knotting motion: documents orbit around their path as they expand
    // This creates the "tying in a knot" effect - they weave around each other
    const knotProgress = progress * doc.orbitSpeed * 4 // Multiple rotations
    const knotAngle = knotProgress * Math.PI * 2

    // Orbit radius grows then shrinks - maximum chaos in middle of animation
    const orbitIntensity = Math.sin(Math.min(1, progress * 1.2) * Math.PI) // Peaks at ~42% progress
    const currentOrbitRadius = doc.orbitRadius * orbitIntensity

    // Apply orbital offset - documents spiral around each other
    const orbitX = Math.cos(knotAngle + docIndex * 1.25) * currentOrbitRadius
    const orbitY = Math.sin(knotAngle + docIndex * 1.25) * currentOrbitRadius

    // Additional turbulence for chaotic feel
    const turbulence = Math.sin(progress * 15 + docIndex * 2) * 5 * orbitIntensity

    const finalX = baseX + orbitX + turbulence
    const finalY = baseY + orbitY + turbulence * 0.7

    // Rotation: documents spin as they orbit - creates visual chaos
    // Multiple full rotations during the knotting phase
    const spinRotation = knotProgress * 180 * (docIndex % 2 === 0 ? 1 : -1)
    // Add wobble
    const wobble = Math.sin(progress * 12 + docIndex) * 15 * orbitIntensity
    const totalRotation = spinRotation + wobble

    return {
      x: finalX,
      y: finalY,
      rotate: totalRotation,
      scale: 0.85 + easedExpand * 0.15, // Slightly grow as they expand
    }
  }

  // Z-index changes during animation to show documents passing over/under each other
  const getZIndex = (docIndex: number) => {
    const phase = (progress * 3 + docIndex * 0.4) % 1
    return Math.floor(phase * 10)
  }

  // Question marks appear and swirl in the chaos
  const questionMarkCount = Math.min(6, Math.floor(Math.max(0, progress - 0.15) * 8))

  // Chaos intensity for effects
  const chaosIntensity = Math.sin(Math.min(1, progress * 1.2) * Math.PI)

  return (
    <div className={`relative w-full h-32 md:h-36 ${className}`}>
      {/* Central chaos vortex - visible during peak chaos */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: chaosIntensity * 0.25 }}
      >
        <div
          className="rounded-full"
          style={{
            width: 40 + chaosIntensity * 60,
            height: 40 + chaosIntensity * 60,
            background: 'radial-gradient(circle, var(--error) 0%, transparent 70%)',
            transform: `rotate(${progress * 180}deg)`,
          }}
        />
      </div>

      {/* Spiral lines showing the knotting motion */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: chaosIntensity * 0.3 }}
      >
        <defs>
          <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--error)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((i) => {
          const angle = progress * 360 * 2 + i * 120
          const radius = 20 + chaosIntensity * 30
          const cx = 50 + Math.cos((angle * Math.PI) / 180) * radius * 0.3
          const cy = 50 + Math.sin((angle * Math.PI) / 180) * radius * 0.3
          return (
            <circle
              key={i}
              cx={`${cx}%`}
              cy={`${cy}%`}
              r={radius}
              fill="none"
              stroke="url(#spiralGradient)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          )
        })}
      </svg>

      {/* Scattered documents - start overlapping, expand with knotting motion */}
      {documents.map((doc, index) => {
        const pos = getDocPosition(doc, index)
        const zIndex = getZIndex(index)
        // All docs visible from start since they're overlapping
        const opacity = Math.min(1, progress * 4 + 0.3)

        return (
          <div
            key={doc.id}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg) scale(${pos.scale})`,
              opacity,
              zIndex,
              transition: 'z-index 0.1s',
            }}
          >
            {/* Document card */}
            <div
              className="relative w-14 md:w-16 p-1"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: `var(--elevation-2), 0 0 ${chaosIntensity * 8}px rgba(0,0,0,0.1)`,
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

      {/* Question marks - swirl in the chaos */}
      {questionMarkCount > 0 && (
        <>
          {[
            { angle: 0, distance: 75, size: 'text-sm', color: '--error' },
            { angle: 60, distance: 70, size: 'text-xs', color: '--warning' },
            { angle: 120, distance: 80, size: 'text-base', color: '--error' },
            { angle: 180, distance: 72, size: 'text-sm', color: '--warning' },
            { angle: 240, distance: 78, size: 'text-xs', color: '--error' },
            { angle: 300, distance: 68, size: 'text-sm', color: '--warning' },
          ].slice(0, questionMarkCount).map((qm, i) => {
            // Question marks orbit in opposite direction to documents
            const orbitAngle = (qm.angle - progress * 200) * (Math.PI / 180)
            const currentDistance = qm.distance * (0.6 + chaosIntensity * 0.4)
            const qmX = Math.cos(orbitAngle) * currentDistance * 0.9
            const qmY = Math.sin(orbitAngle) * currentDistance * 0.7

            // Spin wildly
            const spin = progress * 300 * (i % 2 === 0 ? 1 : -1)

            return (
              <div
                key={i}
                className={`absolute top-1/2 left-1/2 ${qm.size} font-bold`}
                style={{
                  color: `var(${qm.color})`,
                  transform: `translate(-50%, -50%) translate(${qmX}px, ${qmY}px) rotate(${spin}deg)`,
                  opacity: Math.min(1, (progress - 0.15 - i * 0.05) * 5),
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
