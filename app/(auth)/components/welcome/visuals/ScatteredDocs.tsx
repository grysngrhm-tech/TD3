'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // Continuous time-based animation
  const [time, setTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 0.02)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Documents with continuous drift - they keep moving while visible
  const documents = [
    { id: 1, label: 'Budget_v3_final.xlsx', baseX: -45, baseY: -35, rotate: -8, colorVar: '--success', driftSpeed: 0.7 },
    { id: 2, label: 'Draw_Request_07.pdf', baseX: 50, baseY: -30, rotate: 12, colorVar: '--info', driftSpeed: 0.9 },
    { id: 3, label: 'Approval_chain.eml', baseX: -55, baseY: 25, rotate: -15, colorVar: '--warning', driftSpeed: 0.6 },
    { id: 4, label: 'Invoice_batch.zip', baseX: 60, baseY: 35, rotate: 8, colorVar: '--error', driftSpeed: 0.8 },
    { id: 5, label: 'Notes.txt', baseX: 5, baseY: 50, rotate: -5, colorVar: '--purple', driftSpeed: 1.0 },
  ]

  // Calculate scatter based on progress + continuous time drift
  const getDocPosition = (doc: typeof documents[0]) => {
    const baseScatter = Math.min(1, progress * 1.5) * 25
    const continuousDrift = Math.sin(time * doc.driftSpeed) * 8
    const continuousDriftY = Math.cos(time * doc.driftSpeed * 0.7) * 5

    return {
      x: doc.baseX + (baseScatter * (doc.baseX > 0 ? 1 : -1)) + continuousDrift,
      y: doc.baseY + (baseScatter * (doc.baseY > 0 ? 1 : -1) * 0.6) + continuousDriftY,
      rotate: doc.rotate + Math.sin(time * doc.driftSpeed * 0.5) * 3,
    }
  }

  return (
    <div className={`relative w-full h-32 md:h-36 ${className}`}>
      {/* Central chaos indicator */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ opacity: progress > 0.3 ? 0.15 : 0 }}
      >
        <motion.div
          className="w-20 h-20 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--error) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Scattered documents with continuous drift */}
      {documents.map((doc, index) => {
        const pos = getDocPosition(doc)

        return (
          <motion.div
            key={doc.id}
            className="absolute top-1/2 left-1/2"
            style={{
              x: pos.x,
              y: pos.y,
              rotate: pos.rotate,
              translateX: '-50%',
              translateY: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: Math.min(1, progress * 2 + 0.3),
              scale: 1,
            }}
            transition={{
              opacity: { duration: 0.3, delay: index * 0.05 },
              scale: { duration: 0.3, delay: index * 0.05 },
            }}
          >
            {/* Document card */}
            <div
              className="relative w-16 md:w-18 p-1.5"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              {/* File icon */}
              <div
                className="w-full h-10 md:h-11 mb-1 flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, var(${doc.colorVar}) 15%, transparent)`,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
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
                className="text-[7px] md:text-[8px] truncate font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {doc.label}
              </p>
            </div>
          </motion.div>
        )
      })}

      {/* Connecting lines that break apart */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: Math.max(0, 0.25 - progress * 0.4) }}
      >
        {[
          { x1: '50%', y1: '50%', x2: '25%', y2: '25%' },
          { x1: '50%', y1: '50%', x2: '75%', y2: '30%' },
          { x1: '50%', y1: '50%', x2: '20%', y2: '65%' },
          { x1: '50%', y1: '50%', x2: '80%', y2: '70%' },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ pathLength: 1 }}
            animate={{ pathLength: Math.max(0, 1 - progress * 1.5) }}
          />
        ))}
      </svg>

      {/* Multiple question marks that float around */}
      {progress > 0.4 && (
        <>
          <motion.div
            className="absolute top-1 right-6 text-base font-bold"
            style={{ color: 'var(--error)' }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: (progress - 0.4) * 1.5,
              scale: 1,
              y: [0, -5, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              y: { repeat: Infinity, duration: 2 },
              rotate: { repeat: Infinity, duration: 3 },
            }}
          >
            ?
          </motion.div>
          <motion.div
            className="absolute bottom-2 left-8 text-sm font-bold"
            style={{ color: 'var(--warning)' }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: (progress - 0.5) * 1.5,
              scale: 1,
              y: [0, -4, 0],
            }}
            transition={{
              y: { repeat: Infinity, duration: 1.8, delay: 0.5 },
            }}
          >
            ?
          </motion.div>
        </>
      )}
    </div>
  )
}

export default ScatteredDocs
