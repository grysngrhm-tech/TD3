import type { Variants } from 'framer-motion'

/* =============================================================================
   FRAMER MOTION PRESETS — Welcome Page
   Reusable animation variants for the redesigned welcome experience.
   ============================================================================= */

/** Fade up from below — good for content reveals */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0, 0, 0.2, 1] },
  },
}

/** Simple opacity fade */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] },
  },
}

/** Blur-to-sharp entrance — premium hero text effect */
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0, 0, 0.2, 1] },
  },
}

/** Scale up from slightly smaller */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] },
  },
}

/** Stagger container — wrap children that use the above variants */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

/* =============================================================================
   GSAP-COMPATIBLE EASE STRINGS
   Pass these to gsap.to() / gsap.from() as the `ease` property.
   ============================================================================= */
export const gsapEase = {
  /** Smooth deceleration — elements coming to rest */
  out: 'power2.out',
  /** Soft acceleration — elements leaving */
  in: 'power2.in',
  /** Balanced ease for general use */
  inOut: 'power2.inOut',
  /** Slight overshoot — playful entrance */
  spring: 'back.out(1.4)',
  /** Elastic finish — celebration moments */
  elastic: 'elastic.out(1, 0.4)',
} as const
