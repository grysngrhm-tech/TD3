# TD3 Project Context

## Overview
TD3 is a construction loan management system built for Tennant Development. It replaces scattered spreadsheets with a unified platform for tracking loans, budgets, draws, and wire transfers throughout the construction lending lifecycle.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL) - Project ID: uewqcbmaiuofdfvqmbmq
- **Auth**: Supabase Auth (passwordless magic links) + RLS
- **AI Workflows**: n8n (self-hosted at https://n8n.srv1208741.hstgr.cloud)
- **Charts**: Nivo (Sankey, Bar, Line, Pie)
- **UI Components**: Radix UI (Dialog, Accordion, Tabs)
- **Spreadsheet Parsing**: xlsx-js-style
- **Data Grid**: react-datasheet-grid

## Key Directories
- `app/` - Next.js App Router pages and components
  - `app/(auth)/` - Auth route group (login page with centered layout)
  - `app/admin/` - Admin pages (user management)
  - `app/auth/` - Auth callback route for magic link handling
  - `app/components/` - React components (builders, draws, import, projects, ui)
  - `app/components/auth/` - Auth UI components (FirstLoginModal, PermissionGate)
  - `app/context/` - React contexts (AuthContext, NavigationContext)
  - `app/api/` - API routes (webhooks, validations, reports, invoices)
- `middleware.ts` - Next.js middleware for route protection
- `lib/` - Core business logic
  - `supabase.ts` - Supabase clients, auth types, and permission constants
  - `calculations.ts` - Financial calculations (IRR, amortization, payoff)
  - `loanTerms.ts` - Fee escalation formulas and term resolution
  - `spreadsheet.ts` - Excel parsing with column/row detection
  - `validations.ts` - Draw request validation and flag generation
  - `anomalyDetection.ts` - Budget and spending anomaly detection
  - `invoiceMatching.ts` - Deterministic invoice-to-draw-line matching
  - `invoiceLearning.ts` - Match correction learning and training data
  - `n8n.ts` - n8n webhook integration and payload types
- `types/` - TypeScript type definitions (`database.ts`)
- `supabase/` - Database migrations and schema
  - `001_schema.sql` - Core tables (projects, budgets, draws, etc.)
  - `002_seed.sql` - NAHB categories and reference data
  - `004_auth.sql` - Authentication tables, RLS policies, and helper functions
- `n8n/workflows/` - n8n workflow documentation
- `n8n-workflows/` - n8n workflow JSON exports
- `docs/` - Documentation (ARCHITECTURE.md, DESIGN_LANGUAGE.md, ROADMAP.md)

## Database Schema (Key Tables)

### Auth & Authorization (supabase/004_auth.sql)
- `profiles` - User profiles linked to auth.users (name, phone, first_login_completed)
- `permissions` - Permission catalog (processor, fund_draws, approve_payoffs, users.manage)
- `user_permissions` - Junction table for stackable user permissions
- `allowlist` - Pre-authorized emails that can sign in

### Core Business Tables
- `projects` - Construction loans with lifecycle_stage (pending/active/historic)
- `builders` - Builder/contractor companies with banking info
- `budgets` - Line items with NAHB cost codes and AI confidence scores
- `draw_requests` - Draw submissions with status workflow
- `draw_request_lines` - Individual items linked to budgets
- `wire_batches` - Groups draws per builder for single wire transfers
- `nahb_categories/subcategories` - 16 major categories, 118 subcategories
- `invoices` - Uploaded invoice files with extraction and match status
- `invoice_match_decisions` - Audit trail of matching decisions (auto/manual)
- `invoice_match_training` - Learning data from approved matches
- `vendor_category_associations` - Vendor-to-category mappings for training

## Important Patterns

### Authentication & Authorization

#### Architecture: Passwordless + Allowlist + Stackable Permissions + RLS

TD3 uses Supabase Auth with magic link (passwordless) authentication. Only pre-approved email addresses in the `allowlist` table can sign in. Users are assigned stackable permissions that control access at both UI and database levels.

#### Auth Flow
```
1. User visits protected route
2. Middleware redirects to /login (preserves redirect param)
3. User enters email → allowlist check → magic link sent
4. User clicks link → /auth/callback → session created
5. First login? → FirstLoginModal prompts for name/phone
6. Redirect to original destination
```

#### Permission System
| Code | Label | Controls |
|------|-------|----------|
| `processor` | Loan Processor | INSERT/UPDATE/DELETE on business tables |
| `fund_draws` | Fund Draws | Transition draws/batches to 'funded' status |
| `approve_payoffs` | Approve Payoffs | Approve payoffs before sending to title |
| `users.manage` | Manage Users | Access to `/admin/users` page |

#### RLS Policy Pattern
- **SELECT**: All authenticated users can read portfolio data
- **INSERT/UPDATE/DELETE**: Requires `processor` permission
- **Funding transitions**: Requires `fund_draws` permission (gated in policy)
- **User/allowlist management**: Requires `users.manage` permission
- **Service role**: Bypasses RLS for API routes and n8n callbacks

#### Key Auth Files
| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection, session refresh, redirect handling |
| `app/context/AuthContext.tsx` | Global auth state (user, profile, permissions) |
| `app/components/auth/PermissionGate.tsx` | Conditional rendering by permission |
| `app/components/auth/FirstLoginModal.tsx` | Profile completion on first sign-in |
| `app/(auth)/login/page.tsx` | Passwordless login page |
| `app/auth/callback/route.ts` | Magic link code exchange |
| `app/admin/users/page.tsx` | User & permission management UI |
| `lib/supabase.ts` | Browser client, Permission type, labels/descriptions |
| `supabase/004_auth.sql` | Schema, RLS policies, helper functions |

#### Database Helper Functions
```sql
has_permission(user_id, permission_code) → BOOLEAN  -- Used in RLS policies
is_allowlisted(email) → BOOLEAN                     -- Called during login
get_user_permissions(user_id) → TEXT[]              -- Returns all permissions
```

#### Usage Examples

**Check permission in component:**
```tsx
import { PermissionGate, useHasPermission } from '@/app/components/auth'

// Declarative
<PermissionGate permission="fund_draws">
  <FundButton />
</PermissionGate>

// Imperative
const canFund = useHasPermission('fund_draws')
```

**Get current user in component:**
```tsx
import { useAuth } from '@/app/context/AuthContext'

const { user, profile, permissions, hasPermission, signOut } = useAuth()
```

#### Complete Auth Setup Process

**Step 1: Apply Database Migration**

Run `supabase/004_auth.sql` in Supabase SQL Editor. This creates:
- Tables: `profiles`, `permissions`, `user_permissions`, `allowlist`
- Functions: `has_permission()`, `is_allowlisted()`, `get_user_permissions()`
- RLS policies on all tables
- Trigger for auto-profile creation

**Step 2: Configure Supabase Auth URLs**

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://td3.tennantdevelopments.com`
  - ⚠️ No leading/trailing spaces!
  - Must match your custom domain exactly
- **Redirect URLs**: Add:
  - `https://td3.tennantdevelopments.com/**`
  - `http://localhost:3000/**` (for local dev)

**Step 3: Configure Email Provider**

In Supabase Dashboard → Authentication → Providers → Email:
- Enable Email provider: ON
- Confirm email: OFF (magic links handle verification)

**Step 4: Add First Admin to Allowlist**
```sql
INSERT INTO allowlist (email, notes)
VALUES ('admin@example.com', 'Initial admin')
ON CONFLICT (email) DO NOTHING;
```

**Step 5: First Admin Sign In**
1. Navigate to your app URL
2. Enter admin email → receive magic link
3. Click link → complete profile form

**Step 6: Grant Admin All Permissions**
```sql
INSERT INTO user_permissions (user_id, permission_code)
SELECT u.id, p.code
FROM auth.users u
CROSS JOIN permissions p
WHERE u.email = 'admin@example.com'
ON CONFLICT (user_id, permission_code) DO NOTHING;
```

**Step 7: Verify Setup**
- Refresh the app
- You should see the full dashboard
- Admin link appears in header dropdown

### Loan Lifecycle
```
Pending → Active → Historic
```
- Pending: Loan in origination (Origination tab)
- Active: Loan funded, tracking draws (Status tab)
- Historic: Loan paid off (Performance tab)

### Draw Workflow
```
review → staged → pending_wire → funded
```
- review: Awaiting user review, editable
- staged: Approved, grouped with builder's other draws
- pending_wire: Sent to bookkeeper for wire processing
- funded: Wire sent, budget spent amounts updated, locked

### Financial Calculations
- **Compound Interest**: Monthly accrual at month-end and draw funding
- **Fee Escalation**: 2% months 1-6, +0.25%/month 7-12, 5.9% month 13, +0.4%/month after
- **IRR**: Newton-Raphson method on cash flows
- **LTV Risk**: ≤65% green, 66-74% yellow, ≥75% red

### Budget Categorization
- AI maps builder categories to NAHB cost codes (16 categories, 118 subcategories)
- Fuzzy matching for draw-to-budget category assignment (0.6 threshold)
- Cascading dropdowns: Category → Subcategory

### Invoice Matching Architecture
```
Upload → n8n Extraction → Callback → Deterministic Matching → Apply/Flag
```

**Flow:**
1. User uploads invoice PDF to `/api/invoices/upload`
2. TD3 stores file in Supabase Storage, creates invoice record
3. TD3 calls n8n webhook (`td3-invoice-process`) with signed file URL
4. n8n extracts data using GPT-4o-mini (vendor, amount, trade, keywords)
5. n8n calls back to `/api/invoices/process-callback` with extracted data
6. TD3 runs deterministic matching with weighted scores:
   - Amount: 50% (how close is invoice to draw line amount)
   - Trade: 20% (does extracted trade match category)
   - Keywords: 15% (keyword overlap with category tokens)
   - Training: 15% (vendor history from past matches)
7. Classification and action:
   - SINGLE_MATCH (≥85%, ≥15% gap): Auto-apply
   - MULTIPLE_CANDIDATES: Flag for review
   - AMBIGUOUS/NO_CANDIDATES: Manual review

**Key Files:**
- `lib/invoiceMatching.ts` - Candidate generation and scoring
- `lib/invoiceLearning.ts` - Training data capture from corrections
- `app/api/invoices/process-callback/route.ts` - n8n callback handler
- `app/components/draws/InvoiceMatchPanel.tsx` - Manual matching UI

## Environment Variables
Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # For server-side operations

# n8n Integration
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.srv1208741.hstgr.cloud/webhook
N8N_CALLBACK_SECRET=your-shared-secret  # Must match n8n's TD3_WEBHOOK_SECRET

# Optional
NEXT_PUBLIC_APP_URL=https://td3.tennantdevelopments.com  # For callback URLs
```

**n8n Environment (set in n8n instance):**
```
TD3_WEBHOOK_SECRET=your-shared-secret  # Must match TD3's N8N_CALLBACK_SECRET
TD3_API_URL=https://td3.tennantdevelopments.com     # Base URL for callbacks
```

## Code Style & Conventions
- TypeScript strict mode
- Tailwind for all styling (no inline styles, no CSS modules)
- Framer Motion for animations
- Prefer Radix UI for accessible primitives
- Component files use PascalCase (e.g., `BudgetEditor.tsx`)
- Utility files use camelCase (e.g., `calculations.ts`)

## n8n Workflows
Located in `n8n-workflows/`:
- `td3-invoice-process.json` - Invoice extraction with GPT-4o-mini

Webhook endpoints (base: `https://n8n.srv1208741.hstgr.cloud/webhook`):
- `/budget-import` - Budget spreadsheet AI categorization
- `/td3-draw-process` - Draw processing
- `/td3-invoice-process` - Invoice PDF extraction → callback to TD3

See `n8n/workflows/README.md` for detailed documentation.

## Git Workflow
```
main (production)     → Protected, deploys to production
  └── develop (staging) → Preview deployments on Vercel
       └── feature/*    → Local development
```

### Branching Rules
- **Never push directly to `main`** - All changes require a Pull Request
- Create feature branches from `develop` for new work
- PR to `develop` first, test on staging preview
- PR from `develop` to `main` when ready for production

### Workflow Example
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
# ... make changes ...
git add . && git commit -m "Add new feature"
git push -u origin feature/my-new-feature
# Create PR to develop on GitHub
# After merge, create PR from develop to main for production
```

## Common Development Commands
```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

## Key Features to Understand
1. **Authentication**: Passwordless (magic link) with allowlist and stackable permissions
2. **Smart Import**: Excel parsing with multi-signal row boundary detection
3. **Fuzzy Matching**: Levenshtein + tokenized word matching for category assignment
4. **Polymorphic Reports**: Budget/Amortization/Payoff reports with Table/Chart views
5. **Wire Batch System**: Groups multiple draws per builder into single wire transfers
6. **Audit Trail**: Every action logged with timestamps and user attribution
7. **Invoice Matching**: AI extraction + deterministic scoring with learning flywheel

## Owner
Grayson Graham (grysngrhm-tech on GitHub)
GRYSNGRHM organization on Supabase

