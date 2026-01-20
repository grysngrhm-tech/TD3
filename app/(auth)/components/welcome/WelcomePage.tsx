'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HeroSection } from './HeroSection'
import { StickyNav } from './StickyNav'
import { ProblemsSection } from './ProblemsSection'
import { SolutionsSection } from './SolutionsSection'
import { WorkflowSection } from './WorkflowSection'
import { CTASection } from './CTASection'

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
  const problemsUnpinnedRef = useRef(false)
  const solutionsUnpinnedRef = useRef(false)
  const workflowUnpinnedRef = useRef(false)

  // Store the scroll position when section unpinned
  const problemsUnpinScrollRef = useRef(0)
  const solutionsUnpinScrollRef = useRef(0)
  const workflowUnpinScrollRef = useRef(0)

  // Detect mobile/touch devices for fallback behavior
  const [isMobile, setIsMobile] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Current section for progress indicator
  const [currentSection, setCurrentSection] = useState(0)
  const [showProgressIndicator, setShowProgressIndicator] = useState(false)

  useEffect(() => {
    // Check for mobile and reduced motion preferences
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }

    const checkReducedMotion = () => {
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    }

    checkMobile()
    checkReducedMotion()

    window.addEventListener('resize', checkMobile)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', checkReducedMotion)

    return () => {
      window.removeEventListener('resize', checkMobile)
      motionQuery.removeEventListener('change', checkReducedMotion)
    }
  }, [])

  useEffect(() => {
    // Skip ScrollTrigger on mobile or when user prefers reduced motion
    if (isMobile || prefersReducedMotion) {
      // Set all progress to 1 for static display
      setProblemsProgress(1)
      setSolutionsProgress(1)
      setWorkflowProgress(1)
      return
    }

    const ctx = gsap.context(() => {
      // Problems Section - Pinned
      if (problemsContainerRef.current && problemsRef.current) {
        ScrollTrigger.create({
          trigger: problemsContainerRef.current,
          start: 'top top',
          end: '+=120%',
          pin: problemsRef.current,
          pinSpacing: true,
          scrub: 0.5,
          onUpdate: (self) => {
            if (self.progress < 1) {
              // During pinned phase: normal 0-1 progress
              problemsUnpinnedRef.current = false
              setProblemsProgress(self.progress)
            } else if (!problemsUnpinnedRef.current) {
              // Just unpinned - record scroll position
              problemsUnpinnedRef.current = true
              problemsUnpinScrollRef.current = window.scrollY
              setProblemsProgress(1)
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
          onUpdate: (self) => {
            if (self.progress < 1) {
              solutionsUnpinnedRef.current = false
              setSolutionsProgress(self.progress)
            } else if (!solutionsUnpinnedRef.current) {
              solutionsUnpinnedRef.current = true
              solutionsUnpinScrollRef.current = window.scrollY
              setSolutionsProgress(1)
            }
          },
        })
      }

      // Workflow Section - Pinned (slightly longer for 4-step animation)
      if (workflowContainerRef.current && workflowRef.current) {
        ScrollTrigger.create({
          trigger: workflowContainerRef.current,
          start: 'top top',
          end: '+=150%',
          pin: workflowRef.current,
          pinSpacing: true,
          scrub: 0.5,
          onUpdate: (self) => {
            if (self.progress < 1) {
              workflowUnpinnedRef.current = false
              setWorkflowProgress(self.progress)
            } else if (!workflowUnpinnedRef.current) {
              workflowUnpinnedRef.current = true
              workflowUnpinScrollRef.current = window.scrollY
              setWorkflowProgress(1)
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
  }, [isMobile, prefersReducedMotion])

  // Extended progress tracking - continues past 1 as user scrolls
  useEffect(() => {
    if (isMobile || prefersReducedMotion) return

    const handleExtendedProgress = () => {
      const viewportHeight = window.innerHeight
      const scrollY = window.scrollY

      // Calculate extended progress for each section after it unpins
      // Progress accelerates: every 300px of scroll past unpin = +0.5 progress (accelerating)

      // Problems section extended progress
      if (problemsUnpinnedRef.current && problemsRef.current) {
        const rect = problemsRef.current.getBoundingClientRect()
        // Only extend while section is still visible
        if (rect.bottom > 0) {
          const scrollPast = scrollY - problemsUnpinScrollRef.current
          // Accelerate: progress increases faster as you scroll more
          const extendedProgress = 1 + (scrollPast / 250) * (1 + scrollPast / 1000)
          setProblemsProgress(Math.max(1, extendedProgress))
        }
      }

      // Solutions section extended progress
      if (solutionsUnpinnedRef.current && solutionsRef.current) {
        const rect = solutionsRef.current.getBoundingClientRect()
        if (rect.bottom > 0) {
          const scrollPast = scrollY - solutionsUnpinScrollRef.current
          const extendedProgress = 1 + (scrollPast / 250) * (1 + scrollPast / 1000)
          setSolutionsProgress(Math.max(1, extendedProgress))
        }
      }

      // Workflow section extended progress
      if (workflowUnpinnedRef.current && workflowRef.current) {
        const rect = workflowRef.current.getBoundingClientRect()
        if (rect.bottom > 0) {
          const scrollPast = scrollY - workflowUnpinScrollRef.current
          const extendedProgress = 1 + (scrollPast / 250) * (1 + scrollPast / 1000)
          setWorkflowProgress(Math.max(1, extendedProgress))
        }
      }
    }

    window.addEventListener('scroll', handleExtendedProgress, { passive: true })
    return () => window.removeEventListener('scroll', handleExtendedProgress)
  }, [isMobile, prefersReducedMotion])

  // Mobile fallback: use Intersection Observer for simple fade-in animations
  useEffect(() => {
    if (!isMobile && !prefersReducedMotion) return

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
  }, [isMobile, prefersReducedMotion])

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
      {/* Sticky Navigation */}
      <StickyNav
        showAfterScroll={500}
        redirectTo={redirectTo}
      />

      {/* Scroll Progress Indicator - Desktop only */}
      <AnimatePresence>
        {showProgressIndicator && !isMobile && (
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
      />

      {/* Problems Section */}
      {isMobile || prefersReducedMotion ? (
        <ProblemsSection
          ref={problemsRef}
          progress={problemsProgress}
        />
      ) : (
        <div ref={problemsContainerRef}>
          <ProblemsSection
            ref={problemsRef}
            progress={problemsProgress}
          />
        </div>
      )}

      {/* Solutions Section */}
      {isMobile || prefersReducedMotion ? (
        <SolutionsSection
          ref={solutionsRef}
          progress={solutionsProgress}
        />
      ) : (
        <div ref={solutionsContainerRef}>
          <SolutionsSection
            ref={solutionsRef}
            progress={solutionsProgress}
          />
        </div>
      )}

      {/* Workflow Section */}
      {isMobile || prefersReducedMotion ? (
        <WorkflowSection
          ref={workflowRef}
          progress={workflowProgress}
        />
      ) : (
        <div ref={workflowContainerRef}>
          <WorkflowSection
            ref={workflowRef}
            progress={workflowProgress}
          />
        </div>
      )}

      {/* CTA Section */}
      <CTASection
        ref={ctaRef}
        redirectTo={redirectTo}
      />
    </div>
  )
}

export default WelcomePage
