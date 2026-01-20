'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoginForm } from './LoginForm'

interface StickyNavProps {
  showAfterScroll?: number
  redirectTo?: string
}

export function StickyNav({ showAfterScroll = 100, redirectTo = '/' }: StickyNavProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > showAfterScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [showAfterScroll])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
            style={{
              background: 'rgba(var(--bg-primary-rgb), 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              {/* Logo */}
              <button
                onClick={scrollToTop}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent)' }}
                >
                  <span className="text-sm font-bold text-white">TD3</span>
                </div>
                <span
                  className="font-semibold hidden sm:inline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  TD3
                </span>
              </button>

              {/* Sign In Button */}
              <button
                onClick={() => setShowLoginModal(true)}
                className="btn-primary text-sm px-5 py-2"
              >
                Sign In
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative card-ios p-6 md:p-8 w-full max-w-md"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: 'var(--accent)',
                    boxShadow: '0 4px 16px rgba(149, 6, 6, 0.25)',
                  }}
                >
                  <span className="text-xl font-bold text-white">TD3</span>
                </div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Welcome back
                </h2>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign in to access your dashboard
                </p>
              </div>

              <LoginForm redirectTo={redirectTo} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default StickyNav
