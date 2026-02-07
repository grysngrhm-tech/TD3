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
        className="relative flex flex-col items-center px-4 pt-12 pb-4"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        }}
      >
        {/* Headline - full width container for proper centering */}
        <div className="w-full text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight uppercase whitespace-normal sm:whitespace-nowrap leading-tight text-text-primary"
              
            >
              Construction Finance.
              <br />
              <span className="text-gradient-accent">{accentWord}.</span>
            </h2>
          </motion.div>
        </div>

        {/* Content container - constrained width for login card */}
        <div className="w-full max-w-xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-lg mb-8 leading-relaxed"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.01em' }}
          >
            Sign in to access loan tracking, draw management, funding workflows, and financial reporting.
          </motion.p>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="card-glass p-4 sm:p-6 md:p-8 max-w-md mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden relative"
                style={{
                  background: 'linear-gradient(135deg, #B00808, #950606, #740505)',
                  boxShadow: '0 4px 12px rgba(149, 6, 6, 0.25)',
                }}
              >
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                  }}
                />
                <span className="relative text-sm font-bold text-white">TD3</span>
              </div>
              <span
                className="text-lg font-semibold text-text-primary"
                
              >
                Sign in to continue
              </span>
            </div>

            <LoginForm redirectTo={redirectTo} />
          </motion.div>
        </div>

        {/* Compact Footer with full descriptions */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full mt-auto pt-6 pb-2 border-t"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <div className="max-w-5xl mx-auto px-4">
            {/* Three columns with descriptions - tighter spacing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* TD3 Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #B00808, #950606, #740505)' }}
                  >
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                      }}
                    />
                    <span className="relative text-[10px] font-bold text-white">TD3</span>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">
                    TD3
                  </span>
                </div>
                <p className="text-xs leading-relaxed mb-2 text-text-muted">
                  A construction finance management platform designed to provide structure, visibility, and accountability across loans, budgets, draws, and funding.
                </p>
                <a
                  href="https://td3.tennantdevelopments.com"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline transition-opacity duration-200 hover:opacity-80 text-accent"
                  
                >
                  td3.tennantdevelopments.com
                </a>
              </div>

              {/* Tennant Developments Column */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-text-primary">
                  Tennant Developments
                </h4>
                <p className="text-xs leading-relaxed mb-2 text-text-muted">
                  A real estate development firm based in Central Oregon, focused on master-planned communities, construction finance, and commercial properties.
                </p>
                <a
                  href="https://tennantdevelopments.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline transition-opacity duration-200 hover:opacity-80 text-accent"
                  
                >
                  tennantdevelopments.com
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Learn More Column */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-text-primary">
                  Learn More
                </h4>
                <p className="text-xs leading-relaxed mb-2 text-text-muted">
                  Explore how TD3 streamlines construction loan management — from budget import to draw funding.
                </p>
                <a
                  href="https://td3.tennantdevelopments.com"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline transition-opacity duration-200 hover:opacity-80 text-accent"
                  
                >
                  td3.tennantdevelopments.com
                </a>
              </div>
            </div>

            {/* Bottom bar - tighter */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border-subtle"
            >
              <p className="text-xs text-text-muted">
                © {new Date().getFullYear()} TD3 · Tennant Developments
              </p>
              <p className="text-xs text-text-muted">
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
