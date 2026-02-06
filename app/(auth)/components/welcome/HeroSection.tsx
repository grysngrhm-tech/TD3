'use client'

import { motion } from 'framer-motion'
import { LoginForm } from './LoginForm'
import { GlassCard } from './GlassCard'
import { fadeUp, fadeIn, blurIn } from './motionPresets'

interface HeroSectionProps {
  accentWord: string
  reducedMotion: boolean
  redirectTo?: string
}

export function HeroSection({
  accentWord,
  reducedMotion,
  redirectTo = '/',
}: HeroSectionProps) {
  if (reducedMotion) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Logo */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8"
          style={{
            background: '#950606',
            boxShadow: '0 0 32px rgba(149, 6, 6, 0.3)',
          }}
        >
          <span className="text-2xl font-bold text-white">TD3</span>
        </div>

        {/* Headline */}
        <h1
          className="text-4xl lg:text-7xl font-bold tracking-tight text-center"
          style={{ color: 'var(--welcome-text)' }}
        >
          Construction Finance.
        </h1>

        {/* Accent Word */}
        <p
          className="text-4xl lg:text-7xl font-bold tracking-tight text-center mt-1"
          style={{
            color: '#950606',
            textShadow: '0 0 40px rgba(149, 6, 6, 0.5)',
          }}
        >
          {accentWord}.
        </p>

        {/* Login Card */}
        <div className="mt-12 max-w-md w-full">
          <GlassCard glow hover={false} className="p-6 sm:p-8">
            <LoginForm redirectTo={redirectTo} />
          </GlassCard>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
      {/* Logo with pulsing glow */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto logo-pulse"
          style={{ background: '#950606' }}
        >
          <span className="text-2xl font-bold text-white">TD3</span>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6, delay: 0.1, ease: [0, 0, 0.2, 1] }}
        className="text-4xl lg:text-7xl font-bold tracking-tight text-center"
        style={{ color: 'var(--welcome-text)' }}
      >
        Construction Finance.
      </motion.h1>

      {/* Accent Word — blur-to-sharp entrance */}
      <motion.p
        variants={blurIn}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.8, delay: 0.2, ease: [0, 0, 0.2, 1] }}
        className="text-4xl lg:text-7xl font-bold tracking-tight text-center mt-1"
        style={{
          color: '#950606',
          textShadow: '0 0 40px rgba(149, 6, 6, 0.5)',
        }}
      >
        {accentWord}.
      </motion.p>

      {/* Login Card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6, delay: 0.3, ease: [0, 0, 0.2, 1] }}
        className="mt-12 max-w-md w-full"
      >
        <GlassCard glow hover={false} className="p-6 sm:p-8">
          <LoginForm redirectTo={redirectTo} />
        </GlassCard>
      </motion.div>
    </section>
  )
}

export default HeroSection
