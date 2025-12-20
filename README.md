# TD3

**Draw Management Built for How We Actually Work**

TD3 is an internal system that brings order to construction loan servicing. It replaces scattered spreadsheets, buried emails, and manual reconciliation with a single place where every loan, budget, draw, and approval is visible, trackable, and auditable.

This isn't about adopting more software. It's about reducing the mental overhead of keeping everything straight—so we can focus on decisions instead of data entry.

---

## The Problem

Construction lending operations create two persistent challenges that compound as the portfolio grows.

### Everything Lives in Too Many Places

Right now, understanding the state of a single loan requires checking multiple sources: the budget or draw spreadsheet that someone emailed last month, approval threads buried in inboxes, handwritten sticky notes from phone calls, and whatever information someone is keeping track of in their head happens to be.

This fragmentation creates real problems:

- **No single source of truth.** Budget data exists in different Excel files on different machines, each slightly different. Which one is current? Who knows.
- **Decisions disappear into email.** Approvals, exceptions, and important context get trapped in individual inboxes. When questions arise later, reconstructing what happened means hunting through threads.
- **Reporting takes hours.** Compiling a simple portfolio status means pulling data from multiple places, re-keying numbers, and hoping nothing got missed.
- **Audits are painful.** When we need to show our work, piecing together the timeline of a loan means detective work, not documentation.

A small team can hold all this in their heads, until they can't. The system doesn't scale down gracefully, and it definitely doesn't scale up.

### Too Much Time on Repetitive Work

Even with good intentions and smart people, manual processes eat time that should go elsewhere:

- **Budget categorization is tedious.** Every new project means manually classifying line items, often inconsistently across loans.
- **Invoice matching is slow.** Each draw request requires manually matching invoices to budget categories, one by one, checking amounts, flagging mismatches.
- **Data entry crowds out judgment.** Hours spent re-keying numbers is hours not spent on analysis, risk assessment, or builder relationships.
- **Inconsistency undermines reporting.** When every loan is categorized slightly differently, portfolio-level insights become unreliable.

The work gets done, but it takes longer than it should, and it's harder to trust.

---

## The Solution

TD3 addresses both problems directly: **one place for everything** and **automation for the repetitive stuff**.

### A Single Source of Truth

Every loan, builder, budget, draw request, invoice, and approval lives in one system. Not spreadsheets with version numbers in the filename—a real database that stays current.

This means:

- **The current state is always obvious.** Open the dashboard and see exactly where things stand—across the portfolio or for any individual loan.
- **History is preserved automatically.** Every change, every approval, every upload is timestamped and attributed. The audit trail writes itself.
- **Reporting is instant.** No more compiling. The data is already structured. Generate reports in seconds, not hours.
- **Anyone can pick up where someone else left off.** Context isn't trapped in someone's head or inbox. It's in the system.

When the current state is obvious, less mental energy goes to "wait, where is that?" and more goes to actual decisions.

### Intelligent Automation Where It Matters

TD3 uses AI to handle the tedious, repetitive tasks that currently eat hours:

- **Automatic budget standardization.** Upload a builder's budget spreadsheet, and AI classifies each line item to industry-standard NAHB cost codes. Consistent categorization across every project, every time.
- **Smart invoice matching.** Upload invoices with a draw request, and AI extracts vendor names, amounts, and descriptions—then matches them to the right budget lines automatically.
- **Built-in validation.** The system flags over-budget requests, duplicate invoices, and missing documentation before you even see them. Problems surface early, not after funding.

The key insight: AI handles the pattern matching and data extraction. Humans review the results and make decisions. Tasks that took hours complete in seconds—with better consistency.

---

## How It Works

The day-to-day workflow is straightforward:

1. **Import** — Upload a builder's budget spreadsheet. TD3 detects categories and amounts, you confirm the mapping, and AI standardizes everything to NAHB cost codes.

2. **Submit** — When a draw comes in, upload the request. AI matches draw amounts to existing budget lines automatically.

3. **Review** — See the full picture: amounts, budget status, flags, invoices. Resolve any issues directly in the interface.

4. **Stage** — Approved draws move to staging. See all staged draws grouped by builder, ready for funding.

5. **Fund** — Select a funding date, add wire reference if needed, and mark draws as funded with one click. The system handles the rest.

6. **Track** — Dashboards show real-time status across the portfolio. Budget utilization, draw history, amortization schedules—all visible without compiling anything.

---

## Key Features

### Project & Loan Management

Everything about a loan in one place—from origination through every draw to final payoff.

- Complete loan lifecycle tracking (Pending → Active → Historic)
- Builder profiles with company info, banking details, and aggregated portfolios
- Multi-lender support (TD2, TenBrook, Tennant) with proper separation
- Auto-generated project codes for consistent identification
- Lender selection with automatic builder info population

### Budget Tracking & Standardization

Structured budgets that stay consistent across your entire portfolio.

- Line-item budgets with NAHB cost code classification
- AI-powered category standardization on import
- Real-time remaining balance calculations
- Smart column detection for flexible spreadsheet formats
- Hierarchical category structure (16 main categories, 118 subcategories)

### Draw Requests & Funding

The complete draw workflow, from submission to funded.

- Spreadsheet upload with intelligent parsing
- AI matching of draw amounts to budget lines
- Inline editing for quick corrections
- Staging dashboard grouped by builder
- One-click "Fund All" with date picker and wire reference
- Wire batch tracking for audit purposes

### Invoice & Document Processing

Less time matching invoices, more confidence in the results.

- Drag-and-drop upload with preview gallery
- AI extraction of vendor, amount, and description
- Automatic matching to budget categories with confidence scores
- Flag generation for mismatches and duplicates
- Document categorization and storage

### Validation & Safety Checks

Problems surface before they become mistakes.

- Over-budget warnings on draw requests
- Duplicate invoice detection
- Missing documentation flags
- Unmatched category alerts
- Amount variance flagging with configurable thresholds

### Financial Reporting & Analytics

Real-time visibility without manual compilation.

- Progress budget reports with multiple views (table, cards, charts)
- Amortization schedules with draw-by-draw interest tracking
- Payoff calculator with what-if scenarios
- Fee escalation tracking with accurate calculations
- IRR and income metrics for historic loans
- Anomaly detection for spending spikes and variances

### Dashboards & Navigation

See exactly what matters, exactly when you need it.

- Portfolio Dashboard for overview and learning
- Draw Dashboard for daily operations
- Cascading filters that update dynamically
- Deep-link URLs for specific views
- Builder timeline with Gantt and spreadsheet views
- Keyboard shortcuts for power users

### Audit Trail & Compliance

Every action documented, automatically.

- Timestamped records of all changes
- User attribution on every action
- Immutable audit events
- Complete funding history with wire references
- Approval workflow tracking

---

## System Architecture

The diagram below shows how the pieces fit together. The key idea: users interact with a clean web interface, AI handles the tedious processing, and everything lands in a structured database that preserves history and enables reporting.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                              │
│                                                                          │
│   What you see: Clean dashboards, upload forms, reports, approvals       │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Upload Budget   │  │  Upload Draw    │  │   Dashboard / Reports   │  │
│  │ (Excel/CSV)     │  │  (Excel/CSV)    │  │   Project Management    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           ▼                    ▼                        │               │
│  ┌────────────────────────────────────────┐             │               │
│  │        Smart Spreadsheet Parsing       │             │               │
│  │                                        │             │               │
│  │  Detects columns, lets you confirm     │             │               │
│  │  before anything gets processed        │             │               │
│  └────────────────┬───────────────────────┘             │               │
└───────────────────┼─────────────────────────────────────┼───────────────┘
                    │                                     │
                    ▼                                     │
┌─────────────────────────────────────────────────────────┼───────────────┐
│                      AI PROCESSING LAYER                │               │
│                                                         │               │
│   What happens here: The tedious work gets automated    │               │
│                                                         │               │
│  ┌─────────────────────────────────────────────────────┐│               │
│  │              Budget Import                          ││               │
│  │  • Filters out header/footer rows automatically     ││               │
│  │  • Standardizes categories to NAHB codes            ││               │
│  │  • Consistent classification across all projects    ││               │
│  └─────────────────────────────────────────────────────┘│               │
│                                                         │               │
│  ┌─────────────────────────────────────────────────────┐│               │
│  │              Draw Processing                        ││               │
│  │  • Matches draw categories to existing budgets      ││               │
│  │  • Extracts invoice data automatically              ││               │
│  │  • Generates flags for issues requiring review      ││               │
│  └─────────────────────────────────────────────────────┘│               │
└──────────────────────────┬──────────────────────────────┼───────────────┘
                           │                              │
                           ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CENTRAL DATABASE                                 │
│                                                                          │
│   What lives here: Everything. One source of truth.                      │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌──────────────────────┐ │
│  │  Projects  │ │  Budgets   │ │   Draws     │ │   Draw Lines         │ │
│  │            │ │            │ │             │ │                      │ │
│  │  Loan info │ │ Line items │ │  Requests   │ │  Budget linkage      │ │
│  │  Builder   │ │ NAHB codes │ │  Status     │ │  Invoice matching    │ │
│  │  Lender    │ │ Remaining  │ │  Totals     │ │  Flags               │ │
│  └────────────┘ └────────────┘ └─────────────┘ └──────────────────────┘ │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌──────────────────────┐ │
│  │  Builders  │ │  Lenders   │ │ Wire Batches│ │   Audit Events       │ │
│  │            │ │            │ │             │ │                      │ │
│  │  Company   │ │  Entity    │ │  Funding    │ │  Every action        │ │
│  │  Banking   │ │  Terms     │ │  Groups     │ │  Timestamped         │ │
│  │  Contact   │ │  Rates     │ │  References │ │  Attributed          │ │
│  └────────────┘ └────────────┘ └─────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why this structure matters:**
- User actions flow through a consistent interface—no direct database access, no spreadsheet chaos
- AI processing is isolated and auditable—you can see what it did and correct it if needed
- The database preserves everything—history, relationships, audit trail—automatically

---

## Data Flow

These diagrams show what happens when you upload a budget or submit a draw request. The key point: you upload a spreadsheet, confirm your intent, and the system handles the rest.

### Budget Upload

*You upload a builder's budget → AI standardizes categories → Structured data lands in the database*

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│   You    │───▶│  Web App  │───▶│     AI       │───▶│  Classify │───▶│ Database │
│          │    │           │    │              │    │           │    │          │
│ Upload   │    │ Parse &   │    │ Filter out   │    │ Map to    │    │ Store    │
│ Excel    │    │ detect    │    │ junk rows    │    │ NAHB codes│    │ budgets  │
│          │    │ columns   │    │              │    │           │    │          │
│          │◀───│ You       │◀───│              │◀───│           │◀───│ Confirm  │
│          │    │ confirm   │    │              │    │           │    │ success  │
└──────────┘    └───────────┘    └──────────────┘    └───────────┘    └──────────┘
```

### Draw Request

*You upload a draw → AI matches to budget → Ready for review and funding*

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│   You    │───▶│  Web App  │───▶│     AI       │───▶│   Match   │───▶│ Database │
│          │    │           │    │              │    │           │    │          │
│ Upload   │    │ Parse &   │    │ Match draw   │    │ Link to   │    │ Create   │
│ draw     │    │ select    │    │ categories   │    │ budget    │    │ draw     │
│ request  │    │ project   │    │ to budgets   │    │ lines     │    │ request  │
└──────────┘    └───────────┘    └──────────────┘    └───────────┘    └──────────┘
```

---

## Security and Compliance

- **Complete Audit Trail** — Every action logged with timestamps and user attribution
- **Role-Based Access** — Configurable permissions and approval workflows
- **Data Integrity** — Immutable audit records prevent tampering
- **Enterprise Database** — PostgreSQL with row-level security capabilities
- **Document Verification** — Duplicate detection prevents accidental double-processing
- **Compliant Infrastructure** — Built on SOC 2 certified hosting

---

## Current Status

TD3 is in active use and continuous development. The system is functional for daily operations, with ongoing refinement based on real usage.

**What's Working Now:**

- ✅ Project management dashboard with iOS-style dark mode UI
- ✅ Loan lifecycle management (Pending → Active → Historic)
- ✅ iOS-style stage selector to filter loans by lifecycle
- ✅ Tabbed loan pages with progressive disclosure
- ✅ New loan origination workflow with inline editing
- ✅ Default term sheet integration
- ✅ Document upload with categorized document types
- ✅ Budget upload with smart column detection
- ✅ Intelligent row boundary detection with visual classification
- ✅ Excel formatting preservation (bold, borders)
- ✅ Weighted keyword scoring for closing costs
- ✅ Interactive row range controls (click, drag, keyboard)
- ✅ Inline budget editor with cascading Category → Subcategory dropdowns
- ✅ Auto-generated project codes (e.g., "DW-244")
- ✅ AI-powered NAHB budget categorization
- ✅ Hierarchical NAHB category structure (16 categories, 118 subcategories)
- ✅ Budget management tools (Clear All, auto-replace on upload)
- ✅ Standardized NAHB cost code taxonomy
- ✅ **Builder Page System** — Dedicated builder management with company info, banking details, and loan portfolio view
- ✅ **Lender Support** — Multi-lender tracking (TD2, TenBrook, Tennant) with proper separation
- ✅ **Toggle-Based Filter Sidebar** — 3-way toggle (Builder/Subdivision/Lender) with cascading filters
- ✅ **Stage-Specific Stats Bar** — Dynamic metrics per lifecycle stage with visual elements
- ✅ **Historic Loan Metrics** — Total Income and IRR calculations on historic loan tiles
- ✅ **Enhanced LTV Color Coding** — Risk-based thresholds (≤65% green, 66-74% yellow, ≥75% red)
- ✅ **Compact Builder Info Card** — 4-column layout with clickable email/phone links
- ✅ **Borrower Auto-Fill** — Automatically populates from selected builder profile
- ✅ **Budget Amount Field** — Auto-calculated from uploaded budget categories
- ✅ **Loan Lifecycle Transitions** — Checkbox-driven state changes with validation
- ✅ **Dual Dashboard Design** — Portfolio Dashboard and Draw Dashboard as mirror-image home pages
- ✅ **Smart Navigation System** — Context-aware back button with breadcrumb trail
- ✅ **Quick Links Popup** — Press Q for quick access to actions, pages, and recent items
- ✅ **Cascading Filters** — Filter options update dynamically based on selections
- ✅ **Unified Dashboard Header** — Consistent header component across dashboards
- ✅ **Draw Status Selector** — iOS-style toggle (All/Review/Staged/Wire) with live counts
- ✅ **Embedded Nav Buttons** — Large navigation buttons in stats bars
- ✅ **Recent Pages Tracking** — Last 5 visited pages in Quick Links
- ✅ **Keyboard Navigation** — Q for Quick Links, Escape to close
- ✅ **Animated Transitions** — Smooth animations throughout the interface
- ✅ **Active Page Indicator** — Current route highlighted in navigation
- ✅ **TD3 Design Language System** — Comprehensive design system for consistency
- ✅ **Dark Red/Maroon Accent Palette** — Brand colors with AAA accessibility
- ✅ **Material Elevation System** — 5-level shadow hierarchy
- ✅ **Polymorphic Behaviors** — Context-aware styling
- ✅ **Draw Request System** — Complete draw upload workflow with invoice management
- ✅ **Fuzzy Category Matching** — Intelligent matching of draw categories to budgets
- ✅ **Draw Review Page** — Comprehensive table view with inline editing and flags
- ✅ **Cascading Dropdowns for Unmatched Lines** — NAHB Category → Budget selectors
- ✅ **Invoice Upload & Preview** — Drag-drop with thumbnail gallery and modal viewer
- ✅ **AI Invoice Processing** — Two-stage extraction and matching with confidence scores
- ✅ **Enhanced Financial Reports** — Two-view toggle (Table/Chart) for each report
  - **Budget Report**: Sankey flow, Category Utilization with budget markers, Spending Velocity
  - **Amortization Report**: Balance Growth, Draw Timeline, Interest Analysis donut chart
  - **Payoff Report**: Fee Escalation, Payoff Projection, What-If Comparison with custom dates
- ✅ **Chart Information Tooltips** — Each chart includes an info tooltip explaining the visualization
- ✅ **Credits System (Payoff)** — Manage credits/adjustments that reduce payoff amounts
- ✅ **Title Company Report Generator** — Professional payoff letter for title companies
- ✅ **Standardized Loan Terms** — Hierarchical term resolution (Project > Lender > Default)
- ✅ **Accurate Fee Calculation** — Precise fee escalation matching our formulas
- ✅ **Interactive Payoff Calculator** — What-If scenarios with custom date picker
- ✅ **Fee & Interest Projection Chart** — Visual projections over 18 months
- ✅ **Anomaly Detection** — Automated flagging of spending spikes and variances
- ✅ **Polymorphic Loan Details** — Expandable accordion with context-aware stats
- ✅ **Urgency Indicators** — Color-coded maturity warnings
- ✅ **View Mode Persistence** — User preferences saved between sessions
- ✅ **Report Detail Panel** — Slide-out panel for drill-down on any line item
- ✅ **Invoice Preview Modal** — Split-view PDF preview with match details
- ✅ **Compound Interest Amortization** — Accurate draw-by-draw interest with monthly compounding
- ✅ **Auto Fee Clock Start** — Fee calculation begins from first funded draw
- ✅ **Loan Activation Enhancement** — Lender selection required for activation
- ✅ **Builder Timeline** — Interactive Gantt/spreadsheet views grouped by lender
  - Calendar-based Gantt columns with pill-shaped draw bars
  - Two-panel spreadsheet view with sticky columns
  - "Show only funded" filter
  - Click-to-open detail panel
  - Keyboard navigation (arrow keys + Enter)
- ✅ **Lender Selection Dropdown** — Searchable picker with activation validation
- ✅ **Builder Auto-Fill Fields** — Automatic population from builder profile
- ✅ **Lender Display in Header** — Visible alongside builder and address
- ✅ **Draw Dashboard Reorganization** — Adaptive layout with dynamic widths
  - Wire Confirmation at top (collapses when empty)
  - Pending Review and Staged by Builder side-by-side
  - Smooth layout animations
- ✅ **Light Mode Default** — Clean light theme with dark mode available
- ✅ **Complete Draw Funding Workflow** — Multi-stage funding process
  - `review` → `staged` → `pending_wire` → `funded`
  - Unstage capability from draw review page
  - Fund All creates wire batch and moves to Pending Wire Confirmation
  - Bookkeeper marks as funded with wire reference and date
  - Budget spend tracking automatically updates on funding
- ✅ **Wire Batch System** — Grouped funding with complete tracking
  - Builder-grouped wire batches
  - Official funding report for bookkeepers
  - Wire reference and funding date capture
  - Full audit trail
- ✅ **Budget Import with Countdown Timer** — Enhanced import experience
  - Adaptive countdown based on category count (~1.1s per category)
  - Animated task messages during processing
  - Real-time N8N response validation
  - Success/error feedback before navigation
- ✅ **Protected Budget Data** — Funded draw data preservation
  - Budgets with funded draws cannot be deleted
  - Warning UI shows which categories are protected
  - Smart merge for duplicate categories during reimport
  - Non-funded draw lines become "unmatched" instead of deleted
- ✅ **$0/Blank Budget Amount Support** — Full support for placeholder categories
  - Budget categories with $0 or blank amounts are imported correctly
  - Allows unfunded or placeholder line items in budgets
  - Only filters based on category name, not amount
- ✅ **Create Budget Lines from Draw Review** — Dynamic budget expansion
  - Unmatched draw categories can become new budget lines
  - Cascading NAHB Category → Subcategory selection
  - Creates budget with draw amount as initial budget
- ✅ **Draw Budget Diagnostic Tools** — Troubleshooting endpoints
  - GET `/api/draws/[id]/recalculate-budget` for diagnostics
  - POST endpoint to manually recalculate budget spend
- ✅ **URL-Based Dashboard Filtering** — Deep-linking for specific views

**In Active Development:**

- 🔄 Invoice-to-budget matching reliability improvements
- 🔄 Multi-step approval workflows
- 🔄 Inspection scheduling integration

**On the Roadmap:**

- Portfolio analytics enhancements
- LOS system integrations
- Mobile inspection app for field photos

---

## Contact

**Grayson Graham**  
GRYSNGRHM

For questions, demos, or feedback, reach out directly.

---

*© 2024-2025 Grayson Graham / GRYSNGRHM. All rights reserved.*
