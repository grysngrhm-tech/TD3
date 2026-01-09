# TD3

**Draw Management Built for How We Actually Work**

TD3 is an internal system that brings order to construction loan servicing. It replaces scattered spreadsheets, buried emails, and manual reconciliation with a single place where every loan, budget, draw, and approval is visible, trackable, and auditable.

This isn't about adopting more software. It's about reducing the mental overhead of keeping everything straight—so we can focus on decisions instead of data entry.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Development Roadmap](docs/ROADMAP.md) | Launch timeline, milestones, cost estimates, and team input requirements |
| [Technical Architecture](docs/ARCHITECTURE.md) | System design, data flows, and component responsibilities |
| [Design Language](docs/DESIGN_LANGUAGE.md) | UI/UX standards, color palette, and component patterns |

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

TD3 is fully functional for daily operations. The system handles the complete construction loan lifecycle from origination through payoff.

### Loan & Project Management

- **Complete Loan Lifecycle** — Track loans through Pending → Active → Historic stages with checkbox-driven transitions
- **Loan Origination** — Create new loans with inline editing, default term sheets, and auto-generated project codes (e.g., "DW-244")
- **Builder Management** — Dedicated builder pages with company info, banking details, contact links, and portfolio views with auto-fill for new loans
- **Multi-Lender Support** — Track loans across multiple lenders (TD2, TenBrook, Tennant) with proper separation and lender-required activation

### Budget System

- **Smart Budget Import** — Upload Excel/CSV budgets with intelligent column detection, row boundary recognition, and Excel formatting preservation
- **AI-Powered Categorization** — Automatic mapping to NAHB cost codes (16 categories, 118 subcategories) with confidence scoring
- **Inline Budget Editor** — Edit budgets directly with cascading Category → Subcategory dropdowns and real-time calculations
- **Budget Protection** — Funded draws preserve budget data; smart merge handles reimports; placeholder categories ($0 amounts) fully supported
- **Dynamic Budget Expansion** — Create new budget lines directly from draw review when categories are unmatched

### Draw Processing & Funding

- **Complete Draw Workflow** — Multi-stage process: `review` → `staged` → `pending_wire` → `funded` with unstage capability
- **Intelligent Category Matching** — Fuzzy matching of draw categories to budgets with cascading dropdowns for manual assignment
- **Wire Batch System** — Group draws by builder for single wire transfers with official funding reports, wire references, and full audit trail
- **Invoice Management** — Drag-drop upload with thumbnail gallery, AI-powered extraction, and split-view PDF preview with match details
- **Automated Validation** — Flag over-budget requests, duplicate invoices, missing documentation, and low-confidence matches

### Financial Calculations & Reports

- **Compound Interest Amortization** — Accurate draw-by-draw interest with monthly compounding and automatic fee clock start
- **Interactive Payoff Calculator** — Real-time payoff statements with what-if scenarios, per diem rates, and custom date projections
- **Title Company Reports** — Professional payoff letters with credits management and good-through dates
- **Fee Escalation Tracking** — Precise calculation matching our formulas with hierarchical term resolution (Project > Lender > Default)
- **Three Financial Report Types** — Budget (Sankey flow, utilization charts), Amortization (balance growth, draw timeline), and Payoff (fee projection, what-if comparison) with Table/Chart toggle views
- **Anomaly Detection** — Automated flagging of spending spikes, velocity changes, and budget variances
- **Risk Indicators** — LTV color coding (≤65% green, 66-74% yellow, ≥75% red) and maturity urgency warnings

### Dashboards & Navigation

- **Dual Dashboard Design** — Portfolio Dashboard for overview and Draw Dashboard for daily operations
- **Smart Filtering** — 3-way toggle (Builder/Subdivision/Lender) with cascading filters and URL-based deep linking
- **Stage-Specific Metrics** — Dynamic stats bars showing relevant KPIs per lifecycle stage (pipeline value, utilization, IRR)
- **Builder Timeline** — Interactive Gantt and spreadsheet views grouped by lender with keyboard navigation
- **Quick Navigation** — Context-aware back button, Quick Links popup (press Q), recent pages tracking, and keyboard shortcuts

### User Interface & Design

- **TD3 Design System** — Consistent visual language with dark red/maroon accent palette (AAA accessibility) and Material elevation system
- **Light & Dark Modes** — Clean light theme default with full dark mode support
- **Polymorphic Components** — Context-aware styling that adapts to content state and user role
- **Smooth Animations** — Framer Motion transitions throughout with view mode persistence across sessions
- **Progressive Disclosure** — Tabbed loan pages and expandable accordions reveal detail on demand

**In Active Development:**

- 🔄 Invoice-to-budget matching reliability improvements
- 🔄 Multi-step approval workflows
- 🔄 Inspection scheduling integration

**On the Roadmap:**

See the full [Development Roadmap](docs/ROADMAP.md) for detailed timeline and milestones.

- User authentication with role-based permissions
- Historical data migration from legacy Excel systems
- DocuSign API integration for loan origination
- Microsoft Adaptive Cards for workflow notifications
- Builder and lender portal access
- RAG-powered portfolio chatbot
- Mobile inspection app for field photos

---

## Contact

**Grayson Graham**  
GRYSNGRHM

For questions, demos, or feedback, reach out directly.

---

*© 2024-2025 Grayson Graham / GRYSNGRHM. All rights reserved.*
