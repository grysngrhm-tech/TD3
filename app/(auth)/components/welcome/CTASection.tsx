'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from './LoginForm'

interface CTASectionProps {
  redirectTo?: string
  /** Rotating accent word displayed after "Construction finance," */
  accentWord?: string
}

export const CTASection = forwardRef<HTMLElement, CTASectionProps>(
  function CTASection({ redirectTo = '/', accentWord = 'clearly organized' }, ref) {
    return (
      <section
        ref={ref}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        }}
      >
        <div className="w-full max-w-xl mx-auto text-center">
          {/* Headline - accentWord rotates across visits (see lib/accentWords.ts) */}
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
              Construction finance,{' '}
              <span style={{ color: 'var(--accent)' }}>{accentWord.toLowerCase()}.</span>
            </h2>
            <p
              className="text-base md:text-lg mb-8"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in to access loan tracking, draw management, funding workflows, and financial reporting.
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

        {/* Compact Footer with full descriptions */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full mt-auto pt-10 pb-6 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="max-w-5xl mx-auto px-4">
            {/* Three columns with descriptions - tighter spacing */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* TD3 Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}
                  >
                    <span className="text-[10px] font-bold text-white">TD3</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    TD3
                  </span>
                </div>
                <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
                  A construction finance management platform designed to provide structure, visibility, and accountability across loans, budgets, draws, and funding.
                </p>
                <a
                  href="https://td3.tennantdevelopments.com"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  td3.tennantdevelopments.com
                </a>
              </div>

              {/* Tennant Developments Column */}
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Tennant Developments
                </h4>
                <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
                  A real estate development firm based in Central Oregon, focused on master-planned communities, construction finance, and commercial properties.
                </p>
                <a
                  href="https://tennantdevelopments.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  tennantdevelopments.com
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Learn More Column */}
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Documentation
                </h4>
                <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
                  Learn more about TD3's workflow, structure, and technical foundations.
                </p>
                <a
                  href="https://github.com/grysngrhm-tech/TD3#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  View on GitHub
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Bottom bar - tighter */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t"
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
