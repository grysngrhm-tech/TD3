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
│  │ • loan_amt │ │ • nahb_code│ │ • total     │ │ • invoice data        ││
│  └────────────┘ └────────────┘ └─────────────┘ └────────────────────────┘│
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐│
│  │  invoices  │ │ documents  │ │ approvals  │ │    audit_events       ││
│  │            │ │            │ │            │ │                       ││
│  │ • vendor   │ │ • file_url │ │ • decision │ │ • entity_type/id      ││
│  │ • amount   │ │ • hash     │ │ • comments │ │ • action + timestamp  ││
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
| **Budget Tracking** | Line-item budgets with NAHB cost code classification and real-time remaining balances |
| **Draw Requests** | Submit, review, and approve draw requests with full documentation |
| **Invoice Processing** | Upload invoices and let AI extract and match data automatically |
| **Smart Import** | Client-side spreadsheet parsing with intelligent column detection |
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

## Built With

- **Next.js 14** — React framework with App Router for fast, responsive interfaces
- **Tailwind CSS** — Utility-first styling with dark mode support
- **PostgreSQL** — Enterprise-grade database via Supabase
- **n8n Cloud** — Workflow automation platform powering AI integrations
- **OpenAI GPT-4o-mini** — Intelligent categorization and document extraction
- **SheetJS (xlsx)** — Client-side spreadsheet parsing
- **Framer Motion** — Smooth animations and transitions

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# n8n Webhooks
NEXT_PUBLIC_N8N_BUDGET_WEBHOOK=https://your-n8n.app.n8n.cloud/webhook/budget-import
NEXT_PUBLIC_N8N_DRAW_WEBHOOK=https://your-n8n.app.n8n.cloud/webhook/draw-import
```

---

## Project Structure

```
TD3/
├── app/                    # Next.js App Router pages
│   ├── components/         # React components
│   │   ├── import/         # Budget/Draw import UI
│   │   └── ui/             # Shared UI components
│   ├── hooks/              # Custom React hooks
│   └── page.tsx            # Main dashboard
├── lib/                    # Shared utilities
│   ├── spreadsheet.ts      # SheetJS parsing + column detection
│   ├── supabase.ts         # Database client
│   └── validations.ts      # Business logic validation
├── types/                  # TypeScript definitions
│   └── database.ts         # Supabase generated types
├── n8n/workflows/          # Workflow documentation
└── docs/                   # Technical documentation
```

---

## Status

TD3 is currently in active development. 

**Completed:**
- ✅ Project management dashboard with iOS-style dark mode UI
- ✅ Budget and Draw upload with smart column detection
- ✅ Interactive spreadsheet preview and column mapping
- ✅ Webhook integration ready for n8n workflows

**In Progress:**
- 🔄 n8n workflow implementation for AI-powered categorization
- 🔄 Invoice upload and automatic matching

---

## Technical Documentation

See the `/docs` folder for detailed technical documentation:

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and data flow
- [n8n Workflows](n8n/workflows/README.md) - Webhook payloads and workflow specs
- [Database Schema](types/README.md) - Table structures and relationships

---

## Contact

**Grayson Graham**  
GRYSNGRHM

For demos, licensing inquiries, or more information, please reach out directly.

---

*© 2024 Grayson Graham / GRYSNGRHM. All rights reserved.*
