'use client'

import { useSearchParams } from 'next/navigation'
import { HeroSection } from './HeroSection'
import { ValueSection } from './ValueSection'
import { WorkflowSection } from './WorkflowSection'
import { CTASection } from './CTASection'
import { useAccentWords } from '@/app/hooks/useAccentWords'

interface WelcomePageProps {
  redirectTo?: string
}

export function WelcomePage({ redirectTo: propRedirectTo }: WelcomePageProps) {
  const searchParams = useSearchParams()
  const redirectTo = propRedirectTo || searchParams.get('redirect') || '/'
  const { heroWord, ctaWord } = useAccentWords()

  return (
    <div className="relative">
      <HeroSection redirectTo={redirectTo} accentWord={heroWord} />
      <ValueSection />
      <WorkflowSection />
      <CTASection redirectTo={redirectTo} accentWord={ctaWord} />
    </div>
  )
}

export default WelcomePage
