'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MeshGradient } from './MeshGradient'
import { HeroSection } from './HeroSection'
import { BentoGrid } from './BentoGrid'
import { WorkflowTabs } from './WorkflowTabs'
import { CTASection } from './CTASection'
import { useAccentWords } from '@/app/hooks/useAccentWords'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface WelcomePageProps {
  redirectTo?: string
}

export function WelcomePage({ redirectTo: propRedirectTo }: WelcomePageProps) {
  const searchParams = useSearchParams()
  const redirectTo = propRedirectTo || searchParams.get('redirect') || '/'

  const { heroWord, ctaWord } = useAccentWords()

  const [reducedMotion, setReducedMotion] = useState(false)

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // GSAP context for cleanup — sections will attach their own ScrollTriggers
  useEffect(() => {
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Sections (BentoGrid, WorkflowTabs, CTA) will register
      // their own ScrollTrigger instances within this context.
    })

    return () => ctx.revert()
  }, [reducedMotion])

  return (
    <div className="welcome-dark" style={{ colorScheme: 'dark' }}>
      <MeshGradient />

      {/* Hero */}
      <HeroSection
        accentWord={heroWord}
        reducedMotion={reducedMotion}
        redirectTo={redirectTo}
      />

      {/* Value Proposition */}
      <BentoGrid reducedMotion={reducedMotion} />

      {/* Workflow */}
      <WorkflowTabs reducedMotion={reducedMotion} />

      {/* CTA + Footer */}
      <CTASection accentWord={ctaWord} />
    </div>
  )
}

export default WelcomePage
