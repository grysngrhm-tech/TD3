# TD3

**Modern Draw Management for Construction Lenders**

TD3 is a web-based platform that streamlines construction draw processing by centralizing loan data and automating repetitive tasks with AI.

---

## The Problem

Construction lending teams lose valuable time to fragmented data and manual processes.

### Scattered Information

- Budget data lives in Excel files across different computers, each version slightly different
- Critical approvals and decisions buried in individual email inboxes
- No unified view of loan status—compiling a simple report means hunting through multiple sources
- When issues arise, piecing together what happened is nearly impossible

### Repetitive Manual Work

- Hours spent categorizing budget line items for each new project
- Manually matching invoices to draw request line items, one by one
- Skilled staff stuck doing data entry instead of analysis and decision-making
- Inconsistent categorization across projects makes portfolio reporting unreliable

---

## The Solution

TD3 combines a **centralized database** with **AI-powered automation** to eliminate these pain points.

### One Source of Truth

Every project, budget, draw request, invoice, and approval lives in a single PostgreSQL database. This means:

- **Complete loan lifecycle** — Track each loan from origination through every draw to final payoff
- **Real-time visibility** — Dashboards and reports generated instantly from live data, not manually compiled spreadsheets
- **Full audit trail** — Every change, approval, and decision recorded with timestamps and user attribution
- **Portfolio intelligence** — Analytics across all active loans, not isolated project-by-project views

### Intelligent Automation

Structured n8n workflows give AI agents the tools to handle complex but repetitive tasks:

- **Budget Standardization** — AI classifies builder budget categories to industry-standard NAHB cost codes, ensuring consistency across all projects
- **Invoice Matching** — AI extracts data from uploaded invoices and matches them to the correct draw request line items automatically
- **Validation Checks** — System flags budget overages, duplicate invoices, and missing documentation before approval

Your team reviews AI recommendations instead of doing manual data entry. Tasks that took hours now complete in seconds.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                              │
│                          (Next.js Web Application)                       │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Upload Budget   │  │  Upload Draw    │  │   Dashboard / Reports   │  │
│  │ (Excel/CSV)     │  │  (Excel/CSV)    │  │   Project Management    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           ▼                    ▼                        │               │
│  ┌────────────────────────────────────────┐             │               │
│  │     Smart Column Detection (SheetJS)   │             │               │
│  │  • Pattern analysis for Category/Amount │             │               │
│  │  • Interactive column mapping UI        │             │               │
│  │  • User confirmation before submit      │             │               │
│  └────────────────┬───────────────────────┘             │               │
└───────────────────┼─────────────────────────────────────┼───────────────┘
                    │                                     │
                    ▼                                     │
┌─────────────────────────────────────────────────────────┼───────────────┐
│                         N8N WORKFLOWS                   │               │
│                    (AI Processing Engine)               │               │
│                                                         │               │
│  ┌─────────────────────────────────────────────────────┐│               │
│  │              Budget Import Workflow                 ││               │
│  │  1. Receive: {categories[], amounts[], metadata}    ││               │
│  │  2. AI: Filter valid budget rows                    ││               │
│  │  3. AI: Standardize to NAHB cost codes              ││               │
│  │  4. Insert: budgets table                           ││               │
│  └─────────────────────────────────────────────────────┘│               │
│                                                         │               │
│  ┌─────────────────────────────────────────────────────┐│               │
│  │               Draw Import Workflow                  ││               │
│  │  1. Receive: {categories[], amounts[], drawNumber}  ││               │
│  │  2. AI: Match categories to existing budget lines   ││               │
│  │  3. Create: draw_request + draw_request_lines       ││               │
│  │  4. Update: budget spent_amount                     ││               │
│  └─────────────────────────────────────────────────────┘│               │
│                          │                              │               │
│                          ▼                              │               │
│              ┌───────────────────────┐                  │               │
│              │   OpenAI GPT-4o-mini  │                  │               │
│              │   • Row filtering     │                  │               │
│              │   • NAHB mapping      │                  │               │
│              │   • Category matching │                  │               │
│              └───────────────────────┘                  │               │
└──────────────────────────┬──────────────────────────────┼───────────────┘
                           │                              │
                           ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE                                      │
│                    (PostgreSQL + Auth + Storage)                         │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐│
│  │  projects  │ │  budgets   │ │draw_requests│ │ draw_request_lines    ││
│  │            │ │            │ │             │ │                       ││
│  │ • name     │ │ • category │ │ • draw_num  │ │ • amount_requested    ││
│  │ • builder  │ │ • amount   │ │ • status    │ │ • budget_id (FK)      ││
│  │ • lender   │ │ • nahb_code│ │ • total     │ │ • invoice data        ││
│  └────────────┘ └────────────┘ └─────────────┘ └────────────────────────┘│
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐│
│  │  builders  │ │  lenders   │ │ approvals  │ │    audit_events       ││
│  │            │ │            │ │            │ │                       ││
│  │ • company  │ │ • name     │ │ • decision │ │ • entity_type/id      ││
│  │ • banking  │ │ • code     │ │ • comments │ │ • action + timestamp  ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Budget Upload Flow

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│  User    │───▶│  WebApp   │───▶│   n8n        │───▶│  OpenAI   │───▶│ Supabase │
│          │    │           │    │              │    │           │    │          │
│ 1. Upload│    │ 2. Parse  │    │ 4. Filter    │    │ 5. Map to │    │ 6. Insert│
│ Excel    │    │ & detect  │    │ valid rows   │    │ NAHB codes│    │ budgets  │
│          │    │ columns   │    │              │    │           │    │          │
│          │◀───│ 3. User   │◀───│              │◀───│           │◀───│ 7. Return│
│          │    │ confirms  │    │              │    │           │    │ success  │
└──────────┘    └───────────┘    └──────────────┘    └───────────┘    └──────────┘
```

### Draw Request Upload Flow

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│  User    │───▶│  WebApp   │───▶│   n8n        │───▶│  OpenAI   │───▶│ Supabase │
│          │    │           │    │              │    │           │    │          │
│ 1. Upload│    │ 2. Parse  │    │ 4. Match     │    │ 5. Link   │    │ 6. Create│
│ Draw CSV │    │ & select  │    │ categories   │    │ to budget │    │ draw_req │
│          │    │ project   │    │ to budgets   │    │ line items│    │ + lines  │
│          │    │ + draw #  │    │              │    │           │    │          │
└──────────┘    └───────────┘    └──────────────┘    └───────────┘    └──────────┘
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Project Management** | Create and track construction projects with loan details, builder info, and milestones |
| **Builder Portal** | Dedicated builder pages with company info, banking details, and aggregated loan portfolio |
| **Multi-Lender Support** | Track loans by lending entity (TD2, TenBrook, Tennant) with database-level separation |
| **Budget Tracking** | Line-item budgets with NAHB cost code classification and real-time remaining balances |
| **Draw Requests** | Submit, review, and approve draw requests with full documentation |
| **Invoice Processing** | Upload invoices and let AI extract and match data automatically |
| **Smart Import** | Client-side spreadsheet parsing with intelligent column detection |
| **Financial Analytics** | IRR and income calculations for historic loans, LTV risk distribution for pending |
| **Toggle Filters** | 3-way filter sidebar with persistent selections across Builder/Subdivision/Lender |
| **Validation Engine** | Automatic checks prevent errors before they happen |
| **Progress Reports** | Generate printable reports showing budget status and draw history |
| **Audit Trail** | Complete history of every action for compliance and accountability |

---

## How It Works

1. **Import** — Upload a builder's budget spreadsheet; the webapp detects categories and amounts, you confirm, and AI standardizes categories to NAHB codes
2. **Submit** — Create draw requests by uploading the updated spreadsheet; AI matches draw amounts to existing budget lines
3. **Review** — Approve or reject with full visibility into validation results
4. **Track** — Real-time dashboards show budget status, draw history, and portfolio health

---

## Security and Compliance

- **Complete Audit Trail** — Every action logged with timestamps and user attribution
- **Role-Based Access** — Configurable approval workflows and permissions
- **Data Integrity** — Immutable audit records prevent tampering
- **Enterprise Database** — PostgreSQL with row-level security
- **Document Verification** — Hash-based duplicate detection prevents fraud
- **SOC 2 Architecture** — Built on Supabase's compliant infrastructure

---

## Roadmap

**Current**
- Budget import with AI categorization
- Draw request processing
- Basic validation engine

**In Progress**
- Full invoice-to-budget AI matching
- Multi-level approval workflows
- Inspection scheduling integration

**Planned**
- Portfolio analytics dashboard
- LOS system integrations
- Mobile inspection app for field photos

---

## Status

TD3 is currently in active development. 

**Completed:**
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
- ✅ Webhook integration with n8n workflows
- ✅ n8n Budget Import workflow with AI-powered NAHB categorization
- ✅ Hierarchical NAHB category database schema (16 categories, 118 subcategories)
- ✅ Budget deletion tools (Clear All button, auto-replace on upload)
- ✅ Standardized NAHB cost code taxonomy with "Other" catch-all subcategories
- ✅ **Builder Page System** — Dedicated builder management with company info, banking details, and loan portfolio view
- ✅ **Lender Support** — Multi-lender tracking (TD2, TenBrook, Tennant) with database-level separation for future RLS
- ✅ **Toggle-Based Filter Sidebar** — 3-way toggle (Builder/Subdivision/Lender) with persistent multi-category filtering
- ✅ **Stage-Specific Stats Bar** — Dynamic metrics per lifecycle stage with visual elements (LTV distribution, utilization progress, income breakdown)
- ✅ **Historic Loan Metrics** — Total Income and IRR calculations displayed on historic loan tiles
- ✅ **Enhanced LTV Color Coding** — Risk-based thresholds (≤65% green, 66-74% yellow, ≥75% red)
- ✅ **Compact Builder Info Card** — 4-column layout with clickable email/phone links and collapsible notes
- ✅ **Borrower Auto-Fill** — Automatically populates from selected builder profile
- ✅ **Budget Amount Field** — Auto-calculated from uploaded budget categories in origination view

**In Progress:**
- 🔄 Draw Import workflow with invoice matching
- 🔄 Full invoice-to-budget-line AI matching
- 🔄 Approval workflow and validation engine

---

## Built With

Next.js, Tailwind CSS, PostgreSQL (Supabase), n8n Cloud, OpenAI

---

## Contact

**Grayson Graham**  
GRYSNGRHM

For demos, licensing inquiries, or more information, please reach out directly.

---

*© 2024 Grayson Graham / GRYSNGRHM. All rights reserved.*
