# TD3 Technical Architecture

This document provides detailed technical information for developers and AI agents working on the TD3 system.

---

## Development Workflow

### Branch Strategy

```
main (production)     → Protected, requires PR, auto-deploys to Vercel
  └── develop (staging) → Preview deployments, integration testing
       └── feature/*    → Local development branches
```

### Environments

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| Production | `main` | Vercel production URL | Live application |
| Staging | `develop` | Vercel preview URL | Pre-production testing |
| Local | `feature/*` | localhost:3000 | Development |

### Workflow Steps

1. **Start new work**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Develop locally**
   ```bash
   npm run dev          # Start dev server
   npm run build        # Test production build
   npm run lint         # Check for issues
   ```

3. **Push to staging**
   ```bash
   git push origin develop
   # Or create PR to develop for review
   ```

4. **Test on staging**
   - Vercel auto-generates preview URL
   - Test with real Supabase data
   - Verify all functionality works

5. **Deploy to production**
   - Create PR: `develop` → `main`
   - Review changes
   - Merge triggers production deploy

### Branch Protection Rules

- **main**: Protected - no direct pushes, requires PR
- **develop**: Open - direct pushes allowed for quick iterations

### Database Note

Currently all environments share the same Supabase database. Be cautious with:
- Schema migrations (test on local first)
- Destructive operations (deletes, truncates)
- Seed data modifications

Future: Separate staging Supabase project for isolated testing.

---

## System Components

### 1. Web Application (Next.js)

**Purpose:** User interface for managing construction loans throughout their lifecycle, from origination through payoff.

**Key Responsibilities:**
- Loan lifecycle management (Pending → Active → Historic)
- Client-side spreadsheet parsing with SheetJS (xlsx-js-style)
- Smart column detection using multi-signal pattern analysis
- Intelligent row boundary detection with visual classification
- Interactive column mapping and row range selection UI
- Project/budget/draw data display
- Webhook calls to n8n workflows

**Technology:**
- Next.js 14 with App Router
- React 18 with hooks
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI for accessible components
- xlsx-js-style for Excel parsing with formatting support

### 2. n8n Workflows (AI Processing)

**Purpose:** Backend automation that receives spreadsheet data from the webapp and uses OpenAI to process, standardize, and insert data into Supabase.

**Key Responsibilities:**
- Receive column data from webapp webhooks
- Use OpenAI to filter valid rows and identify budget items
- Standardize builder categories to NAHB cost codes
- Match draw request categories to existing budget lines
- Insert processed data into Supabase tables

### 3. Supabase (Database + Auth)

**Purpose:** PostgreSQL database storing all application data with Row Level Security and user authentication.

**Key Responsibilities:**
- Store projects, budgets, draw requests, invoices
- Maintain audit trail of all changes
- Provide real-time subscriptions for UI updates
- **Authenticate users** via passwordless magic links
- **Authorize access** via stackable permissions and RLS policies

### 4. OpenAI (AI Processing)

**Purpose:** Intelligent text processing called from n8n workflows.

**Key Responsibilities:**
- Identify valid budget rows vs. headers/totals/empty rows
- Map builder budget categories to NAHB cost codes
- Match draw request line items to existing budget categories

---

## Loan Lifecycle System

TD3 tracks loans through three stages:

| Stage | Description | Primary Tab |
|-------|-------------|-------------|
| **Pending** | Loan in origination - collecting documents, budget review | Origination |
| **Active** | Loan funded - tracking draws and payments | Status |
| **Historic** | Loan completed - paid off or rejected | Performance |

### Stage Transitions

```
┌──────────────┐   "Loan Documents  ┌──────────────┐    "Payoff         ┌──────────────┐
│   PENDING    │ ────────────────▶  │    ACTIVE    │ ────────────────▶  │   HISTORIC   │
│              │    Recorded"       │              │    Approved"       │              │
│  Origination │    Checkbox        │  Draw Mgmt   │    Checkbox        │  Analytics   │
└──────────────┘                    └──────────────┘                    └──────────────┘
       │                                                                       ▲
       │                           Rejected                                    │
       └───────────────────────────────────────────────────────────────────────┘
```

### Stage Transition Controls

**Pending → Active:**
- **Control**: "Loan Documents Recorded" checkbox in Origination tab
- **Optional**: Link to uploaded loan agreement document
- **Behavior**: Checking updates `lifecycle_stage` to 'active' and records `stage_changed_at`

**Active → Historic:**
- **Control**: "Payoff Approved" checkbox in Status tab (active loans only)
- **Optional**: Link to uploaded payoff documentation
- **Behavior**: Checking updates `lifecycle_stage` to 'historic' and records payoff date

### UI Implementation

- **Home Page**: iOS-style segmented control to filter by stage (default: Active)
- **Dashboard Page**: Staging area for draw management and builder operations
- **Loan Page**: Tabbed interface with progressive disclosure based on stage
- **Stage Indicator**: Visual badges on project tiles

---

## Authentication & Authorization

TD3 implements a comprehensive authentication and authorization system using Supabase Auth with passwordless magic links, an email allowlist for access control, stackable permissions for fine-grained authorization, and Row Level Security (RLS) for database-level enforcement.

### Design Principles

1. **Passwordless Authentication** - Magic links eliminate password management and phishing risks
2. **Allowlist-Based Access** - Only pre-approved emails can sign in (no self-registration)
3. **Stackable Permissions** - Users can have any combination of permissions
4. **Database-Level Enforcement** - RLS policies enforce permissions at the database level
5. **Progressive Profile Completion** - First login prompts for profile information

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  User visits      Middleware        Login Page       Supabase Auth      Callback
  protected   ──►  redirects    ──►  checks      ──►  sends magic   ──►  exchanges
  route            to /login         allowlist        link               code

                                         │
                                         ▼
                               ┌─────────────────┐
                               │   is_allowlisted │
                               │   (check_email)  │
                               └────────┬────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
                   ✅ Allowed                      ❌ Not Allowed
                   Send magic link                 Show error

┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTHORIZATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Authenticated     AuthContext        PermissionGate       RLS Policy
  user makes   ──►  loads user    ──►  checks client   ──►  enforces at
  request           permissions        permissions          database

                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │   has_permission   │
                                    │   (user_id, code)  │
                                    └─────────┬─────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                         ✅ Allowed                      ❌ Denied
                         Execute query                   Return error
```

### Database Schema

#### Tables (supabase/004_auth.sql)

```sql
-- User profiles linked to Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  first_login_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permission catalog
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,           -- 'processor', 'fund_draws', etc.
  name TEXT NOT NULL,                   -- 'Loan Processor'
  description TEXT,                     -- Human-readable description
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User-permission junction table (stackable)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_code)
);

-- Email allowlist for access control
CREATE TABLE allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);
```

#### Helper Functions

```sql
-- Check if user has specific permission (used in RLS policies)
CREATE FUNCTION has_permission(check_user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = check_user_id AND permission_code = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if email is in allowlist (called during login)
CREATE FUNCTION is_allowlisted(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM allowlist WHERE lower(email) = lower(check_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all permissions for a user
CREATE FUNCTION get_user_permissions(check_user_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT permission_code FROM user_permissions WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Triggers

```sql
-- Auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update timestamps on profile changes
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_timestamp();
```

### Permission System

TD3 uses four stackable permissions:

| Code | Label | Description | Controls |
|------|-------|-------------|----------|
| `processor` | Loan Processor | Core processing work | INSERT/UPDATE/DELETE on business tables |
| `fund_draws` | Fund Draws | Record draws as funded | Transition draws/batches to 'funded' status |
| `approve_payoffs` | Approve Payoffs | Approve payoff statements | Approve payoffs before title company |
| `users.manage` | Manage Users | Admin panel access | Access to /admin/users, manage allowlist |

#### Permission Combinations

Users can have any combination of permissions:

| Role Pattern | Permissions | Typical User |
|--------------|-------------|--------------|
| **Full Admin** | all 4 | Owner, senior manager |
| **Processor** | processor | Loan processor staff |
| **Processor + Funder** | processor, fund_draws | Staff who can fund |
| **View Only** | (none) | Read-only access |

### Row Level Security (RLS)

All tables have RLS enabled. Policies follow these patterns:

#### Auth Tables

```sql
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

-- User permissions: Only admins can modify
CREATE POLICY "user_permissions_insert_admin" ON user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'users.manage'));
```

#### Business Tables

```sql
-- All authenticated users can read portfolio data
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (true);

-- Only processors can write
CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'processor'));

-- Special: Funding transition requires fund_draws permission
CREATE POLICY "draw_requests_update" ON draw_requests
  FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN status = 'funded' THEN has_permission(auth.uid(), 'fund_draws')
      ELSE has_permission(auth.uid(), 'processor')
    END
  );
```

### Frontend Components

#### AuthContext (app/context/AuthContext.tsx)

Provides global authentication state:

```tsx
interface AuthContextType {
  user: User | null              // Supabase auth user
  profile: Profile | null        // Extended profile data
  permissions: Permission[]      // User's permission codes
  isLoading: boolean             // Auth state loading
  isAuthenticated: boolean       // Shorthand for !!user
  signOut: () => Promise<void>   // Sign out function
  hasPermission: (p: Permission | Permission[]) => boolean
  refreshProfile: () => Promise<void>
  refreshPermissions: () => Promise<void>
}
```

#### PermissionGate (app/components/auth/PermissionGate.tsx)

Conditional rendering based on permissions:

```tsx
// Single permission
<PermissionGate permission="processor">
  <EditButton />
</PermissionGate>

// Any of multiple permissions (OR)
<PermissionGate permission={['processor', 'fund_draws']}>
  <ActionButton />
</PermissionGate>

// All permissions required (AND)
<PermissionGate permission={['processor', 'users.manage']} requireAll>
  <AdminProcessorButton />
</PermissionGate>

// With fallback
<PermissionGate permission="fund_draws" fallback={<ReadOnlyView />}>
  <FundingControls />
</PermissionGate>
```

#### useHasPermission Hook

For programmatic permission checks:

```tsx
const canFund = useHasPermission('fund_draws')
const canProcess = useHasPermission(['processor', 'fund_draws'])
const isAdmin = useHasPermission('users.manage')
```

#### FirstLoginModal (app/components/auth/FirstLoginModal.tsx)

Prompts new users to complete their profile:

- Shown when `profile.first_login_completed === false`
- Collects full name (required) and phone (optional)
- Updates profile and sets `first_login_completed = true`

### Middleware (middleware.ts)

Next.js middleware handles route protection:

```typescript
// Public routes (no auth required)
const publicRoutes = ['/login', '/auth/callback']

// API routes handle their own auth
const isApiRoute = pathname.startsWith('/api/')

// Protected routes redirect to login
if (!user) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}
```

### Login Flow (app/(auth)/login/page.tsx)

1. **Email Input** - User enters email address
2. **Allowlist Check** - Calls `is_allowlisted()` RPC function
3. **Magic Link** - If allowed, Supabase sends magic link email
4. **Callback** - `/auth/callback` exchanges code for session
5. **Redirect** - Redirects to original destination (or home)

### Admin User Management (app/admin/users/page.tsx)

Requires `users.manage` permission. Provides:

- **Active Users List** - All users who have signed in
- **Permission Toggles** - Click to grant/revoke permissions
- **Invite User** - Add email to allowlist with initial permissions
- **Pending Invites** - Users invited but not yet signed in
- **Remove from Allowlist** - Revoke access

### Header Integration (app/components/ui/Header.tsx)

- **User Avatar** - Displays initials from profile name or email
- **Dropdown Menu** - Shows user info, admin link (if permitted), sign out

### Supabase Client Configuration (lib/supabase.ts)

```typescript
// Legacy client (doesn't persist sessions properly)
export const supabase = createClient<Database>(...)

// Browser client for auth flows (use this for login/logout)
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Permission types and labels
export type Permission = 'processor' | 'fund_draws' | 'approve_payoffs' | 'users.manage'

export const PERMISSION_LABELS: Record<Permission, string> = {
  'processor': 'Loan Processor',
  'fund_draws': 'Fund Draws',
  'approve_payoffs': 'Approve Payoffs',
  'users.manage': 'Manage Users'
}
```

### Setup & Bootstrap

#### 1. Apply Migration

Run `supabase/004_auth.sql` in Supabase SQL Editor. This creates all auth tables, functions, and RLS policies.

#### 2. Configure Supabase Auth URLs

**This is critical for magic links to work!**

Go to: **Supabase Dashboard → Authentication → URL Configuration**

| Setting | Value | Notes |
|---------|-------|-------|
| **Site URL** | `https://your-app.vercel.app` | Must match your EXACT Vercel deployment URL. No spaces! |
| **Redirect URLs** | `https://your-app.vercel.app/**` | Add your production URL pattern |
| | `http://localhost:3000/**` | Add for local development |

**Common mistake**: Having a space before/after the Site URL will cause "otp_expired" errors.

#### 3. Configure Email Provider

Go to: **Supabase Dashboard → Authentication → Providers → Email**

| Setting | Value |
|---------|-------|
| Enable Email | ON |
| Confirm email | OFF |
| Secure email change | ON (recommended) |

#### 4. Add First Admin to Allowlist

```sql
INSERT INTO allowlist (email, notes)
VALUES ('admin@yourcompany.com', 'Initial admin')
ON CONFLICT (email) DO NOTHING;
```

#### 5. First Admin Sign In

1. Navigate to your deployed app
2. Enter admin email at login
3. Check email for magic link
4. Click link to complete sign in
5. Fill out profile form (name, phone)

#### 6. Grant Admin All Permissions

After the admin has signed in (user exists in `auth.users`):

```sql
INSERT INTO user_permissions (user_id, permission_code)
SELECT u.id, p.code
FROM auth.users u
CROSS JOIN permissions p
WHERE u.email = 'admin@yourcompany.com'
ON CONFLICT (user_id, permission_code) DO NOTHING;
```

#### 7. Verify Setup

1. Refresh the app in browser
2. Dashboard should load with all data visible
3. Click avatar → should see "Admin" link in dropdown
4. Navigate to `/admin/users` → should see user management page

### Common Operations

#### Add New User

1. Admin navigates to `/admin/users`
2. Clicks "Invite User"
3. Enters email and selects initial permissions
4. User receives magic link when they try to sign in

#### Grant Permission

```sql
INSERT INTO user_permissions (user_id, permission_code, granted_by)
VALUES ('user-uuid', 'fund_draws', 'admin-uuid');
```

Or via Admin UI: Click the permission toggle button.

#### Revoke Permission

```sql
DELETE FROM user_permissions
WHERE user_id = 'user-uuid' AND permission_code = 'fund_draws';
```

Or via Admin UI: Click the active permission toggle to deactivate.

#### Remove User Access

```sql
-- Remove from allowlist (prevents future logins)
DELETE FROM allowlist WHERE email = 'user@example.com';

-- Optionally deactivate profile (for audit trail)
UPDATE profiles SET is_active = false WHERE email = 'user@example.com';
```

### Troubleshooting

#### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Email not authorized" | Email not in allowlist | Add to allowlist via Admin UI or SQL |
| "Email link is invalid or has expired" | Site URL mismatch | Check Supabase URL Configuration matches your Vercel URL exactly |
| Magic link redirects to wrong URL | Site URL has spaces | Remove leading/trailing spaces from Site URL in Supabase |
| Blank screen after login | No permissions granted | Grant permissions via SQL after first login |
| Loading spinner stuck | RLS blocking data access | Check user has `processor` permission |
| User can't fund draws | Missing `fund_draws` | Grant the specific permission |
| Data not loading | Using wrong Supabase client | Ensure `lib/supabase.ts` exports browser client |

#### Magic Link / OTP Errors

**"otp_expired" or "Email link is invalid"**

This occurs when:
1. **Site URL mismatch**: The Supabase Site URL doesn't match your actual deployment URL
   - Check: Supabase Dashboard → Authentication → URL Configuration
   - Site URL must be EXACTLY your Vercel domain (e.g., `https://td3-iota.vercel.app`)
   - No spaces before or after the URL

2. **Clicking old magic links**: Each new magic link invalidates previous ones
   - Solution: Always use the NEWEST email, click immediately

3. **Preview vs Production URL**: Testing on a Vercel preview URL but Site URL is set to production
   - Either test on production, or temporarily change Site URL to match preview

#### Blank Screen After Login

If authenticated but seeing blank screen/spinner:

1. **Check browser console** for errors (F12 → Console tab)

2. **Verify profile exists**:
   ```sql
   SELECT * FROM profiles WHERE email = 'your@email.com';
   ```

3. **Verify permissions granted**:
   ```sql
   SELECT * FROM user_permissions up
   JOIN auth.users u ON up.user_id = u.id
   WHERE u.email = 'your@email.com';
   ```

4. **Grant permissions if missing**:
   ```sql
   INSERT INTO user_permissions (user_id, permission_code)
   SELECT u.id, p.code
   FROM auth.users u
   CROSS JOIN permissions p
   WHERE u.email = 'your@email.com'
   ON CONFLICT (user_id, permission_code) DO NOTHING;
   ```

5. **Check RLS is working**: The `supabase` export in `lib/supabase.ts` must use `createBrowserClient` (not `createClient`) to properly handle authenticated sessions.

#### Supabase Client Configuration

**Critical**: The exported `supabase` client must use `createBrowserClient` from `@supabase/ssr`:

```typescript
// lib/supabase.ts - CORRECT
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
```

Using `createClient` from `@supabase/supabase-js` will NOT work with RLS because it doesn't handle session cookies properly in the browser.

---

## Draw Funding System

TD3 implements a comprehensive draw request workflow that handles the entire process from invoice upload through wire transfer.

### Draw Request Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DRAFT     │────▶│   REVIEW    │────▶│   STAGED    │────▶│PENDING_WIRE │────▶│   FUNDED    │
│             │     │             │     │             │     │             │     │             │
│ Upload Draw │     │ User Review │     │ Ready to    │     │ Bookkeeper  │     │ Wire Sent   │
│ & Invoices  │     │ & Edit      │     │ Fund        │     │ Processing  │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘     └─────────────┘
                           ▲                    │
                           │    Unstage         │
                           └────────────────────┘
```

### Draw Status Values

| Status | Description | User Action |
|--------|-------------|-------------|
| `review` | Draw created, awaiting user review | Edit amounts, assign categories, attach invoices |
| `staged` | Draw approved, grouped with builder's other draws | Can be unstaged back to review |
| `pending_wire` | All builder draws approved, sent to bookkeeper | Bookkeeper enters wire reference and funding date |
| `funded` | Wire sent, draw complete | Locked - budget spend amounts updated |

### Draw Funding Workflow

1. **Stage for Funding** (from draw review page)
   - Status changes from `review` → `staged`
   - Draw appears in "Staged by Builder" section of staging dashboard

2. **Unstage Draw** (from draw review page, if staged)
   - Status changes from `staged` → `review`
   - Draw returns to editable state

3. **Fund All** (from Staged by Builder tile)
   - Creates a `wire_batch` with status `pending`
   - All staged draws for builder change to `pending_wire`
   - Draws move to "Pending Wire Confirmation" section

4. **Confirm Wire** (from Pending Wire Confirmation)
   - Bookkeeper enters funding date and wire reference
   - `wire_batch` status changes to `funded`
   - All draws in batch change to `funded`
   - Budget `spent_amount` and `remaining_amount` updated for each draw line

### Key Features

**1. Intelligent Category Matching**
- Fuzzy matching algorithm with 0.6 threshold
- Levenshtein distance for typo handling
- Tokenized word matching for word order variations
- Matches against `builder_category_raw` first, then NAHB categories

**2. Cascading Dropdowns for Unmatched Lines**
- First dropdown: NAHB Category (filtered to available budgets)
- Second dropdown: Budget items in selected category
- Auto-filters to exclude already-assigned budgets

**3. Invoice Management** (See [Invoice Matching Architecture](#invoice-matching-architecture))
- Drag-and-drop upload on draw request page
- Thumbnail previews with modal viewer
- Deterministic matching with AI-extracted signals
- Narrow AI selection only for ambiguous cases
- Learning system improves with every funded draw
- Re-run matching capability from review page

**4. Builder-Based Wire Batching**
- Multiple draws for same builder grouped into single wire
- Staging dashboard shows draws organized by builder
- One wire per builder regardless of loan count

### Draw Request Pages

| Page | Path | Purpose |
|------|------|---------|
| New Draw Request | `/draws/new` | Upload draw spreadsheet and invoices |
| Draw Review | `/draws/[id]` | Review, edit, and approve draw request |
| Staging Dashboard | `/staging` | Central hub for all draw operations |

---

## Invoice Matching Architecture

TD3 implements a sophisticated invoice-to-budget-line matching system that uses deterministic scoring with narrow AI assistance only when needed.

### Design Principles

1. **AI reads, application reasons**: AI extracts structured signals from invoices; deterministic code scores and selects candidates
2. **Amount matching is primary**: Invoice amounts covering draw line amounts is the main goal (50% weight)
3. **Narrow AI assistance**: AI only chooses among pre-validated candidates when scores are too close
4. **Clear failure modes**: Each failure type has distinct handling and user communication
5. **Full auditability**: Every decision is explainable and recorded in the database
6. **Continuous learning**: Every approved draw becomes training data for future matching

### Invoice Processing Flow

```
UPLOAD → n8n (EXTRACTION ONLY) → CALLBACK → DETERMINISTIC MATCHING → [AI if needed] → APPLY → LEARN
```

#### Step-by-Step Flow

1. **Invoice Upload** (`/api/invoices/upload`)
   - Invoices uploaded via drag-drop on draw request page
   - Files stored in Supabase Storage: `invoices/{projectId}/{drawId}/{uuid}-{filename}`
   - Invoice record created with `extraction_status: 'pending'`

2. **n8n Extraction** (`n8n-workflows/td3-invoice-process.json`)
   - GPT-4o-mini extracts structured signals (NO line items, NO matching decisions)
   - Outputs: `vendorName`, `amount`, `context`, `keywords`, `trade`, `workType`, `vendorType`
   - AI confidence score indicates extraction quality

3. **Extraction Callback** (`/api/invoices/process-callback`)
   - Stores extracted data in `invoices.extracted_data`
   - Updates `extraction_status` to 'extracted' or 'extraction_failed'
   - Triggers deterministic matching pipeline

4. **Candidate Generation** (`lib/invoiceMatching.ts`)
   - Generates scored candidates for each draw line
   - Uses weighted factors: Amount (50%), Trade (20%), Keywords (15%), Training (15%)

5. **Classification** (`lib/invoiceMatching.ts`)
   - Categorizes result: `SINGLE_MATCH`, `MULTIPLE_CANDIDATES`, `AMBIGUOUS`, `NO_CANDIDATES`
   - Single high-confidence matches auto-apply
   - Multiple close candidates trigger AI selection

6. **AI Selection** (`lib/invoiceAISelection.ts`) - Only when needed
   - GPT-4o-mini selects from pre-scored candidates
   - Cannot invent new matches or categories
   - Can flag for human review if uncertain

7. **Apply Match**
   - Updates invoice with `draw_request_line_id`, `matched_to_category`
   - Updates draw line with invoice details
   - Records decision in `invoice_match_decisions` audit table

8. **Learn** (On draw approval via wire batch funding)
   - Captures all matches as training data
   - Updates vendor → category associations
   - System improves with every funded draw

### Scoring Algorithm

The matching system uses a weighted composite score:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Amount** | **50%** | Proximity to draw line `amount_requested` |
| Trade Match | 20% | Extracted `trade` field matches budget NAHB category |
| Keywords | 15% | Overlap between extracted `keywords` and category terms |
| Training | 15% | Historical patterns from past approved matches |

#### Amount Scoring (50% of total)

| Variance | Score | Description |
|----------|-------|-------------|
| ±$50 or ±2% | 1.00 | Exact match |
| Within 5% | 0.95 | Near exact |
| Within 10% | 0.80 | Good match |
| Within 15% | 0.65 | Acceptable |
| Within 25% | 0.45 | Marginal |
| Over 25% | 0.20 | Poor match |

#### Classification Thresholds

| Threshold | Value | Purpose |
|-----------|-------|---------|
| `AUTO_MATCH_SCORE` | 0.85 | Above = auto-match without AI |
| `CLEAR_WINNER_GAP` | 0.15 | Gap needed between top 2 for single match |
| `MIN_CANDIDATE_SCORE` | 0.35 | Below = not considered as candidate |

### Match Classification

| Status | Condition | Invoice `match_status` | Action |
|--------|-----------|------------------------|--------|
| `SINGLE_MATCH` | Score > 0.85, gap > 0.15 | `auto_matched` | Auto-apply |
| `MULTIPLE_CANDIDATES` | 2+ within 0.15 gap | `ai_matched` or `needs_review` | AI selection |
| `AMBIGUOUS` | AI flagged for review | `needs_review` | Human review |
| `NO_CANDIDATES` | All scores < 0.35 | `no_match` | Manual match |
| `EXTRACTION_FAILED` | n8n error | N/A | Retry extraction |

### AI Extraction Output

The n8n workflow extracts structured signals for deterministic matching:

```json
{
  "vendorName": "ABC Electric LLC",
  "invoiceNumber": "INV-2024-001",
  "invoiceDate": "2024-01-15",
  "amount": 4500.00,

  "context": "Electrical panel upgrade and wiring for 200amp service",
  "keywords": ["electrical", "panel", "wiring", "200amp", "service", "breaker"],
  "trade": "electrical",
  "workType": "mixed",
  "vendorType": "subcontractor",
  "projectReference": "Lot 42",
  "hasLienWaiver": false,
  "confidence": 0.95
}
```

| Field | Purpose in Matching |
|-------|---------------------|
| `amount` | **Primary signal** - matches to draw line `amount_requested` |
| `keywords` | Fuzzy match against budget category names and NAHB codes |
| `trade` | Direct mapping to NAHB categories (electrical → "Electrical") |
| `context` | Stored for audit trail and display |
| `vendorType` | Distinguishes supplier vs labor invoices |
| `hasLienWaiver` | Can flag if lien waiver missing for large amounts |
| `confidence` | Low extraction confidence → flag for review |

### Learning System (The Flywheel)

Every approved draw becomes training data. The system improves with every funded draw.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THE LEARNING FLYWHEEL                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Invoice Uploaded                                                  │
│        │                                                            │
│        ▼                                                            │
│   Extraction (n8n/AI)                                               │
│        │                                                            │
│        ▼                                                            │
│   Training DB queried for:                                          │
│   - Vendor history (ABC Electric → Electrical 5x)                   │
│   - Keyword patterns (wiring → Electrical 20x)                      │
│   - Trade mappings (electrical → Electrical 50x)                    │
│        │                                                            │
│        ▼                                                            │
│   Deterministic Matching (training boosts scores)                   │
│        │                                                            │
│        ▼                                                            │
│   Match Applied                                                     │
│        │                                                            │
│        ▼                                                            │
│   Draw Approved (funded) ──────────────────────────────────┐        │
│        │                                                    │        │
│        ▼                                                    ▼        │
│   Training DB updated:              ◄───────────────────────┘        │
│   - vendor + category (ground truth)                                │
│   - keywords + category                                             │
│   - trade + category                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Training Data Captured

When a draw is funded, `lib/invoiceLearning.ts` captures:

| Data | Purpose |
|------|---------|
| Vendor → Category | Future invoices from same vendor boost that category |
| Keywords → Category | Invoices with similar keywords boost that category |
| Trade → Category | Trade signals boost corresponding NAHB categories |
| Match method | Tracks auto vs AI vs manual for quality metrics |
| Was corrected | Manual corrections inform model of mistakes |

#### Vendor Association Table

The `vendor_category_associations` table provides fast lookups during matching:

```sql
-- Example: ABC Electric has matched to Electrical 5 times, totaling $45,000
vendor_name_normalized: "abc electric"
budget_category: "Electrical"
match_count: 5
total_amount: 45000.00
last_matched_at: 2024-01-15
```

### Invoice Match Panel UI

The `InvoiceMatchPanel.tsx` component provides:

1. **Candidate Display**: Shows top candidates with scores and factors
2. **AI Reasoning**: Displays AI selection reasoning when applicable
3. **Manual Override**: Collapsible view of all draw lines for correction
4. **Correction Tracking**: Captures reason when user overrides a match

### Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HOME PAGE                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    [DASHBOARD] Button                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                     STAGING DASHBOARD                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ ││
│  │  │New Loan  │  │New Draw  │  │New Builder│  │  [HOME] Button   │ ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ ││
│  │                                                                  ││
│  │  ┌──────────────────────────────────────────────────────────┐   ││
│  │  │            DRAWS BY BUILDER                               │   ││
│  │  │  Builder A: [Draw 1] [Draw 2] [Stage All]                │   ││
│  │  │  Builder B: [Draw 1] [Stage All]                         │   ││
│  │  └──────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Details

### Budget Import Flow (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUDGET IMPORT SEQUENCE                             │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: USER UPLOADS SPREADSHEET
────────────────────────────────
User clicks "Upload Budget" and selects an Excel/CSV file.

Step 2: WEBAPP PARSES & DETECTS COLUMNS (Enhanced)
──────────────────────────────────────────────────
Client-side JavaScript (lib/spreadsheet.ts) uses xlsx-js-style to:
  1. Parse the file with cell styles (bold, borders)
  2. Analyze column data patterns (30 rows sample)
  3. Auto-detect Category column (leftmost text column with diverse values)
  4. Auto-detect Amount column (first column with 10+ real numbers)
  5. Display interactive preview with column highlighting

Step 3: SMART ROW BOUNDARY DETECTION (New)
──────────────────────────────────────────
The system analyzes each row using multiple signals:

  Classification Types:
  • HEADER (H) - Row contains header keywords, no amounts
  • TOTAL (T) - Row contains total keywords or sum matches
  • CLOSING (C) - Row contains closing cost keywords (weighted)
  • DATA - Normal budget line item
  • EMPTY - No category content

  Detection Signals:
  • Keyword analysis (headers, totals, closing costs)
  • Position-based scoring (early rows likely headers)
  • Excel formatting (bold text indicates headers/totals)
  • Amount sum matching (running total detection)
  • Gap detection (section breaks)

  Closing Cost Keyword Weights:
  • Strong (40pts): interest, realtor, closing cost(s)
  • Medium (25pts): finance, loan fee, points, origination
  • Weak (15pts): title, escrow, recording, appraisal fee

Step 4: USER CONFIRMS & ADJUSTS
───────────────────────────────
User can:
  • Click column headers to remap Category/Amount
  • Click rows to adjust selection boundaries
  • Drag handles to resize the selected range
  • Use keyboard shortcuts (↑↓ adjust start, Shift+↑↓ adjust end, R reset)
  • View classification badges (H/T/C) on each row

Step 5: WEBAPP SENDS TO N8N WEBHOOK
───────────────────────────────────
POST to: NEXT_PUBLIC_N8N_BUDGET_WEBHOOK

Payload format:
{
  "type": "budget",
  "projectId": "uuid-of-project",
  "columns": {
    "category": {
      "header": "Item",
      "values": ["Land", "Excavation", "Foundation", ...]  // Only selected rows
    },
    "amount": {
      "header": "Rough Budget",
      "values": [50000, 19246, 35000, ...]  // Only selected rows
    }
  },
  "metadata": {
    "fileName": "Builder Budget.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 75,
    "selectedRows": 45  // Count after filtering
  }
}

Step 6: N8N WORKFLOW PROCESSES DATA
───────────────────────────────────
The workflow:
  1. Receives pre-filtered data (headers/totals already excluded)
  2. Maps categories to NAHB codes using AI
  3. Inserts into Supabase budgets table

Step 7: RETURN TO LOAN PAGE
───────────────────────────
After successful import, user returns to the loan's Origination tab
to review and edit the budget in the BudgetEditor component.
```

### Draw Request Import Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DRAW REQUEST IMPORT SEQUENCE                         │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: USER UPLOADS DRAW SPREADSHEET
─────────────────────────────────────
User navigates to /draws/new (from Dashboard, Builder Page, or Active Loan tab).
Drag-drop or click to select Excel/CSV file with draw amounts.

Step 2: WEBAPP PARSES & USER MAPS COLUMNS
─────────────────────────────────────────
ImportPreview modal shows spreadsheet with column detection.
User maps Category and Amount columns, selects row range.

Step 3: FUZZY MATCHING TO BUDGETS (Client-Side)
───────────────────────────────────────────────
For each draw category, the system finds the best matching budget:

  Matching Strategy (in order of priority):
  1. Exact match (score = 1.0)
  2. Contains match - one string contains the other (score = 0.9)
  3. Tokenized word match - common words across strings (score = 0.65-0.9)
  4. Levenshtein distance - character-level similarity (score = 0.56-0.8)

  Threshold: score >= 0.6 required for auto-match
  
  Example Matches:
  • "Framing Labor" → "Framing - Labor" (tokenized match)
  • "Electrical" → "Electrical Rough" (contains match)
  • "Plumning" → "Plumbing" (Levenshtein: 1 edit)

Step 4: CREATE DRAW REQUEST & LINES IN SUPABASE
───────────────────────────────────────────────
The webapp directly creates:
  1. draw_request record with status='review'
  2. draw_request_lines with budget_id (if matched) or flags=['NO_BUDGET_MATCH']

Step 5: UPLOAD INVOICES TO STORAGE
──────────────────────────────────
Any attached invoices are uploaded to Supabase Storage:
  Path: invoices/{projectId}/{drawId}/{uuid}-{filename}

Step 6: OPTIONAL N8N AI PROCESSING
──────────────────────────────────
After lines are created, webhook sent to N8N with enriched payload:
{
  "drawRequestId": "uuid",
  "projectId": "uuid",
  "lines": [
    {
      "lineId": "uuid",
      "builderCategory": "Framing Labor",
      "nahbCategory": "Framing",
      "nahbSubcategory": "Framing Labor",
      "costCode": "0400",
      "budgetAmount": 50000,
      "remainingAmount": 32500,
      "amountRequested": 12500
    }
  ],
  "invoiceCount": 3
}

N8N can perform AI invoice matching and update flags.

Step 7: REDIRECT TO REVIEW PAGE
───────────────────────────────
User is redirected to /draws/{drawId} to review and approve.
```

### Draw Review Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DRAW REVIEW SEQUENCE                               │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: LOAD DRAW REQUEST
─────────────────────────
Page loads:
  • Draw request details and status
  • All draw_request_lines with linked budgets
  • Project budgets (for unmatched line assignment)
  • NAHB categories and subcategories (for cascading dropdowns)
  • Attached invoices

Step 2: DISPLAY UNMATCHED LINES (IF ANY)
────────────────────────────────────────
Lines without budget_id shown in warning section:
  • Original category name from spreadsheet
  • Amount requested
  • Cascading dropdown: [Category ▼] [Budget ▼]
  
Dropdown filtering:
  • Category dropdown shows only NAHB categories with available budgets
  • Budget dropdown filters by selected category
  • Both exclude budgets already assigned to other draw lines

Step 3: USER REVIEWS MATCHED LINES
──────────────────────────────────
Table displays for matched lines:
  | Builder Category | Budget | Remaining | Draw Request | Flags | Invoice |
  |------------------|--------|-----------|--------------|-------|---------|
  | Framing Labor    | $50,000| $32,500   | $12,500 (edit)| ⚠️    | 📎      |

Step 4: USER CAN EDIT/ATTACH
────────────────────────────
  • Click amount to edit
  • Click "Attach Invoices" to upload more
  • Click "Re-run Invoice Matching" to trigger N8N again

Step 5: APPROVE DRAW
────────────────────
User clicks "Stage for Funding" → status changes to 'staged'
Draw appears in builder's staging group on Dashboard.
```

---

## Column Detection Algorithm

The webapp uses multi-signal pattern analysis (`lib/spreadsheet.ts`):

### Category Detection
1. Scan columns left-to-right
2. For each column, analyze first 30 rows
3. Count text values vs. numeric values
4. First column where >40% are text AND has >3 unique values = Category
5. Prioritize if header contains keywords: "item", "category", "description"

### Amount Detection
1. After finding Category, scan remaining columns
2. Require column to have **10+ real numbers** (not just placeholders like "-")
3. Currency patterns: "$1,234.56", "1234", "(500)" for negatives
4. Prioritize columns with keywords: "budget", "amount", "cost", "total"
5. First matching column = Amount

### Row Boundary Detection (New)

Multi-signal analysis determines the data range:

**Signal Scoring:**
```typescript
// Header Detection
headerScore += 50  // if has header keyword
headerScore += 20  // if bold without amount
headerScore += 10  // if has category but no amount
headerScore += 25  // if in first 3 rows
headerScore += 15  // if follows gap

// Total Detection
totalScore += 40   // if has total keyword
totalScore += 20   // if bold
totalScore += 15   // if amount matches running sum

// Closing Cost Detection (weighted by keyword)
closingScore += keyword.weight  // 15/25/40 based on keyword
closingScore += 10              // if bold
```

**Classification Thresholds:**
- Header: headerScore >= 50
- Total: totalScore >= 45
- Closing: closingScore >= 35
- Data: has category but below thresholds

---

## Database Schema Overview

### Core Tables

```sql
-- Builders: Builder/contractor company information
builders (
  id                  UUID PRIMARY KEY,
  company_name        TEXT NOT NULL,
  borrower_name       TEXT,            -- Personal guarantor
  email               TEXT,
  phone               TEXT,
  address_street      TEXT,
  address_city        TEXT,
  address_state       TEXT,
  address_zip         TEXT,
  bank_name           TEXT,
  bank_routing_number TEXT,            -- Masked on display
  bank_account_number TEXT,            -- Masked on display
  bank_account_name   TEXT,
  notes               TEXT,
  created_at          TIMESTAMP,
  updated_at          TIMESTAMP
)

-- Lenders: Lending entities (for multi-lender support and future RLS)
lenders (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,    -- 'TD2', 'TENBROOK', 'TENNANT'
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP
)

-- Projects: Top-level entity for each construction loan
projects (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  project_code    TEXT,           -- Auto-generated: "DW-244"
  builder_id      UUID REFERENCES builders,  -- FK to builders table
  lender_id       UUID REFERENCES lenders,   -- FK to lenders table
  borrower_name   TEXT,           -- Auto-filled from builder profile
  subdivision_name TEXT,
  subdivision_abbrev TEXT,        -- e.g., "DW"
  lot_number      TEXT,           -- e.g., "244"
  loan_amount     DECIMAL,
  lifecycle_stage TEXT,           -- pending, active, historic
  stage_changed_at TIMESTAMP,
  square_footage  DECIMAL,
  appraised_value DECIMAL,
  payoff_date     DATE,           -- For historic loans
  payoff_amount   DECIMAL,        -- For historic loans
  -- Term Sheet Fields
  interest_rate_annual DECIMAL,   -- Default: 11%
  origination_fee_pct DECIMAL,    -- Default: 2%
  fee_escalation_pct DECIMAL,     -- Default: 0.25% per month after 6mo
  document_fee DECIMAL,           -- Default: $1000
  loan_term_months INTEGER,       -- Default: 12
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMP
)

-- Budgets: Line items within a project budget
budgets (
  id                  UUID PRIMARY KEY,
  project_id          UUID REFERENCES projects,
  subcategory_id      UUID REFERENCES nahb_subcategories,  -- NEW: FK to hierarchical table
  cost_code           TEXT,               -- NAHB code like "0210" (legacy text)
  category            TEXT NOT NULL,      -- Display category name
  nahb_category       TEXT,               -- Legacy: NAHB major category name
  nahb_subcategory    TEXT,               -- Legacy: NAHB subcategory name
  builder_category_raw TEXT,              -- Original from spreadsheet
  original_amount     DECIMAL,
  current_amount      DECIMAL,            -- After change orders
  spent_amount        DECIMAL DEFAULT 0,  -- Sum of funded draws
  remaining_amount    DECIMAL GENERATED,  -- current - spent
  ai_confidence       DECIMAL,            -- 0-1 confidence in mapping
  sort_order          INTEGER
)

-- NAHB Categories: Hierarchical parent categories (NEW)
nahb_categories (
  id          UUID PRIMARY KEY,
  code        VARCHAR(4) UNIQUE,  -- e.g., "0100", "0200"
  name        VARCHAR(100),       -- e.g., "General Conditions"
  sort_order  INTEGER,
  created_at  TIMESTAMP
)

-- NAHB Subcategories: Child categories with FK to parent (NEW)
nahb_subcategories (
  id          UUID PRIMARY KEY,
  category_id UUID REFERENCES nahb_categories,
  code        VARCHAR(4) UNIQUE,  -- e.g., "0110", "0120"
  name        VARCHAR(100),       -- e.g., "Project Management & Admin"
  sort_order  INTEGER,
  created_at  TIMESTAMP
)

-- Draw Requests: Header record for draw submissions
draw_requests (
  id              UUID PRIMARY KEY,
  project_id      UUID REFERENCES projects,
  draw_number     INTEGER,
  status          TEXT,             -- review, staged, pending_wire, funded
  total_amount    DECIMAL,
  request_date    DATE,
  funded_at       TIMESTAMP,        -- When wire was sent
  wire_batch_id   UUID REFERENCES wire_batches,  -- Groups draws per wire
  notes           TEXT,
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP
)

-- Draw Request Lines: Individual line items in a draw
draw_request_lines (
  id                    UUID PRIMARY KEY,
  draw_request_id       UUID REFERENCES draw_requests,
  budget_id             UUID REFERENCES budgets,    -- Link to budget line
  amount_requested      DECIMAL,
  amount_approved       DECIMAL,
  matched_invoice_amount DECIMAL,
  variance              DECIMAL,                    -- Difference from invoice
  invoice_file_url      TEXT,
  invoice_file_name     TEXT,
  invoice_vendor_name   TEXT,
  invoice_number        TEXT,
  confidence_score      DECIMAL,                    -- AI matching confidence
  flags                 TEXT,                       -- JSON array of flag codes
  notes                 TEXT,                       -- Original category if unmatched
  created_at            TIMESTAMP
)

-- Wire Batches: Groups draws for single wire per builder
wire_batches (
  id              UUID PRIMARY KEY,
  builder_id      UUID REFERENCES builders,
  status          TEXT,             -- pending, sent, confirmed
  total_amount    DECIMAL,
  wire_date       DATE,
  confirmation_number TEXT,
  notes           TEXT,
  created_at      TIMESTAMP
)

-- Invoices: Invoice files with extraction and matching data
invoices (
  id                    UUID PRIMARY KEY,
  draw_request_id       UUID REFERENCES draw_requests,
  draw_request_line_id  UUID REFERENCES draw_request_lines,
  file_url              TEXT,
  file_path             TEXT,
  file_name             TEXT,
  vendor_name           TEXT,
  invoice_number        TEXT,
  invoice_date          DATE,
  amount                DECIMAL,
  extraction_status     TEXT,       -- pending, processing, extracted, extraction_failed
  match_status          TEXT,       -- pending, auto_matched, ai_matched, needs_review, manually_matched, no_match
  extracted_data        JSONB,      -- Full extraction output from n8n
  matched_to_category   TEXT,       -- Budget category matched to
  matched_to_nahb_code  TEXT,       -- NAHB code matched to
  confidence_score      DECIMAL,    -- Match confidence 0-1
  candidate_count       INTEGER,    -- Number of candidates considered
  was_manually_corrected BOOLEAN DEFAULT FALSE,
  flags                 TEXT,       -- JSON array of flags
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
)

-- Invoice Match Decisions: Audit trail for all match decisions
invoice_match_decisions (
  id                    UUID PRIMARY KEY,
  invoice_id            UUID REFERENCES invoices,
  draw_request_line_id  UUID REFERENCES draw_request_lines,
  decision_type         TEXT,       -- auto_single, ai_selected, manual_override, manual_initial
  decision_source       TEXT,       -- system, ai, user
  candidates            JSONB,      -- All candidates considered with scores
  selected_draw_line_id UUID,
  selected_confidence   DECIMAL,
  selection_factors     JSONB,      -- Breakdown of scoring factors
  ai_reasoning          TEXT,       -- AI explanation when applicable
  previous_draw_line_id UUID,       -- For corrections
  correction_reason     TEXT,
  flags                 TEXT[],     -- Flags at decision time
  decided_at            TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
)

-- Invoice Match Training: Training data from approved draws
invoice_match_training (
  id                    UUID PRIMARY KEY,
  invoice_id            UUID REFERENCES invoices,
  draw_request_id       UUID REFERENCES draw_requests,
  approved_at           TIMESTAMP NOT NULL,

  -- Extraction data (for future matching)
  vendor_name_normalized TEXT NOT NULL,
  amount                DECIMAL NOT NULL,
  context               TEXT,           -- Semantic description
  keywords              TEXT[] NOT NULL,-- Normalized keywords
  trade                 TEXT,           -- Extracted trade signal
  work_type             TEXT,

  -- Match result (ground truth)
  budget_category       TEXT NOT NULL,
  nahb_category         TEXT,

  -- Match metadata
  match_method          TEXT,           -- auto, ai, manual
  confidence_at_match   DECIMAL,
  was_corrected         BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMP DEFAULT NOW()
)

-- Vendor Category Associations: Aggregated lookup for matching boost
vendor_category_associations (
  id                    UUID PRIMARY KEY,
  vendor_name_normalized TEXT NOT NULL,
  budget_category       TEXT NOT NULL,
  nahb_category         TEXT,
  match_count           INTEGER DEFAULT 1,
  total_amount          DECIMAL DEFAULT 0,
  last_matched_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(vendor_name_normalized, budget_category)
)

-- Documents: Supporting files for loans
documents (
  id            UUID PRIMARY KEY,
  project_id    UUID REFERENCES projects,
  draw_request_id UUID REFERENCES draw_requests,  -- Optional link to draw
  document_type TEXT,             -- floorplan, valuation, loan_agreement, insurance, other
  file_name     TEXT,
  file_path     TEXT,
  file_url      TEXT,
  file_size     INTEGER,
  uploaded_at   TIMESTAMP
)
```

### NAHB Category Hierarchy

The system uses 16 major categories with 118 subcategories, including "Other" catch-all subcategories for each category:

| Code | Category | Subcategories |
|------|----------|---------------|
| 0100 | General Conditions | 12 subcategories (0110-0199) |
| 0200 | Site Work | 15 subcategories (0210-0299) |
| 0300 | Concrete & Foundations | 8 subcategories (0310-0399) |
| 0400 | Framing | 7 subcategories (0410-0499) |
| 0500 | Roofing | 3 subcategories (0510-0599) |
| 0600 | Exterior Finishes | 9 subcategories (0610-0699) |
| 0700 | Windows & Doors | 7 subcategories (0710-0799) |
| 0800 | Plumbing | 7 subcategories (0810-0899) |
| 0900 | HVAC / Mechanical | 6 subcategories (0910-0999) |
| 1000 | Electrical & Low Voltage | 12 subcategories (1010-1099) |
| 1100 | Insulation & Drywall | 4 subcategories (1110-1199) |
| 1200 | Interior Finishes | 10 subcategories (1210-1299) |
| 1300 | Flooring | 7 subcategories (1310-1399) |
| 1400 | Countertops | 4 subcategories (1410-1499) |
| 1500 | Appliances | 2 subcategories (1510-1599) |
| 1600 | Landscaping & Exterior Amenities | 7 subcategories (1610-1699) |

### Document Types

| Type | Label | Purpose |
|------|-------|---------|
| `floorplan` | Floor Plans / Construction Drawings | Building plans |
| `valuation` | Valuation Document | Appraisal or BPO |
| `loan_agreement` | Loan Agreement | Signed loan docs |
| `insurance` | Insurance Certificate | Builder's risk policy |
| `other` | Other Document | Miscellaneous |

### Draw Line Flags

| Flag | Description | Auto-Generated |
|------|-------------|----------------|
| `NO_BUDGET_MATCH` | Category not found in project budget | Yes - during import |
| `OVER_BUDGET` | Request exceeds remaining budget | Yes - during import |
| `AMOUNT_MISMATCH` | Invoice total doesn't match requested (>10% variance) | Invoice matching |
| `NO_INVOICE` | No invoice attached to line with amount > 0 | Invoice matching |
| `LOW_CONFIDENCE` | Match confidence < 70% | Invoice matching |
| `DUPLICATE_INVOICE` | Invoice already used in previous draw | Invoice matching |
| `EXTRACTION_FAILED` | Invoice extraction failed in n8n | Invoice matching |
| `AI_SELECTED` | Match was selected by AI (not auto) | Invoice matching |
| `NEEDS_REVIEW` | AI flagged for human review | Invoice matching |

### Draw Request Status Values

| Status | Description | Next Status |
|--------|-------------|-------------|
| `review` | Draw uploaded, awaiting user review | staged |
| `staged` | User approved, waiting for other builder draws | pending_wire (via Fund All) or review (via Unstage) |
| `pending_wire` | All builder draws ready, sent to bookkeeper | funded |
| `funded` | Wire sent, budget spend recorded, draw locked | (terminal) |

### Budget Protection on Reimport

When budgets are reimported with "Replace existing budget" checked:

| Condition | Behavior |
|-----------|----------|
| Budget has funded draws | **Protected** - Cannot be deleted, warning shown to user |
| Budget has pending_wire draws | **Protected** - Cannot be deleted |
| Budget has only draft/review/staged draws | Deleted - Draw lines become "unmatched" (budget_id set to NULL) |
| Budget has no draws | Deleted |

**Foreign Key Constraint:** `draw_request_lines.budget_id` uses `ON DELETE SET NULL` to preserve draw lines when their budget is deleted. Protected budgets with funded draws are never deleted by application logic.

### Default Term Sheet

New loans default to standard terms:
- 11% annual interest rate
- 2% origination fee
- 0.25% monthly escalation after 6 months
- $1,000 document fee
- 12-month term

---

## Financial Calculations

TD3 provides comprehensive financial calculation capabilities across two modules:

### lib/calculations.ts

Core financial metrics for loan analysis:

#### Income Calculation
```typescript
calculateLoanIncome(project, draws): { fee: number, interest: number, total: number }
```
- **Origination Fee**: `loan_amount × origination_fee_pct`
- **Interest**: Sum of (draw_amount × daily_rate × days_outstanding) for each paid draw

#### IRR Calculation
```typescript
calculateIRR(draws, payoffAmount, payoffDate): number | null
```
- Uses Newton-Raphson method to solve for IRR
- Cash outflows: Each draw (negative, with date)
- Cash inflow: Payoff amount (positive, with payoff_date)
- Returns annualized IRR as decimal (0.15 = 15%)

#### LTV Color Coding
```typescript
getLTVColor(ltv: number): string
```
- **≤65%** → Green (low risk)
- **66-74%** → Yellow (moderate risk)
- **≥75%** → Red (high risk)

#### Amortization Schedule (Compound Interest)

```typescript
calculateAmortizationSchedule(drawLines, project, payoffDate?): AmortizationRow[]
```

Implements **compound interest** with accrual at two trigger points:
1. **Month-End**: Interest accrues on the last day of each calendar month
2. **Draw Funding**: Interest accrues when a new draw is funded

**Key Behavior:**
- Interest is calculated on **total balance** (principal + previously accrued interest)
- When interest accrues, it is **added to the balance** (compound)
- Days column shows days since last accrual event (not just previous row)
- First draw has 1 day of interest (funding day counts)

**AmortizationRow Fields:**
```typescript
type AmortizationRow = {
  date: Date
  drawNumber: number | null
  type: 'draw' | 'month_end' | 'payoff' | 'current'
  description: string
  drawAmount: number        // Draw amount only (0 for non-draw rows)
  days: number              // Days since LAST ACCRUAL event
  accruedInterest: number   // Interest accrued THIS period
  totalInterest: number     // Cumulative compound interest
  feeRate: number           // Current fee rate (with escalation)
  principal: number         // Sum of all draws to date
  totalBalance: number      // Principal + totalInterest (compound)
}
```

**Example Calculation (11% annual rate):**
| Date | Event | Draw | Days | Accrued Int | Total Int | Principal | Total Balance |
|------|-------|------|------|-------------|-----------|-----------|---------------|
| 12/4/2024 | Draw 1 | $8,575 | 1 | $2.58 | $2.58 | $8,575 | $8,577.58 |
| 12/31/2024 | Month End | — | 27 | $69.80 | $72.38 | $8,575 | $8,647.38 |
| 1/31/2025 | Month End | — | 31 | $80.79 | $153.17 | $8,575 | $8,728.17 |
| 2/10/2025 | Draw 2 | $40,327 | 10 | $38.46 | $191.63 | $48,902 | $49,094.08 |

**Interest Formula:** `totalBalance × (annualRate / 365) × days`

#### Payoff Breakdown
```typescript
calculatePayoffBreakdown(drawLines, project, terms, payoffDate): PayoffBreakdown
```
Returns detailed payoff statement:
- Principal balance
- Accrued interest (with days count)
- Per diem rate
- Finance fee (based on current fee rate)
- Document fee
- Total payoff amount

#### Payoff Projection
```typescript
projectPayoffAtDate(currentBreakdown, loanStartDate, terms, futureDate): PayoffBreakdown
generateProjectionData(drawLines, project, terms, currentDate, projectionMonths): ProjectionDataPoint[]
```
- Projects payoff at future dates
- Generates data for Nivo charts
- Includes fee rate progression, cumulative interest, and total payoff

---

### lib/loanTerms.ts

Centralized loan terms management with hierarchical resolution.

#### Term Resolution Hierarchy
```
1. Project-specific values (highest priority)
2. Lender overrides
3. System defaults (lowest priority)
```

#### Fee Calculation Formula

Implements the exact Excel formula for fee escalation:

```
=IF(month <= 6,
    0.02,                                    // Months 1-6: 2.00%
  IF(month <= 12,
    0.0225 + ((month - 7) * 0.0025),        // Months 7-12: 2.25% + 0.25%/month
    IF(month = 13,
      0.059,                                 // Month 13: 5.90% (extension jump)
      0.059 + ((month - 13) * 0.004)        // Months 14+: 5.90% + 0.40%/month
    )))
```

| Month | Fee Rate | Type |
|-------|----------|------|
| 1-6 | 2.00% | Base |
| 7 | 2.25% | Escalation |
| 8 | 2.50% | Escalation |
| 9 | 2.75% | Escalation |
| 10 | 3.00% | Escalation |
| 11 | 3.25% | Escalation |
| 12 | 3.50% | Escalation |
| 13 | 5.90% | Extension (2% jump) |
| 14 | 6.30% | Post-extension |
| 15 | 6.70% | Post-extension |
| ... | +0.40%/mo | Post-extension |

#### Key Functions

```typescript
// Calculate fee rate at specific month
calculateFeeRateAtMonth(month: number, terms: LoanTerms): number

// Get month number from loan start date
getMonthNumber(loanStartDate: Date, targetDate: Date): number

// Get next fee increase date and rates
getNextFeeIncreaseDate(loanStartDate, currentDate, terms): { date, newRate, currentRate }

// Generate complete fee schedule
generateFeeSchedule(loanStartDate, throughMonth, terms): FeeScheduleEntry[]

// Maturity urgency indicators
getUrgencyLevel(daysToMaturity: number): 'critical' | 'urgent' | 'warning' | 'caution' | 'normal'
getUrgencyColor(level: UrgencyLevel): string
```

#### Default Term Sheet

```typescript
DEFAULT_TERM_SHEET = {
  interest_rate_annual: 0.11,           // 11%
  origination_fee_pct: 0.02,            // 2%
  fee_escalation_pct: 0.0025,           // +0.25% per month after 6 months
  fee_escalation_after_months: 6,
  fee_rate_at_month_7: 0.0225,          // 2.25%
  extension_fee_month: 13,              // Month 13
  extension_fee_rate: 0.059,            // 5.90%
  post_extension_escalation: 0.004,     // +0.40% per month after 13 months
  document_fee: 1000,                   // $1,000
  loan_term_months: 12,                 // 12 months
}
```

---

### lib/anomalyDetection.ts

Automated anomaly detection for budget and draw analysis:

```typescript
detectAnomalies(budgets, drawLines, project): Anomaly[]
```

**Anomaly Types:**
| Type | Description | Severity |
|------|-------------|----------|
| `SPENDING_SPIKE` | Single draw > 50% of category budget | warning |
| `VELOCITY_HIGH` | Spending faster than typical pace | warning |
| `OVER_BUDGET` | Category exceeded budget | critical |
| `LARGE_VARIANCE` | Draw variance from invoice > 10% | error |
| `DORMANT_CATEGORY` | Budget allocated but no draws in 90+ days | info |

---

## UI Components

### Key Files

| Component | Path | Purpose |
|-----------|------|---------|
| `StageSelector` | `app/components/ui/StageSelector.tsx` | iOS-style lifecycle filter |
| `StageStatsBar` | `app/components/ui/StageStatsBar.tsx` | Stage-specific metrics with visual elements |
| `FilterSidebar` | `app/components/ui/FilterSidebar.tsx` | Toggle-based filter (Builder/Subdivision/Lender) |
| `ProjectTile` | `app/components/ui/ProjectTile.tsx` | Loan card with stage-specific display |
| `LoanPageTabs` | `app/components/projects/LoanPageTabs.tsx` | Tabbed loan interface |
| `OriginationTab` | `app/components/projects/OriginationTab.tsx` | Loan setup with lifecycle controls |
| `LoanStatusTab` | `app/components/projects/LoanStatusTab.tsx` | Active loan status with financial reports |
| `BudgetEditor` | `app/components/projects/BudgetEditor.tsx` | Inline budget editing with cascading dropdowns |
| `DocumentUploadSection` | `app/components/projects/DocumentUploadSection.tsx` | Document management |
| `SpreadsheetViewer` | `app/components/ui/SpreadsheetViewer.tsx` | Interactive import preview |
| `ImportPreview` | `app/components/import/ImportPreview.tsx` | Import modal with fuzzy matching |
| `BuilderInfoCard` | `app/components/builders/BuilderInfoCard.tsx` | Compact builder info with edit mode |
| `BuilderLoanGrid` | `app/components/builders/BuilderLoanGrid.tsx` | Builder's loan portfolio display |

### Financial Report Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ReportToggle` | `app/components/ui/ReportToggle.tsx` | 3-way toggle (Budget/Amortization/Payoff) |
| `ViewModeSelector` | `app/components/ui/ViewModeSelector.tsx` | Table/Cards/Chart view mode selector |
| `ReportDetailPanel` | `app/components/ui/ReportDetailPanel.tsx` | Slide-out panel for drill-down details |
| `ProgressBudgetReport` | `app/components/projects/ProgressBudgetReport.tsx` | Multi-view budget analysis |
| `AmortizationTable` | `app/components/projects/AmortizationTable.tsx` | Draw-by-draw interest schedule |
| `PayoffReport` | `app/components/projects/PayoffReport.tsx` | Three-view payoff system |
| `PolymorphicLoanDetails` | `app/components/projects/PolymorphicLoanDetails.tsx` | Context-aware stats tile |
| `BudgetSparkline` | `app/components/ui/BudgetSparkline.tsx` | Mini trend charts for budget lines |

### Draw System Pages

| Page | Path | Purpose |
|------|------|---------|
| `DrawRequestPage` | `app/draws/new/page.tsx` | New draw upload with cascading builder→project selection |
| `DrawDetailPage` | `app/draws/[id]/page.tsx` | Draw review with cascading category assignment |
| `StagingPage` | `app/staging/page.tsx` | Central dashboard for draw management |

---

## Enhanced Financial Reports

TD3 includes three comprehensive financial report types, accessible via a 3-way toggle on the loan status page. Each report offers Table and Chart views (simplified from previous 3-view system).

### Report Toggle System

```
┌─────────────────────────────────────────────────────────────┐
│  [  Budget  ] [  Amortization  ] [  Payoff  ]               │
│       ▼                                                      │
│  Three independent reports with polymorphic stats tile       │
│  Each with [Table] [Chart] view toggle                       │
└─────────────────────────────────────────────────────────────┘
```

### 1. Progress Budget Report

Multi-view budget analysis with intelligent features:

**Table View:**
- Grouped rows by NAHB major category (collapsible)
- Sortable columns (Code, Category, Budget, Drawn, Remaining, % Complete)
- Sticky header and footer with totals
- Smart condensing (zero-value rows auto-collapse)
- Sparkline trend charts per budget line
- Click-to-drill-down for detailed view

**Chart View (3-Chart Dashboard):**
- **Sankey Diagram**: Budget flow from categories to draws, ordered by construction sequence (cost code prefix) with chronological draw ordering
- **Category Utilization**: Horizontal bar chart with budget limit markers showing remaining vs spent per category
- **Spending Velocity**: Line chart showing cumulative spending over time with trend indicators
- Each chart includes an info tooltip explaining what it shows

### 2. Amortization Table

**Compound interest** tracking with monthly and draw-event accrual:

**Table View:**
- Chronological accrual event listing with:
  - Date and description
  - Draw amount (0 for month-end rows)
  - Days since last accrual
  - Accrued interest (this period)
  - Total interest (cumulative compound)
  - Principal (sum of draws)
  - Total balance (principal + interest)
- Row types distinguished visually
- Summary header with key metrics

**Chart View (3-Chart Dashboard):**
- **Balance Growth**: Line chart showing principal, total interest, and total balance over time, including document and finance fees
- **Draw Timeline**: Bar chart showing draw amounts by date
- **Interest Analysis**: Donut chart breaking down Principal, Interest, Finance Fee, and Document Fee components
- Each chart includes an info tooltip explaining what it shows

### 3. Payoff Report

Interactive payoff system with credits and title company integration:

**Table View (Payoff Statement):**
- Professional payoff letter format
- Principal balance
- Accrued interest (with days)
- Finance fee (with current rate)
- Document fee
- **Credits section**: Manage adjustments that reduce payoff
- Total payoff amount
- Good-through date with per diem
- "Complete Loan" functionality for historic transition
- **Title Company Report Generator**: Generate professional payoff letters

**Chart View (3-Chart Dashboard):**
- **Fee Escalation**: Line chart showing fee rate progression over loan term
- **Payoff Projection**: Area chart showing principal, interest, and total payoff over 18 months
- **What-If Comparison**: Side-by-side comparison of today's payoff vs custom future date with adjustable date picker
- Each chart includes an info tooltip explaining what it shows

### Polymorphic Loan Details

The stats tile above reports is now an expandable accordion that adapts based on active report:

| Report | Collapsed Stats | Expanded Content |
|--------|-----------------|------------------|
| **Budget** | Budget Total, Total Spent, Remaining, % Complete | Anomaly details, category breakdown |
| **Amortization** | Principal, Total Interest, Total Balance, Per Diem | Fee rate schedule, days outstanding |
| **Payoff** | Estimated Payoff, Principal, Accrued Interest | Credits list, fee breakdown, days to maturity |

The tile can be expanded/collapsed with a click, providing progressive disclosure of detailed information.

### View Mode Persistence

User's preferred view mode (Table/Cards/Chart) is persisted to localStorage per report type, providing consistent experience across sessions.

### Builder Page Features

The Builder Page (`/builders/[id]`) provides a centralized view for managing builder relationships:

- **Header**: Company name, borrower name, total loans count, active loans count
- **BuilderInfoCard**: Compact 4-column layout with:
  - Company & Contact info (email/phone as clickable links)
  - Mailing address
  - Banking information (routing/account numbers masked)
  - Collapsible notes section
- **BuilderLoanGrid**: Stage-filterable loan portfolio with StageStatsBar

### FilterSidebar Features

Toggle-based 3-way filter with persistent selections:

- **3-Way Toggle**: Builder | Subdivision | Lender (all visible at once)
- **Dynamic Options**: Shows options for currently selected category
- **Persistent Selections**: Selections persist across category switches
- **Active Filter Chips**: Dismissible chips at top showing all active filters
- **Dot Indicators**: Visual dots on toggle buttons when category has active filters
- **Clear Controls**: Clear individual categories or all filters at once

### StageStatsBar Features

Stage-specific metrics with visual elements:

| Stage | Metrics | Visual Element |
|-------|---------|----------------|
| **Pending** | Pipeline Value, Avg LTV, Count | LTV distribution bar (green ≤65%, yellow 66-74%, red ≥75%) |
| **Active** | Total Committed, Total Drawn, Count | Animated utilization progress bar |
| **Historic** | Total Funded, Total Income, Avg IRR | IRR with color coding |

### SpreadsheetViewer Features

- **Color-Coded Columns**: Blue = Category, Red = Amount
- **Row Range Selection**: Yellow highlight for selected rows
- **Classification Badges**: H (Header), T (Total), C (Closing)
- **Drag Handles**: Resize selection by dragging ≡ icons
- **Click-to-Toggle**: Click rows to move nearest boundary (intelligent proximity)
- **Keyboard Shortcuts**: ↑↓ (start), Shift+↑↓ (end), R (reset)
- **Excel Formatting**: Preserves bold text and borders from original file
- **Shortcut Legend**: `?` icon with hover/click tooltip for keyboard shortcuts

### BudgetEditor Features

- **Cascading Dropdowns**: Category dropdown filters Subcategory options
- **Auto-Fill**: Selecting Subcategory auto-fills Code and Category
- **Clear All Button**: Delete entire budget for a project (with confirmation)
- **Inline Editing**: Edit amounts, builder categories, and standardized codes
- **AI Confidence Indicator**: Visual dots showing mapping confidence (green/yellow/red)
- **Auto-Open Subcategory**: When category changes, subcategory dropdown auto-opens

### ImportPreview Features

- **Auto-Delete Checkbox**: Option to replace existing budget on upload
- **Protected Budget Warning**: Shows which categories have funded draws and cannot be deleted
- **Smart Budget Merge**: Duplicate categories are merged into protected budgets instead of creating duplicates
- **Existing Budget Detection**: Shows count of existing items when project selected
- **Project Selection**: Cascading builder → project dropdowns for draw imports
- **Sheet Selection**: Choose which Excel sheet to import from multi-sheet workbooks
- **Real-time Stats**: Shows row count and total amount before submission
- **Auto-Deselect Columns**: Selecting a new category/amount column auto-deselects previous
- **Invoice Upload**: Drag-drop invoice files with thumbnail preview (draw imports)
- **Processing Countdown Timer**: Adaptive countdown based on category count with animated task messages
- **N8N Response Validation**: Verifies import success before closing modal and navigating
- **$0/Blank Amount Support**: Budget imports include categories with $0 or blank amounts (placeholder line items)

### Fuzzy Matching Algorithm

The `ImportPreview` component uses multi-strategy fuzzy matching for draw-to-budget category matching:

```typescript
function fuzzyMatchScore(input: string, target: string): number
```

**Matching Strategies (in priority order):**

| Strategy | Score | Example |
|----------|-------|---------|
| Exact match | 1.0 | "Framing" = "Framing" |
| Contains match | 0.9 | "Electrical" ⊆ "Electrical Rough" |
| Tokenized words | 0.65-0.9 | "Framing Labor" ≈ "Framing - Labor" |
| Levenshtein | 0.56-0.8 | "Plumning" ≈ "Plumbing" (1 edit) |

**Threshold**: 0.6 minimum score required for auto-match

**Implementation:**
- `levenshteinDistance()` - Edit distance calculation
- `fuzzyMatchScore()` - Multi-strategy scoring
- `findBestBudgetMatch()` - Finds best budget above threshold

### Draw Review Page Features

- **Unmatched Lines Section**: Warning banner with cascading dropdowns
- **Cascading Category Assignment**:
  - First dropdown: NAHB Categories (shows ALL categories, not just those with existing budgets)
  - Second dropdown: If budgets exist → select from available budgets; If no budgets → select subcategory to create new
- **Create New Budget Line**: When no budgets exist for a category:
  - Select NAHB subcategory from dropdown
  - Click "Create New" button to create budget line
  - New budget is created with draw amount as initial budget
  - Draw line is automatically assigned to new budget
- **Inline Amount Editing**: Click to edit draw amounts
- **Invoice Management**: Compact "Attach Invoices" button, "Re-run Invoice Matching"
- **Status-Based Controls**: Stage for Funding, Reject buttons based on status
- **Flag Display**: Visual indicators for OVER_BUDGET, NO_INVOICE, LOW_CONFIDENCE, etc.

---

## Webhook Payload Reference

### Budget Import Webhook

```typescript
type BudgetImportPayload = {
  type: 'budget'
  projectId: string              // UUID of target project
  columns: {
    category: {
      header: string             // Original column header
      values: string[]           // Selected row values only
    }
    amount: {
      header: string             // Original column header
      values: (number | null)[]  // Selected row values only
    }
  }
  metadata: {
    fileName: string             // Original file name
    sheetName: string            // Excel sheet name
    totalRows: number            // Total rows in file
    selectedRows: number         // Rows after filtering
  }
}
```

### Draw Import Webhook (N8N Processing)

The webapp creates draw_request and draw_request_lines directly in Supabase, then optionally calls N8N for AI invoice matching with an enriched payload:

```typescript
type DrawProcessingPayload = {
  drawRequestId: string          // UUID of created draw request
  projectId: string              // UUID of target project
  lines: Array<{
    lineId: string               // UUID of draw_request_line
    builderCategory: string      // Original category from spreadsheet
    nahbCategory: string | null  // Matched NAHB category
    nahbSubcategory: string | null
    costCode: string | null      // NAHB cost code
    budgetAmount: number         // Total budget for this category
    remainingAmount: number      // Budget remaining before this draw
    amountRequested: number      // Amount requested in this draw
  }>
  invoiceCount: number           // Number of uploaded invoices
}
```

N8N can then:
1. Match invoices to budget categories using AI
2. Update draw_request_lines with invoice details
3. Generate additional flags (AMOUNT_MISMATCH, DUPLICATE_INVOICE, etc.)

### Legacy Draw Import Webhook (Direct Column Data)

```typescript
type DrawImportPayload = {
  type: 'draw'
  projectId: string              // UUID of target project
  drawNumber: number             // e.g., 1, 2, 3
  columns: {
    category: {
      header: string
      values: string[]
    }
    amount: {
      header: string             // Usually a date like "17-Jul"
      values: (number | null)[]
    }
  }
  metadata: {
    fileName: string
    sheetName: string
    totalRows: number
    selectedRows: number
  }
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env.local (local development)
# Vercel Environment Variables (production)

# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n Webhook URLs (self-hosted instance)
NEXT_PUBLIC_N8N_BUDGET_WEBHOOK=https://n8n.srv1208741.hstgr.cloud/webhook/budget-import
NEXT_PUBLIC_N8N_DRAW_WEBHOOK=https://n8n.srv1208741.hstgr.cloud/webhook/td3-draw-process
```

### N8N Self-Hosted Instance

TD3 uses a self-hosted n8n instance at `https://n8n.srv1208741.hstgr.cloud/` for workflow automation. This replaces the previous n8n Cloud instance and removes execution limits.

---

## File Reference

### Core Libraries

| File | Purpose |
|------|---------|
| `lib/spreadsheet.ts` | Excel parsing, column/row detection, formatting extraction |
| `lib/supabase.ts` | Supabase client initialization |
| `lib/projectCode.ts` | Project code generation (e.g., "DW-244") |
| `lib/calculations.ts` | Financial calculations (income, IRR, LTV, amortization, payoff) |
| `lib/loanTerms.ts` | Loan term management, fee calculation, urgency levels |
| `lib/anomalyDetection.ts` | Budget and draw anomaly detection |
| `lib/validations.ts` | Draw request validation and flag generation |
| `lib/polymorphic.ts` | Polymorphic UI utilities |
| `lib/invoiceMatching.ts` | Deterministic invoice-to-budget-line candidate generation and scoring |
| `lib/invoiceAISelection.ts` | Narrow AI selection from pre-scored candidates |
| `lib/invoiceLearning.ts` | Training data capture and vendor association management |

### UI Components

| File | Purpose |
|------|---------|
| `app/components/import/ImportPreview.tsx` | Import modal with fuzzy matching for draws/budgets |
| `app/components/ui/SpreadsheetViewer.tsx` | Interactive spreadsheet table with row analysis |
| `app/components/ui/FilterSidebar.tsx` | Toggle-based filter component |
| `app/components/ui/StageStatsBar.tsx` | Stage-specific metrics with visual elements |
| `app/components/ui/ProjectTile.tsx` | Loan card with income/IRR for historic |
| `app/components/ui/ReportToggle.tsx` | 3-way report type selector |
| `app/components/ui/ViewModeSelector.tsx` | Table/Cards/Chart view mode toggle |
| `app/components/ui/ReportDetailPanel.tsx` | Slide-out panel for drill-down details |
| `app/components/ui/BudgetSparkline.tsx` | Mini trend charts for budget lines |

### Project Components

| File | Purpose |
|------|---------|
| `app/components/builders/BuilderInfoCard.tsx` | Compact builder info with edit mode |
| `app/components/builders/BuilderLoanGrid.tsx` | Builder's loan portfolio |
| `app/components/projects/OriginationTab.tsx` | Loan origination with lifecycle transition controls |
| `app/components/projects/LoanStatusTab.tsx` | Active loan status with financial reports |
| `app/components/projects/BudgetEditor.tsx` | Editable budget with cascading dropdowns |
| `app/components/projects/ProgressBudgetReport.tsx` | Multi-view budget analysis with Sankey diagram |
| `app/components/projects/AmortizationTable.tsx` | Draw-by-draw interest schedule |
| `app/components/projects/PayoffReport.tsx` | Three-view interactive payoff system |
| `app/components/projects/PolymorphicLoanDetails.tsx` | Context-aware stats tile |

### Draw Components

| File | Purpose |
|------|---------|
| `app/components/draws/InvoiceMatchPanel.tsx` | Invoice-to-line matching with candidates, AI reasoning, and manual override |

### Pages

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home page with Dashboard navigation |
| `app/staging/page.tsx` | Staging dashboard for draw management |
| `app/draws/new/page.tsx` | New draw request with cascading builder→project |
| `app/draws/[id]/page.tsx` | Draw review with cascading category assignment |
| `app/builders/[id]/page.tsx` | Builder detail page with draw button |
| `app/projects/[id]/page.tsx` | Loan detail page with draw request button |
| `app/projects/new/page.tsx` | New loan creation |

### Types

| File | Purpose |
|------|---------|
| `types/database.ts` | Supabase types + DrawLineFlag + DrawStatus + DEFAULT_TERM_SHEET |

---

## Common Issues & Solutions

### Column Detection Misses Budget Column
- **Cause:** Column has < 10 real numbers
- **Solution:** User can manually click column header to map it

### Row Detection Includes Headers
- **Cause:** Header keywords not matching or low score
- **Solution:** Click rows to manually adjust boundaries, or drag handles

### "Title Fees" Flagged as Closing Cost
- **Cause:** "title" keyword triggered closing cost detection
- **Solution:** Fixed with weighted keyword scoring - "title" now only adds 15 points (threshold is 35)

### Empty Categories Being Imported
- **Cause:** Row detection included empty rows
- **Solution:** Row boundary detection now excludes rows without category content

### Drag Handles Not Working
- **Cause:** React state closure issues
- **Solution:** Fixed with proper ref handling in event listeners

### Duplicate Budget Items on Re-Import
- **Cause:** Uploading new budget to project with existing items
- **Solution:** Use "Replace existing budget" checkbox in ImportPreview, or "Clear All" button in BudgetEditor before importing

### Category Dropdown Not Showing Correct Value After Import
- **Cause:** AI returned category with code prefix (e.g., "0800 – Plumbing") instead of just name
- **Solution:** Updated AI prompt to return only names without codes; BudgetEditor uses ID-based matching

### Draw Lines Missing After Budget Reimport
- **Cause:** Budget deletion cascaded to draw_request_lines
- **Solution:** FK constraint changed to `ON DELETE SET NULL`. Budgets with funded draws are now protected from deletion. Non-funded draw lines become "unmatched" rather than deleted.

### Budget Import Shows "Invalid Response from N8N"
- **Cause:** N8N workflow error (often model incompatibility)
- **Solution:** Check N8N execution logs. Ensure OpenAI node uses `gpt-4o` model (not gpt-5.x which doesn't support temperature parameter)

### Budget Import Countdown Shows NaN
- **Cause:** Zero valid categories leading to division by zero
- **Solution:** Minimum countdown is 10 seconds; safeguards prevent NaN in progress calculations

### $0 or Blank Budget Categories Not Importing
- **Cause:** Regression in commit 371a984 that added `amount > 0` filtering
- **Solution:** Fixed in `lib/spreadsheet.ts` - budget imports now only require valid category names; amounts can be $0, blank, or null. Draw imports still require positive amounts.

### Unmatched Draw Categories Can't Be Assigned
- **Cause:** No existing budget line for the category
- **Solution:** Draw review page now allows creating new budget lines from unmatched categories using cascading NAHB Category → Subcategory dropdowns

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Development Roadmap](ROADMAP.md) | Launch timeline, planned features, team requirements, and cost estimates |
| [Design Language](DESIGN_LANGUAGE.md) | UI/UX standards, color system, and component patterns |
| [N8N Agent Prompt](N8N_AGENT_PROMPT.md) | Instructions for building and modifying n8n workflows |

## Planned Enhancements

See the [Development Roadmap](ROADMAP.md) for detailed timelines and specifications on upcoming features:

- **Authentication & Permissions** — Role-based access control with Supabase Auth
- **DocuSign Integration** — Automated document signing and status tracking
- **Builder/Lender Portals** — External access for clients and lending partners
- **RAG Portfolio Chatbot** — Natural language queries against loan data
- **Mobile Inspection App** — Field inspections with photo documentation