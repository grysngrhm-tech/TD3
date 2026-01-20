# TD3 Welcome Page Implementation Plan

## Overview

Transform the login page into a visually impressive, Apple-style landing page that showcases TD3's value proposition while maintaining quick access to login.

## Design Decisions

| Category | Decision |
|----------|----------|
| Scroll Style | Pinned sections (GSAP ScrollTrigger) |
| Animation Library | GSAP + existing Framer Motion |
| Animation Intensity | Confident & bold |
| Mobile Behavior | Simplified (no pinning, fade-ins only) |
| Hero Visual | Dashboard mockup + data visualization |
| Login UX | Above-the-fold form → sticky nav button |
| Tone | "This is serious business" (professional/trustworthy) |
| Theme | Light (matches app) |

## Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SECTION 0: HERO + LOGIN (100vh)                           │
│  - Sticky nav appears after scrolling past this section    │
│  - Full login form for quick access                        │
│  - "Scroll to explore" indicator                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SECTION 1: THE PROBLEMS (pinned, 200vh scroll)            │
│  - Two-column layout                                       │
│  - Left: "Everything Lives in Too Many Places"             │
│  - Right: "Too Much Time on Repetitive Work"               │
│  - Animated visuals for each problem                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SECTION 2: THE SOLUTIONS (pinned, 200vh scroll)           │
│  - Two-column layout (mirrors problems)                    │
│  - Left: "A Single Source of Truth"                        │
│  - Right: "Intelligent Automation Where It Matters"        │
│  - Problem visuals morph into solution visuals             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SECTION 3: THE WORKFLOW (pinned, 300vh scroll)            │
│  - Draw management pipeline visualization                  │
│  - REVIEW → STAGED → PENDING WIRE → FUNDED                 │
│  - Each step highlights as user scrolls                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SECTION 4: CTA (100vh, not pinned)                        │
│  - Final login form                                        │
│  - Footer with branding                                    │
└─────────────────────────────────────────────────────────────┘
```

## Content Copy

### Hero Section
**Headline:** "Construction Draw Management. Refined."

**Subhead:** "The intelligent platform that replaces scattered spreadsheets with a unified system for tracking loans, budgets, and wire transfers."

### Problems Section
**Header:** "Construction lending creates two persistent challenges that compound as the portfolio grows."

#### Column 1: Everything Lives in Too Many Places
> Understanding a single loan means checking multiple sources: budget spreadsheets someone emailed last month, approval threads buried in inboxes, handwritten notes from phone calls, and whatever someone is keeping track of in their head.

Bullet points:
- No single source of truth
- Decisions disappear into email
- Reporting takes hours
- Audits are painful

#### Column 2: Too Much Time on Repetitive Work
> Even with good intentions and smart people, manual processes eat time that should go elsewhere.

Bullet points:
- Budget categorization is tedious
- Invoice matching is slow
- Data entry crowds out judgment
- Inconsistency undermines reporting

**Footer:** *"A small team can hold all this in their heads—until they can't."*

### Solutions Section
**Header:** "TD3 addresses both problems directly: one place for everything and automation for the repetitive stuff."

#### Column 1: A Single Source of Truth
> Every loan, builder, budget, draw request, invoice, and approval lives in one system. Not spreadsheets with version numbers in the filename—a real database that stays current.

Bullet points:
- Current state is always obvious
- History preserved automatically
- Reporting is instant
- Anyone can pick up where someone left off

#### Column 2: Intelligent Automation Where It Matters
> TD3 uses AI to handle the tedious, repetitive tasks that currently eat hours.

Bullet points:
- Automatic budget standardization (NAHB cost codes)
- Smart invoice matching
- Built-in validation

**Footer:** *"AI handles the pattern matching and data extraction. Humans review the results and make decisions."*

### Workflow Section
**Header:** "From request to funded. Seamlessly."

Steps:
1. **Review** — Validate line items against budget
2. **Staged** — Group with builder's other draws
3. **Pending Wire** — Send to bookkeeper for processing
4. **Funded** — Wire sent, budgets updated, audit complete

### CTA Section
**Headline:** "Ready to take control of your construction lending?"

**Footer:** "Trusted by Tennant Development • © 2025 TD3"

## Technical Implementation

### New Dependencies
```bash
npm install gsap @gsap/react
```

### File Structure
```
app/(auth)/
├── layout.tsx                    # MODIFY: allow full-page scroll
├── login/
│   └── page.tsx                  # MODIFY: import WelcomePage
└── components/
    └── welcome/
        ├── WelcomePage.tsx       # NEW: main orchestrator
        ├── HeroSection.tsx       # NEW: login + tagline
        ├── ProblemsSection.tsx   # NEW: two-column problems
        ├── SolutionsSection.tsx  # NEW: two-column solutions
        ├── WorkflowSection.tsx   # NEW: draw pipeline
        ├── CTASection.tsx        # NEW: final login
        ├── StickyNav.tsx         # NEW: appears after hero
        ├── LoginForm.tsx         # NEW: reusable login form
        ├── ScrollIndicator.tsx   # NEW: "scroll to explore"
        └── visuals/
            ├── ScatteredDocs.tsx     # NEW: problem 1 visual
            ├── RepetitiveClock.tsx   # NEW: problem 2 visual
            ├── UnifiedDashboard.tsx  # NEW: solution 1 visual
            ├── AutomationFlow.tsx    # NEW: solution 2 visual
            └── WorkflowPipeline.tsx  # NEW: 4-step pipeline
```

### Animation Timeline

#### Desktop (GSAP ScrollTrigger with pinning)

| Section | Trigger | Animation |
|---------|---------|-----------|
| Hero | Load | Fade in headline, then form, then scroll indicator |
| Hero → Nav | scrollY > hero height | Sticky nav slides down |
| Problems | Enter viewport | Pin section, begin scroll-driven animations |
| Problems 0-25% | Scroll | Header fades in |
| Problems 25-40% | Scroll | Column 1 header + visual animates |
| Problems 40-60% | Scroll | Column 1 bullets stagger in |
| Problems 60-75% | Scroll | Column 2 header + visual animates |
| Problems 75-90% | Scroll | Column 2 bullets stagger in |
| Problems 90-100% | Scroll | Footer quote fades in |
| Solutions | Enter viewport | Pin section, morph problem visuals |
| Solutions 0-30% | Scroll | Header + Column 1 visual transforms |
| Solutions 30-50% | Scroll | Column 1 bullets |
| Solutions 50-80% | Scroll | Column 2 visual transforms |
| Solutions 80-100% | Scroll | Column 2 bullets + footer quote |
| Workflow | Enter viewport | Pin section |
| Workflow 0-25% | Scroll | "Review" step highlights |
| Workflow 25-50% | Scroll | "Staged" step highlights |
| Workflow 50-75% | Scroll | "Pending Wire" step highlights |
| Workflow 75-100% | Scroll | "Funded" step highlights + celebration |
| CTA | Enter viewport | Form fades in (no pin) |

#### Mobile (Framer Motion whileInView)

| Element | Animation |
|---------|-----------|
| All headers | Fade up on enter |
| All bullets | Stagger fade on enter |
| Visuals | Simplified static versions |
| Workflow | Vertical timeline, each step fades on enter |

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥1024px) | Two columns, full animations, pinned sections |
| Tablet (768-1023px) | Two columns, reduced animations, no pinning |
| Mobile (<768px) | Single column, minimal animations, no pinning |

### Performance Considerations

1. **Lazy load visuals** - Only render complex SVG animations when section is near viewport
2. **Reduce motion** - Respect `prefers-reduced-motion` media query
3. **Mobile detection** - Skip GSAP pinning on touch devices
4. **Image optimization** - Use Next.js Image component for any raster graphics
5. **Bundle splitting** - Dynamic import GSAP only on login page

### Accessibility

1. **Keyboard navigation** - All interactive elements focusable
2. **Screen readers** - Semantic HTML, ARIA labels on visuals
3. **Reduced motion** - Honor system preference, provide static fallbacks
4. **Color contrast** - Maintain WCAG AA compliance
5. **Focus management** - Login form auto-focuses appropriately

## Implementation Order

### Phase 1: Foundation
1. Install GSAP dependencies
2. Create base WelcomePage component structure
3. Extract LoginForm as reusable component
4. Update auth layout to allow scrolling

### Phase 2: Hero + Navigation
5. Build HeroSection with login form
6. Add StickyNav that appears on scroll
7. Add ScrollIndicator component

### Phase 3: Content Sections
8. Build ProblemsSection with two-column layout
9. Build SolutionsSection with two-column layout
10. Build WorkflowSection with pipeline visualization
11. Build CTASection with final login form

### Phase 4: Visuals
12. Create ScatteredDocs animation
13. Create RepetitiveClock animation
14. Create UnifiedDashboard animation
15. Create AutomationFlow animation
16. Create WorkflowPipeline animation

### Phase 5: Scroll Animations
17. Implement GSAP ScrollTrigger for desktop pinning
18. Implement Framer Motion whileInView for mobile
19. Add visual morphing transitions between problems→solutions

### Phase 6: Polish
20. Add reduced motion support
21. Performance optimization (lazy loading, code splitting)
22. Cross-browser testing
23. Responsive refinements

## Estimated Scope

- **New files:** ~15 components
- **Modified files:** 2 (layout.tsx, login/page.tsx)
- **New dependency:** gsap, @gsap/react (~48KB)
- **Complexity:** Medium-high (scroll animations require careful implementation)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GSAP conflicts with React state | Use @gsap/react hooks, proper cleanup |
| Performance on low-end devices | Mobile fallbacks, lazy loading |
| Scroll position bugs on resize | ScrollTrigger.refresh() on resize |
| Accessibility concerns with pinning | Reduced motion fallback, keyboard nav |

## Success Criteria

1. ✅ Login remains fast and accessible (form visible immediately)
2. ✅ Scroll experience is smooth at 60fps
3. ✅ Mobile experience is functional without jank
4. ✅ Content clearly communicates TD3's value proposition
5. ✅ Professional, "serious business" tone maintained
6. ✅ No accessibility regressions
