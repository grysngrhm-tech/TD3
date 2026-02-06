# Workflow Section Timing & Pacing Enhancement Plan

> **Status: IMPLEMENTED (January-February 2026)**
>
> The enhancements described in this plan have been implemented and further expanded. Key changes from the original plan:
> - Scroll distance was increased beyond the planned 300% to **600% on desktop** and **250% on mobile** for optimal pacing (see `WelcomePage.tsx`)
> - All 6 workflow stage animations were enhanced with richer content and dwell phases (see `app/(auth)/components/welcome/` stage files and visuals)
> - Per-section scroll distances are now responsive: Problems (80%/100%), Solutions (90%/120%), Workflow (250%/600%) for mobile/desktop
> - GSAP ScrollTrigger with pinned sections, extended progress tracking, and Intersection Observer mobile fallback are all active
> - Additional components were added beyond the original plan: `WorkflowTimeline.tsx`, `WorkflowStageDetail.tsx`
>
> This document is retained as a historical reference for the design rationale behind the animation timing decisions.

## Executive Summary

The workflow section currently runs too quickly for users to appreciate the animations. This plan doubles the scroll distance and restructures timing to include proper "dwell" phases where each stage is fully visible and showcased before transitioning.

---

## Problem Analysis

### Current Timing Architecture

**WelcomePage.tsx (Scroll Container):**
```tsx
end: '+=150%'  // 1.5x viewport height of scroll
```

**WorkflowSection.tsx (Progress Distribution):**
- Header: 0-12.5% (100ms equivalent at fast scroll)
- Content: 8-20%
- Stages: 20-100% (80% total ÷ 6 stages = ~13.3% each)

**Per-Stage Internal Timing (receiving 0-1 progress):**
- ImportStage: 5+ animation phases crammed into 13.3% of scroll
- Each phase triggers at thresholds like 0.15, 0.30, 0.45, etc.

### Root Causes

1. **Insufficient scroll distance**: 150% viewport is too short for 6 complex stages
2. **No dwell time**: Stages transition immediately without showcase period
3. **Crammed phases**: Each stage crams 5+ animation beats into tiny progress ranges
4. **No breathing room**: Header/content steal 20% before stages even begin

---

## Solution Architecture

### Part 1: Double Scroll Distance

**File: `WelcomePage.tsx`**

Change:
```tsx
end: '+=150%'  // Current
```
To:
```tsx
end: '+=300%'  // Doubled
```

This gives users twice the scroll distance, making animations feel more deliberate.

### Part 2: Restructure Stage Timing with Dwell Phases

**File: `WorkflowSection.tsx`**

**New Progress Distribution:**
```
0-5%:     Header intro (faster than before)
5-10%:    Content area intro
10-100%:  6 stages @ 15% each (90% total)
```

**Per-Stage Timing Model (each stage receives 0-1 progress):**
```
0-25%:    ENTRY PHASE      - Elements animate in
25-75%:   SHOWCASE PHASE   - Full content visible, subtle animations
75-100%:  TRANSITION PHASE - Prepare for exit, hint at next stage
```

This "dwell" model ensures users see the complete state before moving on.

### Part 3: Enhance Each Stage for Longer Duration

Each stage needs richer content to fill the extended time without feeling stretched.

---

## Detailed Stage Enhancements

### Stage 1: ImportStage

**Current Duration:** ~13.3% of scroll
**New Duration:** ~15% of scroll (with 2x base = 30% effective)

**New Animation Phases:**
| Progress | Phase | Content |
|----------|-------|---------|
| 0-10% | File Upload | File icon drops in, upload progress bar fills |
| 10-25% | Structure Detection | "Analyzing structure..." text, grid outline appears |
| 25-50% | Cell Scanning | Sequential cell highlighting (slower), row boundaries detected |
| 50-70% | AI Mapping | Particles flow, mapping counter, "Applying NAHB codes..." |
| 70-90% | Results Display | 8 budget lines appear with confidence badges (not 5) |
| 90-100% | Summary | Total mapped, avg confidence, "Ready for review" badge |

**New Content:**
- Upload progress bar animation
- "Analyzing structure..." status
- 8 budget lines instead of 5
- Category breakdown mini-chart
- "Ready for review" completion badge

### Stage 2: SubmitStage

**New Animation Phases:**
| Progress | Phase | Content |
|----------|-------|---------|
| 0-15% | Draw Card Entry | Draw request card slides in from left |
| 15-25% | Draw Population | Line items type in one by one |
| 25-40% | Invoice Upload | Invoice card drops in from right |
| 40-55% | Invoice Scanning | Scan beam, text extraction animation |
| 55-75% | Matching Process | Connection lines animate, match badges appear |
| 75-90% | Validation | "Validating amounts..." then checkmarks |
| 90-100% | Match Complete | Success banner, confidence summary |

**New Content:**
- Draw line items type in progressively (not instant)
- "Validating amounts..." intermediate state
- More detailed match visualization (show %)
- Summary: "3/3 matched • 0 flags • 92% avg confidence"

### Stage 3: ReviewStage

**New Animation Phases:**
| Progress | Phase | Content |
|----------|-------|---------|
| 0-15% | Panel Reveal | Review panel scales up and fades in |
| 15-30% | Stats Population | Each stat row appears sequentially |
| 30-45% | Budget Bar | Utilization bar animates, percentage counter |
| 45-60% | Historical Context | Past draws mini-timeline appears on side |
| 60-75% | Flag Analysis | Warning flag shakes, detail tooltip expands |
| 75-85% | Action Ready | Buttons become interactive, cursor hints |
| 85-100% | Approval | Approve button activates, success state |

**New Content:**
- Past 3 draws mini-timeline (shows project history)
- Comparison indicator: "This draw: $27.4K • Avg: $24.2K"
- Audit trail preview: "Last reviewed by..."
- More detailed flag information panel

### Stage 4: StagingStage

**New Animation Phases:**
| Progress | Phase | Content |
|----------|-------|---------|
| 0-15% | Cards Entry | 3 draw cards fly in from different angles |
| 15-30% | Status Display | "Approved" badges animate on each card |
| 30-50% | Builder Detection | Builder badges glow, "Grouping by builder..." text |
| 50-70% | Grouping Animation | Cards magnetically snap together |
| 70-85% | Batch Formation | Merged batch cards appear with totals |
| 85-100% | Wire Ready | "Ready for wire" badges, final totals |

**New Content:**
- "3 draws ready" status indicator
- Builder grouping explanation tooltip
- Running total that updates during merge
- Wire batch summary: "2 batches • $79,700 total"

### Stage 5: FundingStage

**New Animation Phases:**
| Progress | Phase | Content |
|----------|-------|---------|
| 0-12% | Panel Entry | Funding form slides up |
| 12-25% | Amount Display | Wire amount populates with counting animation |
| 25-40% | Date Selection | Calendar picker animation, date selected |
| 40-55% | Reference Entry | Wire reference types in character by character |
| 55-70% | Authorization | User avatar appears, permission badge |
| 70-82% | Processing | Spinner state, "Initiating wire..." |
| 82-92% | Success | Confetti, "Funded Successfully" |
| 92-100% | Lock | Lock icon, "Data locked" confirmation |

**New Content:**
- Calendar picker mini-animation before date appears
- "Verifying authorization..." intermediate state
- Wire timeline: "Initiated → Processing → Complete"
- Post-funding summary: balance updates shown

### Stage 6: TrackingStage

**New Animation Phases:**
| Progress | Phase | Content |
|----------|-------|---------|
| 0-15% | Dashboard Reveal | Main panel scales in |
| 15-30% | Stats Cards | Each stat card appears with counter animation |
| 30-50% | Sparklines | Mini sparklines draw in each card |
| 50-70% | Main Chart | Bar chart builds up, trend line overlays |
| 70-85% | Activity Feed | Activity items scroll in one by one |
| 85-95% | Live Updates | Pulse indicators, "Auto-updating" badge |
| 95-100% | Completion | Final state, all data visible |

**New Content:**
- 4 stat cards instead of 3 (add "Avg Days to Fund")
- More detailed activity feed (6 items instead of 4)
- Alert/notification indicator
- "Generate Report" hint button

---

## Implementation Approach

### Phase 1: Infrastructure Changes

1. **WelcomePage.tsx**: Change `end: '+=150%'` to `end: '+=300%'`
2. **WorkflowSection.tsx**: Update progress distribution formula

### Phase 2: Stage Timing Refactor

Each stage file needs timing constants refactored:

**Pattern for each stage:**
```tsx
// Entry phase (0-25%)
const entryProgress = Math.min(1, progress * 4)

// Showcase phase (25-75% → mapped to 0-1)
const showcaseProgress = Math.max(0, Math.min(1, (progress - 0.25) * 2))

// Transition phase (75-100% → mapped to 0-1)
const exitProgress = Math.max(0, Math.min(1, (progress - 0.75) * 4))
```

### Phase 3: Content Enrichment

Add new visual elements to fill extended duration:
- More data items (lines, stats, activity items)
- Intermediate status messages
- Summary/completion states
- Subtle looping animations during showcase phase

---

## File Changes Summary

| File | Changes |
|------|---------|
| `WelcomePage.tsx` | Change scroll distance from 150% to 300% |
| `WorkflowSection.tsx` | Restructure progress distribution, faster header/content |
| `ImportStage.tsx` | Add upload animation, 8 lines, structure detection phase |
| `SubmitStage.tsx` | Add line typing, validation state, richer summary |
| `ReviewStage.tsx` | Add history timeline, more detailed flag panel |
| `StagingStage.tsx` | Add card fly-in, builder detection phase |
| `FundingStage.tsx` | Add calendar animation, wire timeline |
| `TrackingStage.tsx` | Add 4th stat, more activity items, report hint |

---

## Verification Checklist

1. **Scroll Test**: Full workflow takes ~4-5 deliberate scrolls (not 2-3)
2. **Dwell Test**: Each stage is fully visible for ~40% of its duration
3. **Transition Test**: Stage changes feel smooth, not jarring
4. **Content Test**: No "dead time" where nothing animates
5. **Mobile Test**: Animations work at mobile breakpoint
6. **Reduced Motion**: Graceful fallback maintained

---

## Success Metrics

- Users can clearly read each stage description while viewing animations
- Stage transitions feel deliberate, not rushed
- The "showcase" phase allows appreciation of the complete visualization
- No "dead time" where scroll happens but nothing visual changes
- Total workflow scroll takes approximately twice as long as before
