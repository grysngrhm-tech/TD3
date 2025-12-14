# TD3 - Construction Draw Management

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/grysngrhm-tech/td3)

A modern construction finance system for managing project budgets, draw requests, and approvals. Built to replace legacy Excel-based processes with a streamlined web application.

## Features

### Core Functionality

- **Project Management** - Create and manage construction projects with loan details
- **Budget Tracking** - Budget line items with NAHB cost code classification
- **Draw Requests** - Submit, review, and approve draw requests
- **Validation Engine** - Automatic checks for overages, duplicates, missing docs
- **Document Upload** - Attach invoices and supporting documents
- **Progress Reports** - Printable budget progress reports by project
- **Audit Trail** - Complete history of all changes and approvals

### AI-Powered Automation (n8n)

- Budget import with AI NAHB category classification
- Invoice extraction and matching via GPT-4 vision
- Approval workflow with validation integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + React + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Workflows | n8n Cloud |
| AI | OpenAI GPT-4.1-mini, GPT-4o-mini |

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account ([supabase.com](https://supabase.com))
- n8n Cloud account (optional, for workflows)
- OpenAI API key (optional, for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/grysngrhm-tech/td3.git
cd td3
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run `supabase/001_schema.sql`
3. (Optional) Run `supabase/002_seed.sql` for sample data
4. Go to **Storage** and create a bucket named `documents`
5. Copy your project URL and API keys from **Settings > API**

### 3. Environment Setup

```bash
cp env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy!

Vercel will automatically build and deploy on every push to `main`.

### Manual Deployment

```bash
npm run build
npm start
```

## Project Structure

```
TD3/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard
│   ├── projects/                 # Project management
│   ├── budgets/                  # Budget management
│   ├── draws/                    # Draw request management
│   ├── reports/                  # Reporting
│   └── api/                      # API routes
│       ├── webhooks/             # n8n webhook endpoints
│       ├── validations/          # Validation API
│       └── reports/              # Report generation
├── components/                   # React components
├── lib/                          # Utilities
├── types/                        # TypeScript types
├── supabase/                     # Database
│   ├── 001_schema.sql           # Complete schema
│   └── 002_seed.sql             # Sample data
└── n8n/workflows/               # n8n workflow definitions
```

## Data Model

| Table | Purpose |
|-------|---------|
| `projects` | Project metadata, loan details, builder info |
| `budgets` | Budget line items with NAHB cost codes |
| `draw_requests` | Draw request headers |
| `draw_request_lines` | Line items with invoice matching |
| `invoices` | Invoice records with duplicate detection |
| `documents` | File metadata (Supabase Storage) |
| `approvals` | Approval records |
| `audit_events` | Immutable event history |
| `nahb_cost_codes` | NAHB cost code taxonomy |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/draw-submitted` | POST | Trigger approval workflow |
| `/api/webhooks/document-uploaded` | POST | Process uploaded documents |
| `/api/validations/[drawId]` | GET | Run and return validations |
| `/api/reports/progress/[projectId]` | GET | Generate progress report |

## n8n Workflows

Import workflows from `n8n/workflows/`:

| Workflow | Purpose |
|----------|---------|
| TD3 - Budget Import | Excel budget import with AI NAHB classification |
| TD3 - Draw Processor | Invoice extraction & matching |
| TD3 - Approval Flow | Approval with validation checks |

See [`n8n/workflows/README.md`](n8n/workflows/README.md) for setup instructions.

## Validation Rules

| Check | Type | Description |
|-------|------|-------------|
| Budget Overage | Blocker | Line exceeds remaining budget |
| Duplicate Invoice | Blocker | Same vendor/amount/date or file hash |
| Missing Invoice | Warning | Line item without attached invoice |
| Low Confidence | Warning | AI matching score < 70% |
| Variance Alert | Warning | Draw vs invoice amount differs > $1 |

## Development

### Key Files

- `lib/validations.ts` - Validation logic
- `lib/audit.ts` - Audit event logging
- `components/` - Reusable UI components
- `types/database.ts` - TypeScript types from schema

### Adding Features

1. Update schema in `supabase/001_schema.sql`
2. Update types in `types/database.ts`
3. Add/modify components as needed
4. Create n8n workflow if automation required

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Private - All rights reserved. Grayson Graham / GRYSNGRHM.
