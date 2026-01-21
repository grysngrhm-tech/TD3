'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from './LoginForm'

interface HeroSectionProps {
  redirectTo?: string
  /** Rotating accent word displayed after "Construction Finance." */
  accentWord?: string
}

export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  function HeroSection({ redirectTo = '/', accentWord = 'Refined' }, ref) {
    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-4 pb-20"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Background gradient - extends to top edge */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 120% 60% at 50% -10%, var(--accent-muted) 0%, transparent 60%)',
            opacity: 0.6,
          }}
        />

        {/* Logo with pulsing glow - full width container for proper centering */}
        <div className="relative z-10 w-full text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{
                background: 'var(--accent)',
              }}
              animate={{
                boxShadow: [
                  '0 0 32px rgba(149, 6, 6, 0.3)',
                  '0 0 48px rgba(149, 6, 6, 0.5)',
                  '0 0 32px rgba(149, 6, 6, 0.3)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <span className="text-3xl font-bold text-white">TD3</span>
            </motion.div>
          </motion.div>

          {/* Headline - accentWord rotates across visits (see lib/accentWords.ts) */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-semibold mb-4 tracking-tight uppercase whitespace-normal sm:whitespace-nowrap leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Construction Finance.
            <br />
            <span style={{ color: 'var(--accent)' }}>{accentWord}.</span>
          </motion.h1>
        </div>

        {/* Content container - constrained width for login card */}
        <div className="relative z-10 w-full max-w-xl mx-auto text-center">
          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-lg lg:text-xl mb-8 md:mb-10 max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            A purpose-built system for managing construction loans, draws, and funding with precision and control.
          </motion.p>

          {/* Login Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="card-ios p-4 sm:p-6 md:p-8 max-w-md mx-auto"
            style={{
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'var(--accent)',
                  boxShadow: '0 4px 12px rgba(149, 6, 6, 0.25)',
                }}
              >
                <span className="text-sm font-bold text-white">TD3</span>
              </div>
              <span
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Sign in to continue
              </span>
            </div>
            <LoginForm redirectTo={redirectTo} />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        </motion.div>
      </section>
    )
  }
)

export default HeroSection
