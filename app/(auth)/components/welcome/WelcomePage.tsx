'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HeroSection } from './HeroSection'
import { ProblemsSection } from './ProblemsSection'
import { SolutionsSection } from './SolutionsSection'
import { WorkflowSection } from './WorkflowSection'
import { CTASection } from './CTASection'
import { useAccentWords } from '@/app/hooks/useAccentWords'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Section labels for progress indicator
const SECTIONS = [
  { id: 'hero', label: 'Start' },
  { id: 'problems', label: 'Challenge' },
  { id: 'solutions', label: 'Solution' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'cta', label: 'Get Started' },
]

interface WelcomePageProps {
  redirectTo?: string
}

export function WelcomePage({ redirectTo: propRedirectTo }: WelcomePageProps) {
  const searchParams = useSearchParams()
  const redirectTo = propRedirectTo || searchParams.get('redirect') || '/'

  // Rotating accent words for Hero and CTA headlines
  const { heroWord, ctaWord } = useAccentWords()

  // Refs for sections
  const heroRef = useRef<HTMLElement>(null)
  const problemsRef = useRef<HTMLElement>(null)
  const solutionsRef = useRef<HTMLElement>(null)
  const workflowRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  // Refs for pinned section containers
  const problemsContainerRef = useRef<HTMLDivElement>(null)
  const solutionsContainerRef = useRef<HTMLDivElement>(null)
  const workflowContainerRef = useRef<HTMLDivElement>(null)

  // Progress states for scroll-linked animations (extended progress - can go beyond 1)
  const [problemsProgress, setProblemsProgress] = useState(0)
  const [solutionsProgress, setSolutionsProgress] = useState(0)
  const [workflowProgress, setWorkflowProgress] = useState(0)

  // Track when each section has completed its pinned phase (reached progress 1)
  // This flag tells us when to start using getBoundingClientRect for extended progress
  const problemsUnpinnedRef = useRef(false)
  const solutionsUnpinnedRef = useRef(false)
  const workflowUnpinnedRef = useRef(false)

  // Detect reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Current section for progress indicator
  const [currentSection, setCurrentSection] = useState(0)
  const [showProgressIndicator, setShowProgressIndicator] = useState(false)

  // Viewport-based scale factor for shorter screens
  // Scales down content when viewport height is below threshold
  const [viewportScale, setViewportScale] = useState(1)

  useEffect(() => {
    const checkReducedMotion = () => {
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    }
    checkReducedMotion()

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', checkReducedMotion)

    return () => {
      motionQuery.removeEventListener('change', checkReducedMotion)
    }
  }, [])

  // Calculate viewport scale based on screen height
  useEffect(() => {
    const calculateScale = () => {
      const vh = window.innerHeight
      // Reference height where scale = 1 (typical desktop)
      const referenceHeight = 900
      // Minimum height we support (scale bottoms out here)
      const minHeight = 600
      // Minimum scale factor (don't go below 0.75)
      const minScale = 0.75

      if (vh >= referenceHeight) {
        setViewportScale(1)
      } else if (vh <= minHeight) {
        setViewportScale(minScale)
      } else {
        // Linear interpolation between minScale and 1
        const ratio = (vh - minHeight) / (referenceHeight - minHeight)
        setViewportScale(minScale + ratio * (1 - minScale))
      }
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [])

  useEffect(() => {
    // Skip ScrollTrigger when user prefers reduced motion
    if (prefersReducedMotion) {
      // Set all progress to 1 for static display
      setProblemsProgress(1)
      setSolutionsProgress(1)
      setWorkflowProgress(1)
      return
    }

    const ctx = gsap.context(() => {
      // Problems Section - Pinned
      // ScrollTrigger handles progress 0-1 during pin phase
      // After progress=1, getBoundingClientRect takes over for extended progress
      // Note: Reduced from 120% to 100% to compensate for the more visually active
      // ScatteredDocs animation which makes this section feel longer than Solution
      if (problemsContainerRef.current && problemsRef.current) {
        ScrollTrigger.create({
          trigger: problemsContainerRef.current,
          start: 'top top',
          end: '+=100%',
          pin: problemsRef.current,
          pinSpacing: true,
          scrub: 0.5,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (self.progress < 1) {
              // During pinned phase: normal 0-1 progress
              problemsUnpinnedRef.current = false
              setProblemsProgress(self.progress)
            } else {
              // Mark as unpinned - extended progress handled by scroll listener
              problemsUnpinnedRef.current = true
            }
          },
        })
      }

      // Solutions Section - Pinned
      if (solutionsContainerRef.current && solutionsRef.current) {
        ScrollTrigger.create({
          trigger: solutionsContainerRef.current,
          start: 'top top',
          end: '+=120%',
          pin: solutionsRef.current,
          pinSpacing: true,
          scrub: 0.5,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (self.progress < 1) {
              solutionsUnpinnedRef.current = false
              setSolutionsProgress(self.progress)
            } else {
              solutionsUnpinnedRef.current = true
            }
          },
        })
      }

      // Workflow Section - Pinned (extended for 6-stage animation with dwell time)
      if (workflowContainerRef.current && workflowRef.current) {
        ScrollTrigger.create({
          trigger: workflowContainerRef.current,
          start: 'top top',
          end: '+=600%',
          pin: workflowRef.current,
          pinSpacing: true,
          scrub: 0.5,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (self.progress < 1) {
              workflowUnpinnedRef.current = false
              setWorkflowProgress(self.progress)
            } else {
              workflowUnpinnedRef.current = true
            }
          },
        })
      }
    })

    // Refresh ScrollTrigger on resize
    const handleResize = () => {
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      ctx.revert()
      window.removeEventListener('resize', handleResize)
    }
  }, [prefersReducedMotion])

  // Extended progress tracking - continues past 1 based on actual element position in viewport
  // This is the KEY fix: use getBoundingClientRect to track how much of the element
  // has scrolled off the top of the viewport, not scroll position deltas
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleExtendedProgress = () => {
      // For each section that has unpinned, calculate extended progress based on
      // the element's actual position in the viewport using getBoundingClientRect()
      //
      // When rect.top < 0, the element has started scrolling off the top
      // -rect.top = how much has scrolled off the top
      // rect.height = total element height
      // extendedProgress = 1 + (amountScrolledOff / elementHeight)
      //
      // This gives us progress 1→2 as element scrolls from fully visible to fully off-screen

      // Problems section extended progress
      // Multiplier of 2 doubles the animation duration during exit phase
      // Total progress range: 0-1 (pin) + 0-2 (exit) = 0-3
      if (problemsUnpinnedRef.current && problemsRef.current) {
        const rect = problemsRef.current.getBoundingClientRect()

        // Element is still visible if rect.bottom > 0
        if (rect.bottom > 0) {
          // If element top has scrolled past viewport top (rect.top < 0)
          if (rect.top < 0) {
            // Calculate how much has scrolled off the top
            const amountScrolledOff = -rect.top
            // Normalize by element height to get exit progress (0 to 1)
            const exitProgress = amountScrolledOff / rect.height
            // Extended progress: 1 + exitProgress * 2 (goes from 1 toward 3)
            // The 2x multiplier makes animations last twice as long
            setProblemsProgress(1 + exitProgress * 2)
          }
          // If rect.top >= 0, element is still in pin position or just unpinned
          // ScrollTrigger handles this case
        }
      }

      // Solutions section extended progress
      if (solutionsUnpinnedRef.current && solutionsRef.current) {
        const rect = solutionsRef.current.getBoundingClientRect()

        if (rect.bottom > 0 && rect.top < 0) {
          const amountScrolledOff = -rect.top
          const exitProgress = amountScrolledOff / rect.height
          setSolutionsProgress(1 + exitProgress * 2)
        }
      }

      // Workflow section extended progress
      if (workflowUnpinnedRef.current && workflowRef.current) {
        const rect = workflowRef.current.getBoundingClientRect()

        if (rect.bottom > 0 && rect.top < 0) {
          const amountScrolledOff = -rect.top
          const exitProgress = amountScrolledOff / rect.height
          setWorkflowProgress(1 + exitProgress * 2)
        }
      }
    }

    window.addEventListener('scroll', handleExtendedProgress, { passive: true })
    return () => window.removeEventListener('scroll', handleExtendedProgress)
  }, [prefersReducedMotion])

  // Reduced motion fallback: use Intersection Observer for simple fade-in animations
  useEffect(() => {
    if (!prefersReducedMotion) return

    const observerOptions = {
      threshold: 0.2,
      rootMargin: '-50px',
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          const section = target.dataset.section

          // Animate progress from 0 to 1 when section enters view
          const duration = 1500
          const start = performance.now()

          const animate = (currentTime: number) => {
            const elapsed = currentTime - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic

            if (section === 'problems') setProblemsProgress(eased)
            if (section === 'solutions') setSolutionsProgress(eased)
            if (section === 'workflow') setWorkflowProgress(eased)

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }

          requestAnimationFrame(animate)
        }
      })
    }

    const observer = new IntersectionObserver(handleIntersection, observerOptions)

    // Observe sections
    if (problemsRef.current) {
      problemsRef.current.dataset.section = 'problems'
      observer.observe(problemsRef.current)
    }
    if (solutionsRef.current) {
      solutionsRef.current.dataset.section = 'solutions'
      observer.observe(solutionsRef.current)
    }
    if (workflowRef.current) {
      workflowRef.current.dataset.section = 'workflow'
      observer.observe(workflowRef.current)
    }

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  // Track current section and show/hide progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight

      // Show indicator after scrolling past hero
      setShowProgressIndicator(scrollY > viewportHeight * 0.5)

      // Determine current section based on scroll position
      const refs = [heroRef, problemsRef, solutionsRef, workflowRef, ctaRef]

      for (let i = refs.length - 1; i >= 0; i--) {
        const ref = refs[i]
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect()
          if (rect.top <= viewportHeight * 0.5) {
            setCurrentSection(i)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to section handler
  const scrollToSection = useCallback((index: number) => {
    const refs = [heroRef, problemsRef, solutionsRef, workflowRef, ctaRef]
    const ref = refs[index]
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="relative">
      {/* Scroll Progress Indicator */}
      <AnimatePresence>
        {showProgressIndicator && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3"
          >
            {SECTIONS.map((section, index) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(index)}
                className="group relative flex items-center justify-end"
                aria-label={`Go to ${section.label}`}
              >
                {/* Tooltip on hover */}
                <span
                  className="absolute right-6 text-xs font-medium whitespace-nowrap
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200
                             px-2 py-1 rounded"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-card)',
                    boxShadow: 'var(--elevation-1)',
                  }}
                >
                  {section.label}
                </span>
                {/* Dot */}
                <motion.div
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: index === currentSection ? 10 : 6,
                    height: index === currentSection ? 10 : 6,
                    background: index === currentSection
                      ? 'var(--accent)'
                      : index < currentSection
                        ? 'var(--text-muted)'
                        : 'var(--border)',
                  }}
                  whileHover={{ scale: 1.5 }}
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <HeroSection
        ref={heroRef}
        redirectTo={redirectTo}
        accentWord={heroWord}
      />

      {/* Problems Section */}
      {prefersReducedMotion ? (
        <ProblemsSection
          ref={problemsRef}
          progress={problemsProgress}
          viewportScale={viewportScale}
        />
      ) : (
        <div ref={problemsContainerRef}>
          <ProblemsSection
            ref={problemsRef}
            progress={problemsProgress}
            viewportScale={viewportScale}
          />
        </div>
      )}

      {/* Solutions Section */}
      {prefersReducedMotion ? (
        <SolutionsSection
          ref={solutionsRef}
          progress={solutionsProgress}
          viewportScale={viewportScale}
        />
      ) : (
        <div ref={solutionsContainerRef}>
          <SolutionsSection
            ref={solutionsRef}
            progress={solutionsProgress}
            viewportScale={viewportScale}
          />
        </div>
      )}

      {/* Workflow Section */}
      {prefersReducedMotion ? (
        <WorkflowSection
          ref={workflowRef}
          progress={workflowProgress}
          viewportScale={viewportScale}
        />
      ) : (
        <div ref={workflowContainerRef}>
          <WorkflowSection
            ref={workflowRef}
            progress={workflowProgress}
            viewportScale={viewportScale}
          />
        </div>
      )}

      {/* CTA Section */}
      <CTASection
        ref={ctaRef}
        redirectTo={redirectTo}
        accentWord={ctaWord}
      />
    </div>
  )
}

export default WelcomePage
