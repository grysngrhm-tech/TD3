'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from './LoginForm'

interface CTASectionProps {
  redirectTo?: string
}

export const CTASection = forwardRef<HTMLElement, CTASectionProps>(
  function CTASection({ redirectTo = '/' }, ref) {
    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        }}
      >
        <div className="w-full max-w-xl mx-auto text-center">
          {/* Headline - confident, not salesy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Your construction portfolio, organized.
            </h2>
            <p
              className="text-base md:text-lg mb-8"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in to access loan tracking, draw management, and financial reporting.
            </p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="card-ios p-6 md:p-8"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)',
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

          {/* Attribution */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6"
          >
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              A Tennant Developments platform
            </p>
          </motion.div>
        </div>

        {/* Compact Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full mt-12 pt-8 pb-6 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="max-w-4xl mx-auto px-4">
            {/* Three-column links - all aligned */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              {/* TD3 Link */}
              <a
                href="https://td3.tennantdevelopments.com"
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: 'var(--accent)' }}
                >
                  <span className="text-xs font-bold text-white">TD3</span>
                </div>
                <span
                  className="text-xs font-medium group-hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  td3.tennantdevelopments.com
                </span>
              </a>

              {/* Tennant Developments Link */}
              <a
                href="https://tennantdevelopments.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                >
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>TD</span>
                </div>
                <span
                  className="text-xs font-medium group-hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  tennantdevelopments.com
                </span>
              </a>

              {/* Documentation Link */}
              <a
                href="https://github.com/grysngrhm-tech/TD3#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                >
                  <svg
                    className="w-4 h-4"
                    style={{ color: 'var(--text-primary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span
                  className="text-xs font-medium group-hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Documentation
                </span>
              </a>
            </div>

            {/* Bottom bar */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t text-center sm:text-left"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                © {new Date().getFullYear()} TD3 · Tennant Developments
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Built by Grayson Graham
              </p>
            </div>
          </div>
        </motion.footer>
      </section>
    )
  }
)

export default CTASection
