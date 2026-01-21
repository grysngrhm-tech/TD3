'use client'

import { motion } from 'framer-motion'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past

  // === PHASE CALCULATIONS ===
  // Phase A: Emergence (0-40%) - documents expand and begin knotting
  // Phase B: Escalation (40-100%) - chaos intensifies, no settling
  const phaseA = Math.min(1, progress * 2.5)  // 0-40%: rise to 1
  const phaseB = Math.max(0, (progress - 0.4) / 0.6)  // 40-100%: 0→1

  // Combined intensity that only grows (never shrinks)
  const chaosIntensity = phaseA + phaseB * 1.5

  // Documents with final expanded positions and orbital parameters
  // They START overlapping in center and expand outward while orbiting
  const documents = [
    { id: 1, label: 'Budget_v3_final.xlsx', finalX: -55, finalY: -35, orbitSpeed: 1.2, orbitRadius: 20, colorVar: '--success', lissA: 3, lissB: 2 },
    { id: 2, label: 'Draw_Request_07.pdf', finalX: 60, finalY: -30, orbitSpeed: -0.9, orbitRadius: 25, colorVar: '--info', lissA: 4, lissB: 3 },
    { id: 3, label: 'Approval_chain.eml', finalX: -65, finalY: 30, orbitSpeed: 1.5, orbitRadius: 22, colorVar: '--warning', lissA: 5, lissB: 2 },
    { id: 4, label: 'Invoice_batch.zip', finalX: 70, finalY: 35, orbitSpeed: -1.1, orbitRadius: 28, colorVar: '--error', lissA: 3, lissB: 4 },
    { id: 5, label: 'Notes.txt', finalX: 5, finalY: 55, orbitSpeed: 0.8, orbitRadius: 18, colorVar: '--purple', lissA: 4, lissB: 5 },
  ]

  // Calculate document position with escalating knotting/orbital motion
  const getDocPosition = (doc: typeof documents[0], docIndex: number) => {
    // === EXPANSION ===
    const expandProgress = Math.min(1, progress * 1.5)
    const easedExpand = 1 - Math.pow(1 - expandProgress, 3)

    // Spread multiplier: grows from 1 to 2.5 in second half
    // Documents venture far beyond original positions
    const spreadMultiplier = 1 + phaseB * 1.5

    // Base position (spreads wider over time)
    const baseX = doc.finalX * easedExpand * spreadMultiplier
    const baseY = doc.finalY * easedExpand * spreadMultiplier

    // === ORBITAL MOTION (Escalating) ===
    const knotProgress = progress * doc.orbitSpeed * 4
    const knotAngle = knotProgress * Math.PI * 2

    // Orbit radius GROWS in second half (not shrinks!)
    // Phase A: normal growth to full radius
    // Phase B: continues growing to 3x
    const baseOrbitRadius = doc.orbitRadius * phaseA
    const escalatedOrbitRadius = doc.orbitRadius * phaseB * 3
    const currentOrbitRadius = baseOrbitRadius + escalatedOrbitRadius

    const orbitX = Math.cos(knotAngle + docIndex * 1.25) * currentOrbitRadius
    const orbitY = Math.sin(knotAngle + docIndex * 1.25) * currentOrbitRadius

    // === LISSAJOUS LOOPING (Wild patterns in second half) ===
    // Creates elegant figure-8 and pretzel-like patterns
    const lissajousDelta = (docIndex * Math.PI) / 5
    const lissajousAmplitude = phaseB * 60  // Grows to 60px in second half

    const lissX = Math.sin(doc.lissA * knotAngle + lissajousDelta) * lissajousAmplitude
    const lissY = Math.sin(doc.lissB * knotAngle) * lissajousAmplitude * 0.7

    // === MULTI-LAYER TURBULENCE ===
    // Three harmonic waves for unpredictable, chaotic motion
    const turbulenceScale = 1 + phaseB * 2  // 1x → 3x
    const t1 = Math.sin(progress * 15 + docIndex * 2) * 5
    const t2 = Math.sin(progress * 23 + docIndex * 3.5) * 8 * phaseB
    const t3 = Math.cos(progress * 37 + docIndex * 1.7) * 12 * phaseB
    const turbulence = (t1 + t2 + t3) * turbulenceScale

    // === FINAL POSITION ===
    const finalX = baseX + orbitX + lissX + turbulence
    const finalY = baseY + orbitY + lissY + turbulence * 0.7

    // === ROTATION (Accelerating) ===
    const spinAcceleration = 1 + phaseB * 2  // 1x → 3x speed
    const spinRotation = knotProgress * 180 * spinAcceleration * (docIndex % 2 === 0 ? 1 : -1)
    const wobble = Math.sin(progress * 12 + docIndex) * 15 * chaosIntensity
    const spinJitter = Math.sin(progress * 30 + docIndex * 4) * 30 * phaseB
    const totalRotation = spinRotation + wobble + spinJitter

    return {
      x: finalX,
      y: finalY,
      rotate: totalRotation,
      scale: 0.85 + easedExpand * 0.15 - phaseB * 0.05,  // Slightly smaller when chaotic
    }
  }

  // Z-index changes during animation to show documents passing over/under each other
  const getZIndex = (docIndex: number) => {
    const phase = (progress * 3 + docIndex * 0.4) % 1
    return Math.floor(phase * 10)
  }

  // Question marks appear and swirl in the chaos - more in second half
  const questionMarkCount = Math.min(8, Math.floor(progress * 10))

  // Spiral line count increases in second half
  const spiralCount = 3 + Math.floor(phaseB * 3)  // 3 → 6 spirals

  return (
    <div className={`relative w-full h-32 md:h-36 ${className}`}>
      {/* Central chaos vortex - grows in second half instead of fading */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.2 + phaseB * 0.15 }}
      >
        <div
          className="rounded-full"
          style={{
            width: 40 + chaosIntensity * 80,
            height: 40 + chaosIntensity * 80,
            background: 'radial-gradient(circle, var(--error) 0%, transparent 70%)',
            transform: `rotate(${progress * 360}deg)`,
          }}
        />
      </div>

      {/* Spiral lines showing the knotting motion - more and larger in second half */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.2 + chaosIntensity * 0.2 }}
      >
        <defs>
          <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--error)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: spiralCount }).map((_, i) => {
          const angle = progress * 360 * 2 + i * (360 / spiralCount)
          const radius = 20 + chaosIntensity * 40 + phaseB * 30
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

      {/* Scattered documents - start overlapping, expand with escalating knotting motion */}
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
                boxShadow: `var(--elevation-2), 0 0 ${chaosIntensity * 10}px rgba(0,0,0,0.1)`,
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

      {/* Question marks - swirl in the chaos, more and faster in second half */}
      {questionMarkCount > 0 && (
        <>
          {[
            { angle: 0, distance: 75, size: 'text-sm', color: '--error' },
            { angle: 45, distance: 70, size: 'text-xs', color: '--warning' },
            { angle: 90, distance: 80, size: 'text-base', color: '--error' },
            { angle: 135, distance: 72, size: 'text-sm', color: '--warning' },
            { angle: 180, distance: 78, size: 'text-xs', color: '--error' },
            { angle: 225, distance: 68, size: 'text-sm', color: '--warning' },
            { angle: 270, distance: 82, size: 'text-base', color: '--error' },
            { angle: 315, distance: 74, size: 'text-xs', color: '--warning' },
          ].slice(0, questionMarkCount).map((qm, i) => {
            // Question marks orbit faster in second half
            const orbitSpeed = 200 + phaseB * 300
            const orbitAngle = (qm.angle - progress * orbitSpeed) * (Math.PI / 180)

            // Distance grows with chaos
            const currentDistance = qm.distance * (0.6 + chaosIntensity * 0.5)
            const qmX = Math.cos(orbitAngle) * currentDistance * 0.9
            const qmY = Math.sin(orbitAngle) * currentDistance * 0.7

            // Spin wildly - faster in second half
            const spinSpeed = 300 + phaseB * 400
            const spin = progress * spinSpeed * (i % 2 === 0 ? 1 : -1)

            // Scale pulses in second half
            const scale = 1 + Math.sin(progress * 20 + i * 2) * 0.2 * phaseB

            return (
              <div
                key={i}
                className={`absolute top-1/2 left-1/2 ${qm.size} font-bold`}
                style={{
                  color: `var(${qm.color})`,
                  transform: `translate(-50%, -50%) translate(${qmX}px, ${qmY}px) rotate(${spin}deg) scale(${scale})`,
                  opacity: Math.min(1, (progress - 0.1 - i * 0.03) * 5),
                  textShadow: phaseB > 0.5 ? `0 0 ${phaseB * 8}px var(${qm.color})` : 'none',
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
