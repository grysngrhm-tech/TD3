'use client'

import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'
import { fadeUp, staggerContainer } from './motionPresets'

interface BentoGridProps {
  reducedMotion: boolean
}

/* =============================================================================
   CARD DATA
   ============================================================================= */

interface CardData {
  id: string
  title: string
  description: string
  icon: () => React.JSX.Element
  colSpan: string
  hero: boolean
}

const cards: CardData[] = [
  {
    id: 'budgets',
    title: 'Centralized Budgets',
    description:
      'Every budget line, draw, and invoice in one system of record.',
    icon: GridIcon,
    colSpan: 'lg:col-span-2',
    hero: true,
  },
  {
    id: 'ai-import',
    title: 'AI-Powered Import',
    description:
      'Upload any spreadsheet. AI maps it to standardized cost codes automatically.',
    icon: SparklesIcon,
    colSpan: '',
    hero: false,
  },
  {
    id: 'invoice-matching',
    title: 'Invoice Matching',
    description:
      'Invoices extracted and matched to draw lines with confidence scores.',
    icon: ReceiptIcon,
    colSpan: '',
    hero: false,
  },
  {
    id: 'draw-review',
    title: 'Draw Review',
    description:
      'Full context at a glance — budget utilization, past draws, flags, and history.',
    icon: ClipboardIcon,
    colSpan: '',
    hero: false,
  },
  {
    id: 'wire-batching',
    title: 'Wire Batching',
    description:
      'Draws grouped by builder into single wire transfers. One click to fund.',
    icon: LayersIcon,
    colSpan: 'lg:col-span-2',
    hero: false,
  },
  {
    id: 'portfolio',
    title: 'Portfolio Tracking',
    description: 'Real-time dashboards across your entire loan portfolio.',
    icon: ChartIcon,
    colSpan: '',
    hero: false,
  },
]

/* =============================================================================
   BENTO GRID COMPONENT
   ============================================================================= */

export function BentoGrid({ reducedMotion }: BentoGridProps) {
  const MotionWrapper = reducedMotion ? 'div' : motion.div
  const MotionItem = reducedMotion ? 'div' : motion.div

  const containerProps = reducedMotion
    ? {}
    : {
        variants: staggerContainer,
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: { once: true, amount: 0.15 },
      }

  const itemProps = reducedMotion
    ? {}
    : {
        variants: fadeUp,
      }

  return (
    <section className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section heading */}
        {reducedMotion ? (
          <div className="text-center mb-14">
            <SectionHeading />
          </div>
        ) : (
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
          >
            <SectionHeading />
          </motion.div>
        )}

        {/* Bento grid */}
        <MotionWrapper
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          {...containerProps}
        >
          {cards.map((card) => (
            <MotionItem
              key={card.id}
              className={`${card.colSpan} ${card.colSpan.includes('col-span-2') ? 'md:col-span-2' : ''}`}
              {...itemProps}
            >
              <GlassCard
                className={`h-full ${card.hero ? 'p-8' : 'p-6'}`}
                hover
              >
                {/* Icon */}
                <div className="mb-4">
                  <card.icon />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/70 leading-relaxed">
                  {card.description}
                </p>

                {/* Product mockup inside hero card */}
                {card.hero && <ProductMockup />}
              </GlassCard>
            </MotionItem>
          ))}
        </MotionWrapper>
      </div>
    </section>
  )
}

/* =============================================================================
   SECTION HEADING
   ============================================================================= */

function SectionHeading() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[#950606] font-medium mb-3">
        Platform
      </p>
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
        Everything you need
      </h2>
    </>
  )
}

/* =============================================================================
   PRODUCT MOCKUP — Stylized dark dashboard illustration
   ============================================================================= */

function ProductMockup() {
  return (
    <div className="mt-6 rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-[#950606]/80">
            <span className="text-[7px] font-bold text-white/90">TD3</span>
          </div>
          <span className="text-[10px] font-medium text-white/30">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span className="text-[9px] text-white/30">Live</span>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {[
          { label: 'Active Loans', value: '12' },
          { label: 'Pending Draws', value: '5' },
          { label: 'This Week', value: '$1.2M' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2"
          >
            <p className="text-[9px] text-white/30 mb-0.5">{stat.label}</p>
            <p className="text-sm font-semibold text-white/50">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Mini table */}
      <div className="px-3 pb-3">
        <div className="rounded-lg border border-white/[0.05] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-3 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.05]">
            <span className="text-[8px] font-medium text-white/25">
              Project
            </span>
            <span className="text-[8px] font-medium text-white/25">
              Status
            </span>
            <span className="text-[8px] font-medium text-white/25 text-right">
              Amount
            </span>
          </div>
          {/* Table rows */}
          {[
            { project: 'DW-244', status: 'Active', amount: '$342K', color: 'bg-emerald-500/60' },
            { project: 'BR-118', status: 'Pending', amount: '$186K', color: 'bg-amber-500/60' },
            { project: 'TN-301', status: 'Active', amount: '$527K', color: 'bg-emerald-500/60' },
            { project: 'PL-092', status: 'Funded', amount: '$290K', color: 'bg-blue-400/60' },
          ].map((row) => (
            <div
              key={row.project}
              className="grid grid-cols-3 px-3 py-1.5 border-b border-white/[0.03] last:border-b-0"
            >
              <span className="text-[9px] text-white/40 font-medium">
                {row.project}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${row.color}`} />
                <span className="text-[9px] text-white/35">{row.status}</span>
              </div>
              <span className="text-[9px] text-white/35 text-right font-mono">
                {row.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =============================================================================
   INLINE SVG ICONS — 20x20, stroke-based, monochrome
   ============================================================================= */

function GridIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(149, 6, 6, 0.8)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255, 255, 255, 0.6)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l2.09 6.26L20 10.27l-4.74 3.74L16.18 22 12 18.27 7.82 22l.92-7.99L4 10.27l5.91-2.01L12 2z" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255, 255, 255, 0.6)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16l3-2 2 2 3-2 3 2 2-2 3 2V4a2 2 0 00-2-2h-4" />
      <path d="M14 2v4a2 2 0 002 2h4" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255, 255, 255, 0.6)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(149, 6, 6, 0.8)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255, 255, 255, 0.6)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

export default BentoGrid
