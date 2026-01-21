'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // Detect mobile for simplified rendering
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // All values derived from scroll progress - no time-based state
  // Progress can exceed 1 as user scrolls past

  // === PHASE CALCULATIONS ===
  // Phase A: Emergence (0-40%) - documents expand and begin knotting
  // Phase B: Escalation (40-100%) - chaos intensifies, no settling
  const phaseA = Math.min(1, progress * 2.5)  // 0-40%: rise to 1
  const phaseB = Math.max(0, (progress - 0.4) / 0.6)  // 40-100%: 0→1

  // Combined intensity that only grows (never shrinks)
  // Reduced multiplier for more restrained escalation
  const chaosIntensity = phaseA + phaseB * 0.8

  // Documents with final expanded positions and orbital parameters
  // They START overlapping in center and expand outward while orbiting
  const allDocuments = [
    { id: 1, label: 'Budget_v3_final.xlsx', finalX: -55, finalY: -35, orbitSpeed: 1.2, orbitRadius: 20, colorVar: '--success', lissA: 3, lissB: 2 },
    { id: 2, label: 'Draw_Request_07.pdf', finalX: 60, finalY: -30, orbitSpeed: -0.9, orbitRadius: 25, colorVar: '--info', lissA: 4, lissB: 3 },
    { id: 3, label: 'Approval_chain.eml', finalX: -65, finalY: 30, orbitSpeed: 1.5, orbitRadius: 22, colorVar: '--warning', lissA: 5, lissB: 2 },
    { id: 4, label: 'Invoice_batch.zip', finalX: 70, finalY: 35, orbitSpeed: -1.1, orbitRadius: 28, colorVar: '--error', lissA: 3, lissB: 4 },
    { id: 5, label: 'Notes.txt', finalX: 5, finalY: 55, orbitSpeed: 0.8, orbitRadius: 18, colorVar: '--purple', lissA: 4, lissB: 5 },
  ]

  // Mobile: show fewer documents for cleaner visual
  const documents = isMobile ? allDocuments.slice(0, 3) : allDocuments

  // Mobile-specific multiplier for reduced motion/spread
  const mobileScale = isMobile ? 0.5 : 1

  // Calculate document position with escalating knotting/orbital motion
  const getDocPosition = (doc: typeof allDocuments[0], docIndex: number) => {
    // === EXPANSION ===
    const expandProgress = Math.min(1, progress * 1.5)
    const easedExpand = 1 - Math.pow(1 - expandProgress, 3)

    // Spread multiplier: grows from 1 to 1.4 in second half
    // Documents venture modestly beyond original positions
    // On mobile, reduce spread to 50% of desktop
    const spreadMultiplier = (1 + phaseB * 0.4) * mobileScale

    // Base position (spreads wider over time)
    const baseX = doc.finalX * easedExpand * spreadMultiplier
    const baseY = doc.finalY * easedExpand * spreadMultiplier

    // === ORBITAL MOTION (Escalating) ===
    // On mobile, reduce orbital motion
    const knotProgress = progress * doc.orbitSpeed * 4 * mobileScale
    const knotAngle = knotProgress * Math.PI * 2

    // Orbit radius GROWS in second half (not shrinks!)
    // Phase A: normal growth to full radius
    // Phase B: continues growing modestly (1.5x additional)
    // On mobile, reduce orbit radius
    const baseOrbitRadius = doc.orbitRadius * phaseA * mobileScale
    const escalatedOrbitRadius = doc.orbitRadius * phaseB * 1.5 * mobileScale
    const currentOrbitRadius = baseOrbitRadius + escalatedOrbitRadius

    const orbitX = Math.cos(knotAngle + docIndex * 1.25) * currentOrbitRadius
    const orbitY = Math.sin(knotAngle + docIndex * 1.25) * currentOrbitRadius

    // === LISSAJOUS LOOPING (Subtle patterns in second half) ===
    // Creates elegant figure-8 and pretzel-like patterns
    // Skip on mobile for simpler motion
    const lissajousDelta = (docIndex * Math.PI) / 5
    const lissajousAmplitude = isMobile ? 0 : phaseB * 20

    const lissX = Math.sin(doc.lissA * knotAngle + lissajousDelta) * lissajousAmplitude
    const lissY = Math.sin(doc.lissB * knotAngle) * lissajousAmplitude * 0.7

    // === MULTI-LAYER TURBULENCE ===
    // Three harmonic waves for organic, chaotic motion (restrained)
    // Reduce on mobile
    const turbulenceScale = (1 + phaseB * 0.6) * mobileScale
    const t1 = Math.sin(progress * 15 + docIndex * 2) * 4
    const t2 = Math.sin(progress * 23 + docIndex * 3.5) * 5 * phaseB
    const t3 = Math.cos(progress * 37 + docIndex * 1.7) * 6 * phaseB
    const turbulence = (t1 + t2 + t3) * turbulenceScale

    // === FINAL POSITION ===
    const finalX = baseX + orbitX + lissX + turbulence
    const finalY = baseY + orbitY + lissY + turbulence * 0.7

    // === ROTATION (Gradually accelerating) ===
    // On mobile, use gentler rotation
    const spinAcceleration = isMobile ? 1 : (1 + phaseB * 0.6)
    const spinRotation = knotProgress * (isMobile ? 90 : 180) * spinAcceleration * (docIndex % 2 === 0 ? 1 : -1)
    const wobble = Math.sin(progress * 12 + docIndex) * (isMobile ? 6 : 12) * chaosIntensity
    const spinJitter = isMobile ? 0 : Math.sin(progress * 30 + docIndex * 4) * 15 * phaseB
    const totalRotation = spinRotation + wobble + spinJitter

    return {
      x: finalX,
      y: finalY,
      rotate: totalRotation,
      scale: 0.85 + easedExpand * 0.15 - phaseB * 0.05,
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
    <div className={`relative w-full h-44 sm:h-52 md:h-64 ${className}`}>
      {/* Central chaos vortex - grows subtly in second half */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.15 + phaseB * 0.1 }}
      >
        <div
          className="rounded-full"
          style={{
            width: (40 + chaosIntensity * 45) * mobileScale,
            height: (40 + chaosIntensity * 45) * mobileScale,
            background: 'radial-gradient(circle, var(--error) 0%, transparent 70%)',
            transform: `rotate(${progress * 360}deg)`,
          }}
        />
      </div>

      {/* Spiral lines showing the knotting motion - hidden on mobile for simplicity */}
      {!isMobile && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.15 + chaosIntensity * 0.15 }}
        >
          <defs>
            <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--error)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: spiralCount }).map((_, i) => {
            const angle = progress * 360 * 2 + i * (360 / spiralCount)
            const radius = 20 + chaosIntensity * 25 + phaseB * 15
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
      )}

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
                className="text-[10px] sm:text-[6px] md:text-[7px] truncate font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {doc.label}
              </p>
            </div>
          </div>
        )
      })}

      {/* Question marks - swirl in the chaos, hidden on mobile for simplicity */}
      {!isMobile && questionMarkCount > 0 && (
        <>
          {[
            { angle: 0, distance: 70, size: 'text-sm', color: '--error' },
            { angle: 45, distance: 65, size: 'text-xs', color: '--warning' },
            { angle: 90, distance: 72, size: 'text-base', color: '--error' },
            { angle: 135, distance: 68, size: 'text-sm', color: '--warning' },
            { angle: 180, distance: 70, size: 'text-xs', color: '--error' },
            { angle: 225, distance: 64, size: 'text-sm', color: '--warning' },
            { angle: 270, distance: 74, size: 'text-base', color: '--error' },
            { angle: 315, distance: 66, size: 'text-xs', color: '--warning' },
          ].slice(0, questionMarkCount).map((qm, i) => {
            // Question marks orbit moderately faster in second half
            const orbitSpeed = 200 + phaseB * 120
            const orbitAngle = (qm.angle - progress * orbitSpeed) * (Math.PI / 180)

            // Distance grows modestly with chaos
            const currentDistance = qm.distance * (0.6 + chaosIntensity * 0.3)
            const qmX = Math.cos(orbitAngle) * currentDistance * 0.9
            const qmY = Math.sin(orbitAngle) * currentDistance * 0.7

            // Spin faster in second half (restrained)
            const spinSpeed = 300 + phaseB * 180
            const spin = progress * spinSpeed * (i % 2 === 0 ? 1 : -1)

            // Scale pulses subtly in second half
            const scale = 1 + Math.sin(progress * 20 + i * 2) * 0.15 * phaseB

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
