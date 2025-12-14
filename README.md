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

## Key Features

| Feature | Description |
|---------|-------------|
| **Project Management** | Create and track construction projects with loan details, builder info, and milestones |
| **Budget Tracking** | Line-item budgets with NAHB cost code classification and real-time remaining balances |
| **Draw Requests** | Submit, review, and approve draw requests with full documentation |
| **Invoice Processing** | Upload invoices and let AI extract and match data automatically |
| **Validation Engine** | Automatic checks prevent errors before they happen |
| **Progress Reports** | Generate printable reports showing budget status and draw history |
| **Audit Trail** | Complete history of every action for compliance and accountability |

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Import Budget  │────▶│  Submit Draws   │────▶│  Review & Pay   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   AI categorizes          AI matches            Full audit trail
   to NAHB codes         invoices to lines       in database
```

1. **Import** — Upload a builder's budget; AI standardizes categories automatically
2. **Submit** — Create draw requests with supporting invoices; AI matches and validates
3. **Review** — Approve or reject with full visibility into validation results
4. **Track** — Real-time dashboards show budget status, draw history, and portfolio health

---

## Built With

- **Next.js 14** — Modern React framework for fast, responsive interfaces
- **PostgreSQL** — Enterprise-grade database via Supabase for reliable data storage
- **n8n** — Workflow automation platform powering AI integrations
- **OpenAI** — GPT models for intelligent categorization and document extraction

---

## Status

TD3 is currently in active development. Core functionality for project management, budget tracking, draw processing, and AI automation is implemented.

---

## Contact

**Grayson Graham**  
GRYSNGRHM

For demos, licensing inquiries, or more information, please reach out directly.

---

*© 2024 Grayson Graham / GRYSNGRHM. All rights reserved.*
