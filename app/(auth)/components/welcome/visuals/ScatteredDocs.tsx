'use client'

import { motion } from 'framer-motion'

interface ScatteredDocsProps {
  progress?: number
  className?: string
}

export function ScatteredDocs({ progress = 0, className = '' }: ScatteredDocsProps) {
  // Documents scatter more as progress increases
  const scatterAmount = progress * 30

  // Using TD3 semantic colors from design language
  const documents = [
    { id: 1, label: 'Budget_v3_final.xlsx', x: -20, y: -15, rotate: -8, colorVar: '--success' },
    { id: 2, label: 'Draw_Request_07.pdf', x: 25, y: -25, rotate: 12, colorVar: '--info' },
    { id: 3, label: 'Approval_chain.eml', x: -30, y: 10, rotate: -15, colorVar: '--warning' },
    { id: 4, label: 'Invoice_batch.zip', x: 35, y: 20, rotate: 8, colorVar: '--error' },
    { id: 5, label: 'Notes.txt', x: 0, y: 30, rotate: -5, colorVar: '--purple' },
  ]

  return (
    <div className={`relative w-full h-48 md:h-64 ${className}`}>
      {/* Central chaos indicator - using error color from design system */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.3 ? 0.15 : 0 }}
      >
        <div
          className="w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--error) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Scattered documents */}
      {documents.map((doc, index) => (
        <motion.div
          key={doc.id}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={{
            x: doc.x + (scatterAmount * (doc.x > 0 ? 1 : -1)),
            y: doc.y + (scatterAmount * (doc.y > 0 ? 1 : -1) * 0.5),
            rotate: doc.rotate + (scatterAmount * (doc.rotate > 0 ? 0.5 : -0.5)),
            opacity: Math.min(1, progress * 2 + 0.3),
          }}
          transition={{
            duration: 0.5,
            delay: index * 0.05,
            ease: [0.22, 1, 0.36, 1], // ease-out equivalent
          }}
        >
          {/* Document card - using TD3 card styling */}
          <div
            className="relative w-20 md:w-24 p-2"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elevation-2)',
            }}
          >
            {/* File icon with semantic color */}
            <div
              className="w-full h-12 md:h-14 mb-1.5 flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, var(${doc.colorVar}) 15%, transparent)`,
                borderRadius: 'var(--radius-md)',
              }}
            >
              <svg
                className="w-6 h-6 md:w-7 md:h-7"
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
              className="text-[8px] md:text-[9px] truncate font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {doc.label}
            </p>
          </div>
        </motion.div>
      ))}

      {/* Connecting lines that break apart */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: Math.max(0, 0.3 - progress * 0.5) }}
      >
        {[
          { x1: '50%', y1: '50%', x2: '30%', y2: '30%' },
          { x1: '50%', y1: '50%', x2: '70%', y2: '25%' },
          { x1: '50%', y1: '50%', x2: '25%', y2: '60%' },
          { x1: '50%', y1: '50%', x2: '75%', y2: '65%' },
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
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 - progress }}
          />
        ))}
      </svg>

      {/* Question marks floating around - representing confusion */}
      {progress > 0.5 && (
        <motion.div
          className="absolute top-2 right-4 text-lg font-bold"
          style={{ color: 'var(--error)' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: (progress - 0.5) * 2,
            scale: 1,
            rotate: [0, 10, -10, 0],
          }}
          transition={{ rotate: { repeat: Infinity, duration: 2 } }}
        >
          ?
        </motion.div>
      )}
    </div>
  )
}

export default ScatteredDocs
