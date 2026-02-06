'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { GlassCard } from './GlassCard'
import { fadeUp } from './motionPresets'

gsap.registerPlugin(ScrollTrigger)

/* ============================================================================
   TYPES
   ============================================================================ */

interface WorkflowTabsProps {
  reducedMotion: boolean
}

interface TabData {
  label: string
  headline: string
  description: string
  bullets: string[]
  visual: React.FC
}

/* ============================================================================
   TAB CONTENT
   ============================================================================ */

const TABS: TabData[] = [
  {
    label: 'Import & Match',
    headline: 'Smart import, automatic matching',
    description:
      'Upload any budget spreadsheet \u2014 AI maps line items to standardized NAHB cost codes. Invoices are extracted and matched to draw lines with confidence scores.',
    bullets: [
      'Multi-format spreadsheet parsing',
      'AI-powered category mapping',
      'Deterministic invoice matching',
    ],
    visual: ImportVisual,
  },
  {
    label: 'Review & Stage',
    headline: 'Full context, confident decisions',
    description:
      'Review every draw with budget utilization, past history, and automated flags. Approved draws are automatically grouped by builder into wire batches.',
    bullets: [
      'Budget utilization tracking',
      'Automated validation flags',
      'Builder-grouped wire batches',
    ],
    visual: ReviewVisual,
  },
  {
    label: 'Fund & Track',
    headline: 'Controlled funding, portfolio visibility',
    description:
      'Fund wire batches with proper authorization controls. Track loan performance, budgets, and draw history across your entire portfolio in real-time.',
    bullets: [
      'Authorization-gated funding',
      'Real-time portfolio dashboards',
      'Complete audit trail',
    ],
    visual: FundVisual,
  },
]

/* ============================================================================
   TAB CONTENT TRANSITIONS
   ============================================================================ */

const tabContentVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}

/* ============================================================================
   VISUALIZATIONS
   ============================================================================ */

function ImportVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 py-4">
      {/* Spreadsheet icon */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
        <svg className="w-5 h-5 text-[#950606]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm text-white/60 font-mono">budget.xlsx</span>
      </div>

      {/* Arrow down */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-6 bg-[#950606]/50" />
        <svg className="w-4 h-4 text-[#950606]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Organized grid rows */}
      <div className="w-full max-w-[280px] space-y-1.5">
        {[
          { code: '02.00', name: 'Foundation', pct: 85 },
          { code: '03.00', name: 'Framing', pct: 98 },
          { code: '06.00', name: 'Plumbing', pct: 92 },
          { code: '07.00', name: 'Electrical', pct: 96 },
        ].map((row) => (
          <div
            key={row.code}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10"
          >
            <span className="text-[11px] font-mono text-[#950606]">{row.code}</span>
            <span className="text-xs text-white/70 flex-1">{row.name}</span>
            <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#950606]/70"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Invoice connection (dotted line + card) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2">
        <div className="w-16 border-t border-dashed border-white/20" />
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[10px] text-white/40">Invoice</span>
          </div>
          <span className="text-[10px] font-mono text-[#950606]">96% match</span>
        </div>
      </div>
    </div>
  )
}

function ReviewVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 py-4">
      {/* Review card */}
      <div className="w-full max-w-[300px] rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-medium text-white/70">Draw #4 Review</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
            2 flags
          </span>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3">
          {/* Budget utilization bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-white/50">Budget Used</span>
              <span className="text-[11px] font-mono text-white/70">68%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-[#950606] w-[68%]" />
            </div>
          </div>

          {/* Stat lines */}
          <div className="flex justify-between text-[11px]">
            <span className="text-white/50">Requested</span>
            <span className="font-mono text-white/70">$27,400</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-white/50">Remaining</span>
            <span className="font-mono text-white/70">$41,200</span>
          </div>
        </div>
      </div>

      {/* Batch grouping — 2 small cards sliding together */}
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px]">
          <span className="text-white/50">Builder A</span>
          <div className="font-mono text-white/70 mt-0.5">2 draws</div>
        </div>
        <svg className="w-4 h-4 text-[#950606]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <div className="px-3 py-2 rounded-lg bg-[#950606]/15 border border-[#950606]/30 text-[10px]">
          <span className="text-[#950606]">Wire Batch</span>
          <div className="font-mono text-white/70 mt-0.5">$45,600</div>
        </div>
      </div>
    </div>
  )
}

function FundVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 py-4">
      {/* Mini dashboard — stat cards */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[320px]">
        {[
          { label: 'Active Loans', value: '12', trend: '+2' },
          { label: 'Total Funded', value: '$4.2M', trend: null },
          { label: 'Avg LTV', value: '62%', trend: null },
        ].map((stat) => (
          <div
            key={stat.label}
            className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-center"
          >
            <div className="text-[10px] text-white/40 mb-1">{stat.label}</div>
            <div className="text-sm font-semibold text-white/80 font-mono">{stat.value}</div>
            {stat.trend && (
              <div className="text-[9px] text-emerald-400 mt-0.5">{stat.trend}</div>
            )}
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div className="w-full max-w-[320px] px-4 py-3 rounded-xl bg-white/5 border border-white/10">
        <div className="text-[10px] text-white/40 mb-3">Monthly Funding</div>
        <div className="flex items-end gap-1.5 h-16">
          {[40, 55, 35, 70, 60, 85, 50, 75, 90, 65, 80, 95].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${h}%`,
                  background: i === 11 ? '#950606' : 'rgba(255,255,255,0.1)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Funded badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs font-medium text-emerald-400">Batch Funded</span>
      </div>
    </div>
  )
}

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

export function WorkflowTabs({ reducedMotion }: WorkflowTabsProps) {
  const [activeTab, setActiveTab] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)

  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // GSAP scroll-driven tab switching (desktop + motion enabled)
  useEffect(() => {
    if (reducedMotion || !isDesktop || !sectionRef.current) return

    const ctx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=200%',
        pin: true,
        scrub: 0.3,
        onUpdate: (self) => {
          const p = self.progress
          if (p < 0.33) setActiveTab(0)
          else if (p < 0.66) setActiveTab(1)
          else setActiveTab(2)
        },
      })
    }, sectionRef)

    return () => {
      ctx.revert()
      triggerRef.current = null
    }
  }, [reducedMotion, isDesktop])

  // Click handler — on desktop with scroll pinning, scroll to position; otherwise just switch
  const handleTabClick = useCallback(
    (index: number) => {
      setActiveTab(index)

      // If pinned, scroll to the right progress position
      if (triggerRef.current && isDesktop && !reducedMotion) {
        const st = triggerRef.current
        const targetProgress = (index * 0.33) + 0.01
        const scrollTarget = st.start + (st.end - st.start) * targetProgress
        window.scrollTo({ top: scrollTarget, behavior: 'smooth' })
      }
    },
    [isDesktop, reducedMotion],
  )

  const ActiveVisual = TABS[activeTab].visual

  /* ---------- Reduced Motion: static stacked cards ---------- */
  if (reducedMotion) {
    return (
      <section className="py-24 max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-white">
            From budget to funded.
          </h2>
          <h2 className="text-2xl md:text-4xl font-bold text-[#950606]">
            Fully visible.
          </h2>
        </div>

        {/* Stacked cards */}
        <div className="space-y-8">
          {TABS.map((tab) => (
            <GlassCard key={tab.label} hover={false} className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Text */}
                <div className="lg:w-[40%] space-y-4">
                  <h3 className="text-xl font-semibold text-white">{tab.headline}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{tab.description}</p>
                  <ul className="space-y-2">
                    {tab.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-white/70">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#950606] flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Visual */}
                <div className="lg:w-[60%] min-h-[300px]">
                  <tab.visual />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    )
  }

  /* ---------- Animated (default) ---------- */
  return (
    <section ref={sectionRef} className="py-24 max-w-6xl mx-auto px-6">
      {/* Header */}
      <motion.div
        className="text-center mb-16"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
      >
        <h2 className="text-2xl md:text-4xl font-bold text-white">
          From budget to funded.
        </h2>
        <h2 className="text-2xl md:text-4xl font-bold text-[#950606]">
          Fully visible.
        </h2>
      </motion.div>

      {/* Tab pills */}
      <motion.div
        className="flex justify-center gap-3 mb-10"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => handleTabClick(i)}
            className={[
              'rounded-full px-6 py-3 text-sm font-medium transition-all duration-300',
              i === activeTab
                ? 'bg-[#950606] text-white shadow-[0_0_20px_rgba(149,6,6,0.3)]'
                : 'bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/[0.08]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content panel */}
      <GlassCard hover={false} className="min-h-[300px] md:min-h-[400px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex flex-col md:flex-row gap-8 p-8"
          >
            {/* Left text */}
            <div className="md:w-[40%] space-y-4">
              <h3 className="text-xl font-semibold text-white">
                {TABS[activeTab].headline}
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                {TABS[activeTab].description}
              </p>
              <ul className="space-y-2">
                {TABS[activeTab].bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#950606] flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right visualization */}
            <div className="md:w-[60%] min-h-[250px] md:min-h-[300px]">
              <ActiveVisual />
            </div>
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    </section>
  )
}

export default WorkflowTabs
