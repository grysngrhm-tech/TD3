'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from './LoginForm'

interface HeroSectionProps {
  redirectTo?: string
}

export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  function HeroSection({ redirectTo = '/' }, ref) {
    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-0 pb-20"
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

        <div className="relative z-10 w-full max-w-xl mx-auto text-center">
          {/* Logo with pulsing glow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <motion.div
              className="relative w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{
                background: 'var(--accent)',
              }}
              animate={{
                boxShadow: [
                  '0 8px 32px rgba(149, 6, 6, 0.3)',
                  '0 8px 48px rgba(149, 6, 6, 0.5)',
                  '0 8px 32px rgba(149, 6, 6, 0.3)',
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

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-4 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Construction Finance.{' '}
            <span style={{ color: 'var(--accent)' }}>Refined.</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl mb-10 max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            The intelligent platform that replaces scattered spreadsheets with a unified system for tracking loans, budgets, and wire transfers.
          </motion.p>

          {/* Login Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="card-ios p-6 md:p-8 max-w-md mx-auto"
            style={{
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h2
              className="text-lg font-medium mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Sign in to your account
            </h2>
            <LoginForm redirectTo={redirectTo} />
          </motion.div>

          {/* Tennant attribution */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-sm mt-6"
            style={{ color: 'var(--text-muted)' }}
          >
            Tennant Developments
          </motion.p>
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
