'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'

interface CTASectionProps {
  /** Rotating accent word displayed after "Construction Finance." */
  accentWord?: string
}

const ease = [0.22, 1, 0.36, 1] as const

export const CTASection = forwardRef<HTMLElement, CTASectionProps>(
  function CTASection({ accentWord = 'Clearly Organized' }, ref) {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
      <section
        ref={ref}
        className="relative bg-[#0a0a0a] overflow-hidden"
      >
        {/* Subtle radial glow behind CTA */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(149,6,6,0.08) 0%, transparent 70%)',
          }}
        />

        {/* CTA Content */}
        <div className="relative z-10 flex flex-col items-center px-4 pt-24 pb-16 sm:pt-32 sm:pb-20">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center text-white mb-4">
              Construction Finance.
              <br />
              <span className="text-[#950606]">{accentWord}.</span>
            </h2>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="text-base sm:text-lg text-white/60 text-center max-w-lg mb-10"
          >
            Ready to streamline your construction lending workflow?
          </motion.p>

          {/* Sign In Button — scrolls to hero login form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
          >
            <button
              onClick={scrollToTop}
              className="group relative px-8 py-3.5 rounded-2xl font-semibold text-white
                         backdrop-blur-xl bg-white/5 border border-white/10
                         hover:bg-white/10 hover:border-[#950606]/40
                         hover:shadow-[0_0_30px_rgba(149,6,6,0.3)]
                         transition-all duration-300 cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2">
                Sign In
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </span>
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
            {/* Three-column layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6">
              {/* TD3 Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#950606]">
                    <span className="text-[10px] font-bold text-white">TD3</span>
                  </div>
                  <span className="text-sm font-semibold text-white/70">TD3</span>
                </div>
                <p className="text-xs leading-relaxed text-white/40 mb-2">
                  A construction finance management platform designed to provide
                  structure, visibility, and accountability across loans, budgets,
                  draws, and funding.
                </p>
                <a
                  href="https://td3.tennantdevelopments.com"
                  className="inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-[#950606] transition-colors"
                >
                  td3.tennantdevelopments.com
                </a>
              </div>

              {/* Tennant Developments Column */}
              <div>
                <h4 className="text-sm font-semibold text-white/70 mb-2">
                  Tennant Developments
                </h4>
                <p className="text-xs leading-relaxed text-white/40 mb-2">
                  A real estate development firm based in Central Oregon, focused on
                  master-planned communities, construction finance, and commercial
                  properties.
                </p>
                <a
                  href="https://tennantdevelopments.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-[#950606] transition-colors"
                >
                  tennantdevelopments.com
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>

              {/* Learn More Column */}
              <div>
                <h4 className="text-sm font-semibold text-white/70 mb-2">
                  Learn More
                </h4>
                <p className="text-xs leading-relaxed text-white/40 mb-2">
                  Explore how TD3 streamlines construction loan management — from
                  budget import to draw funding.
                </p>
                <a
                  href="https://td3.tennantdevelopments.com"
                  className="inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-[#950606] transition-colors"
                >
                  td3.tennantdevelopments.com
                </a>
              </div>
            </div>

            {/* Copyright bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-white/10">
              <p className="text-xs text-white/30">
                &copy; {new Date().getFullYear()} TD3 &middot; Tennant Developments
              </p>
              <p className="text-xs text-white/30">
                Built by Grayson Graham
              </p>
            </div>
          </div>
        </footer>
      </section>
    )
  }
)

export default CTASection
