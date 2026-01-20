# TD3 Authentication System

Complete documentation for the TD3 authentication system, including architecture decisions, troubleshooting, and common issues.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why OTP Codes Instead of Magic Links](#why-otp-codes-instead-of-magic-links)
3. [Authentication Flow](#authentication-flow)
4. [Key Files Reference](#key-files-reference)
5. [Supabase Configuration](#supabase-configuration)
6. [Email Templates](#email-templates)
7. [UI Permission Gating](#ui-permission-gating)
8. [Account Settings & Activity Tracking](#account-settings--activity-tracking)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
10. [Emergency Procedures](#emergency-procedures)
11. [Development Guidelines](#development-guidelines)

---

## Architecture Overview

TD3 uses **Supabase Auth** with a **passwordless OTP code** authentication flow. Key architectural decisions:

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Auth Method | OTP Codes (8-digit) | Email security scanners can't consume codes |
| Session Storage | Browser localStorage | Supabase SSR client handles automatically |
| Route Protection | Next.js Middleware | Server-side redirect before page loads |
| Permissions | Stackable DB-level | RLS policies + UI gates for defense-in-depth |
| Allowlist | Pre-approved emails only | Prevents unauthorized signups |

### Auth Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  Login Page          │  AuthContext        │  PermissionGate    │
│  (OTP code entry)    │  (global state)     │  (UI access)       │
├─────────────────────────────────────────────────────────────────┤
│                     Next.js Middleware                           │
│              (route protection, session refresh)                 │
├─────────────────────────────────────────────────────────────────┤
│                      Supabase Auth                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Sessions   │  │   Profiles   │  │  Permissions │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                    Row Level Security                            │
│           (has_permission() function in policies)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why OTP Codes Instead of Magic Links

### The Problem with Magic Links

Magic links (clickable email links) are vulnerable to **email security scanners**:

1. **Microsoft SafeLinks** (Office 365, Outlook)
2. **Google Safe Browsing** (Gmail)
3. **Proofpoint URL Defense**
4. **Mimecast**
5. **Barracuda**

These services **pre-click links** in emails to check for malware. When they click a magic link:
- The one-time token is **consumed** by the scanner
- The real user clicks the link and gets: `"Email link is invalid or has expired"`

### Evidence from TD3 Debugging

Supabase auth logs showed:
```
Login consumed by IP: 152.39.205.210  (Microsoft SafeLinks)
User's actual IP: 75.164.180.179
Error: "otp_expired" - Email link is invalid or has expired
```

### The Solution: OTP Codes

OTP codes are immune to email scanners because:
- Scanners can **read** the code but can't **enter** it
- Only the real user typing the code can authenticate
- No network request triggered by scanner

### Trade-offs

| Aspect | Magic Links | OTP Codes |
|--------|-------------|-----------|
| User Experience | Click link | Type 8 digits |
| Scanner Resistant | No | Yes |
| Works Offline | No | No |
| Expiration | 1 hour | 5 minutes |
| Security | Lower (prefetch attacks) | Higher |

---

## Authentication Flow

### Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER JOURNEY                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User visits protected route (e.g., /)                        │
│     │                                                             │
│     ▼                                                             │
│  2. Middleware checks session                                     │
│     │                                                             │
│     ├── Has valid session? ──────────────────┐                   │
│     │   YES                                   │                   │
│     │                                         ▼                   │
│     │                              Allow access to route          │
│     │                                                             │
│     └── NO session ──────────────────────────┐                   │
│                                               │                   │
│                                               ▼                   │
│  3. Redirect to /login?redirect=/original-path                   │
│     │                                                             │
│     ▼                                                             │
│  4. User enters email                                             │
│     │                                                             │
│     ▼                                                             │
│  5. Check allowlist (is_allowlisted RPC)                         │
│     │                                                             │
│     ├── Not allowed? ────────────────────────┐                   │
│     │                                         ▼                   │
│     │                           Show "not authorized" error       │
│     │                                                             │
│     └── Allowed ─────────────────────────────┐                   │
│                                               │                   │
│                                               ▼                   │
│  6. Call signInWithOtp({ email }) - NO emailRedirectTo!          │
│     │                                                             │
│     ▼                                                             │
│  7. Supabase sends email with 8-digit code                       │
│     │                                                             │
│     ▼                                                             │
│  8. User receives email, reads code                              │
│     │                                                             │
│     ▼                                                             │
│  9. User types code in 8-digit input UI                          │
│     │                                                             │
│     ▼                                                             │
│  10. Call verifyOtp({ email, token, type: 'email' })             │
│      │                                                            │
│      ├── Invalid/expired? ───────────────────┐                   │
│      │                                        ▼                   │
│      │                           Show error, clear inputs         │
│      │                                                            │
│      └── Success ────────────────────────────┐                   │
│                                               │                   │
│                                               ▼                   │
│  11. Session created, redirect via window.location.href          │
│      │                                                            │
│      ▼                                                            │
│  12. First login? Show FirstLoginModal for profile               │
│      │                                                            │
│      ▼                                                            │
│  13. Login activity logged (device, browser, IP, geolocation)    │
│      │                                                            │
│      ▼                                                            │
│  14. User is authenticated and on original destination           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Code Flow

**Step 1: Send OTP Code**
```typescript
// app/(auth)/login/page.tsx
const { error } = await supabase.auth.signInWithOtp({
  email: trimmedEmail,
  // NO emailRedirectTo - this sends code instead of link
})
```

**Step 2: Verify OTP Code**
```typescript
// app/(auth)/login/page.tsx
const { data, error } = await supabase.auth.verifyOtp({
  email: email.trim().toLowerCase(),
  token: verifyCode,  // The 8-digit code
  type: 'email',
})
```

**Step 3: Redirect (using window.location for reliability)**
```typescript
if (data.session || data.user) {
  window.location.href = redirectTo
}
```

---

## Key Files Reference

### Authentication Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/(auth)/login/page.tsx` | Login UI with OTP code entry | `handleSubmit`, `handleVerifyOtp`, `handleOtpChange` |
| `app/(auth)/layout.tsx` | Centered layout for auth pages | Layout wrapper |
| `app/auth/callback/page.tsx` | Legacy callback handler (PKCE) | `exchangeCodeForSession` |
| `app/context/AuthContext.tsx` | Global auth state provider | `useAuth`, `AuthProvider` |
| `app/components/auth/FirstLoginModal.tsx` | Profile completion modal | Profile form on first login |
| `app/components/auth/PermissionGate.tsx` | Conditional render by permission | `PermissionGate`, `useHasPermission` |
| `app/account/page.tsx` | Account settings with tabs | Profile, Preferences, Activity |
| `app/api/activity/login/route.ts` | Login activity logging API | IP extraction, geolocation |
| `middleware.ts` | Route protection | Session check, redirects |

### Supabase Client Files

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Client factory, types, permission constants |

### Database Files

| File | Purpose |
|------|---------|
| `supabase/004_auth.sql` | Auth schema, RLS policies, helper functions |
| `supabase/005_user_preferences.sql` | User preferences JSONB column |
| `supabase/006_user_activity.sql` | Activity tracking table with RLS |

---

## Supabase Configuration

### Dashboard Settings

**Authentication → URL Configuration:**
| Setting | Value |
|---------|-------|
| Site URL | `https://td3.tennantdevelopments.com` |
| Redirect URLs | `https://td3.tennantdevelopments.com/**`, `http://localhost:3000/**` |

**Authentication → Providers → Email:**
| Setting | Value |
|---------|-------|
| Enable Email | ON |
| Confirm Email | OFF |
| Secure email change | ON |

**SMTP Configuration (for Resend):**
| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Sender email | `bot@mail.td3.tennantdevelopments.com` |
| Sender name | `TD3` |
| Username | `resend` |
| Password | Resend API key |

---

## Email Templates

### Magic Link Template (OTP Code)

Go to **Authentication → Email Templates → Magic Link**

**Subject:** `Your TD3 verification code`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to TD3</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 40px 40px 24px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #950606; border-radius: 8px; padding: 12px 20px;">
                    <span style="font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">TD3</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; color: #111827;">
                Your verification code
              </h1>
              <p style="margin: 0; font-size: 15px; line-height: 24px; color: #6B7280;">
                Enter this code to sign in to your TD3 account. This code will expire in 5 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #F3F4F6; border-radius: 8px; padding: 20px 40px;">
                    <span style="font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 8px; font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;">{{ .Token }}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #9CA3AF;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px;">
          <tr>
            <td align="center" style="padding: 24px 20px;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                TD3.TennantDevelopments.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Key variable:** `{{ .Token }}` - The OTP code (8 digits)

### Confirm Signup Template

Same structure, update title to "Welcome to TD3" and adjust messaging.

---

## UI Permission Gating

TD3 implements **defense-in-depth** for permissions: RLS policies protect the database, while UI permission gates provide a better user experience by hiding actions users can't perform.

### Permission Types

| Permission | Label | Controls |
|------------|-------|----------|
| `processor` | Loan Processor | Create/edit loans, draws, builders, budgets |
| `fund_draws` | Fund Draws | Mark draws as funded, confirm wire transfers |
| `approve_payoffs` | Approve Payoffs | Approve payoffs before sending to title |
| `users.manage` | Manage Users | Access to admin panel, manage allowlist |

### Page-Level Protection

These pages check for `processor` permission and redirect to `/` with an error toast if missing:

| Page | File | Permission Required |
|------|------|---------------------|
| New Loan | `app/projects/new/page.tsx` | `processor` |
| New Draw | `app/draws/new/page.tsx` | `processor` |
| New Builder | `app/builders/new/page.tsx` | `processor` |
| New Budget | `app/budgets/new/page.tsx` | `processor` |
| Edit Project | `app/projects/[id]/edit/page.tsx` | `processor` |
| User Management | `app/admin/users/page.tsx` | `users.manage` |

**Pattern for page-level gating:**
```typescript
import { useAuth } from '@/app/context/AuthContext'
import { useHasPermission } from '@/app/components/auth/PermissionGate'
import { toast } from '@/app/components/ui/Toast'

export default function ProtectedPage() {
  const router = useRouter()
  const { isLoading } = useAuth()
  const canProcess = useHasPermission('processor')

  // Redirect if no permission
  useEffect(() => {
    if (!canProcess && !isLoading) {
      toast.error('Access denied', 'You do not have permission to access this page')
      router.push('/')
    }
  }, [canProcess, isLoading, router])

  // Don't render until we've verified permission
  if (!canProcess) {
    return null
  }

  return <PageContent />
}
```

### Component-Level Protection

Use `PermissionGate` to conditionally render buttons and UI elements:

```typescript
import { PermissionGate } from '@/app/components/auth/PermissionGate'

// Hide button if user lacks permission
<PermissionGate permission="processor">
  <button onClick={() => router.push('/projects/new')} className="btn-primary">
    New Loan
  </button>
</PermissionGate>

// Show fallback for users without permission
<PermissionGate permission="fund_draws" fallback={<ReadOnlyView />}>
  <FundingControls />
</PermissionGate>

// Require multiple permissions (any match)
<PermissionGate permission={['processor', 'fund_draws']}>
  <ActionButton />
</PermissionGate>

// Require ALL permissions
<PermissionGate permission={['processor', 'users.manage']} requireAll>
  <SuperAdminButton />
</PermissionGate>
```

### Hook for Programmatic Checks

```typescript
import { useHasPermission } from '@/app/components/auth/PermissionGate'

const canProcess = useHasPermission('processor')
const canFund = useHasPermission('fund_draws')

// Use in conditional logic
if (canProcess) {
  // Show edit controls
}
```

### Protected UI Elements

| Location | Element | Permission |
|----------|---------|------------|
| Portfolio Dashboard | "New Loan" button (empty state) | `processor` |
| Header User Menu | "Manage Users" link | `users.manage` |

### Testing Permission Gates

1. **Test with no permissions account:**
   - Navigate to `/projects/new` → Should redirect with "Access denied" toast
   - Navigate to `/draws/new` → Should redirect with "Access denied" toast
   - Portfolio dashboard → "New Loan" button should NOT appear

2. **Test with processor permission:**
   - All create/edit pages should load normally
   - All action buttons should be visible

---

## Account Settings & Activity Tracking

TD3 provides a comprehensive Account Settings page at `/account` with four tabs:

### Tab Structure

| Tab | Access | Content |
|-----|--------|---------|
| Profile | All users | Name, phone editing |
| Preferences | All users | Theme, font size, reduced motion, default dashboard |
| Activity | All users | User's own login and action history |
| All Activity | `users.manage` only | Global activity feed with filters |

### User Preferences

Stored in `profiles.preferences` JSONB column:

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'      // Default: 'light'
  fontSize: 'small' | 'medium' | 'large'  // Default: 'medium'
  reducedMotion: boolean                   // Default: false
  defaultDashboard: 'portfolio' | 'draws'  // Default: 'portfolio'
}
```

Preferences are loaded from the database and applied via CSS classes on `<html>`:
- Font size: `.font-size-small`, `.font-size-medium`, `.font-size-large`
- Reduced motion: `.reduced-motion` (disables animations)

### Activity Tracking

Login events are automatically logged with metadata:
- Device type (desktop/mobile/tablet)
- Browser and OS
- IP address
- City and country (via IP geolocation)

**Key Files:**
- `lib/activity.ts` - Activity logging functions (fire-and-forget pattern)
- `lib/preferences.ts` - Preference load/save functions
- `lib/deviceInfo.ts` - User agent parsing
- `app/api/activity/login/route.ts` - Server-side login logging with IP extraction
- `app/account/components/` - Tab components

### Activity Feed

The activity feed shows:
- **Login events**: Device icon, browser, OS, location badge
- **Entity mutations**: Action type icon, entity label, description, clickable link

**Activity Types:**
`login`, `created`, `updated`, `deleted`, `funded`, `approved`, `rejected`, `staged`, `submitted`, `exported`

**Entity Types:**
`project`, `draw_request`, `wire_batch`, `budget`, `builder`, `invoice`, `user`, `allowlist`

### Header Integration

The header dropdown now shows:
1. **Account Settings** → Links to `/account`
2. **Manage Users** (admin only) → Links to `/admin/users`
3. **Sign Out**

---

## Common Issues & Troubleshooting

### Issue 1: Auth Timeout During Client-Side Navigation

**Symptom:** When navigating between pages (e.g., portfolio to draws dashboard), the page freezes, goes blank, and console shows "Auth initialization timed out after 8 seconds". Profile icon shows generic gray circle or email initials instead of name.

**Causes:**
1. **Full page reloads:** Using `<a href>` instead of Next.js `<Link>` causes full page reloads, triggering auth re-initialization
2. **Redundant init:** AuthContext useEffect re-runs on navigation, resetting `initCompletedRef` and re-initializing
3. **New client per render:** Using `createSupabaseBrowserClient()` creates a new client each render, causing deps to change

**Solution:**
```typescript
// 1. Use module-level singleton instead of creating new client
import { supabase } from '@/lib/supabase'  // NOT createSupabaseBrowserClient()

// 2. Track both completion AND in-progress state
const initCompletedRef = useRef(false)
const initStartedRef = useRef(false)

// 3. Skip if already initialized
useEffect(() => {
  if (initCompletedRef.current) {
    setIsLoading(false)
    return
  }
  if (initStartedRef.current) {
    return  // Already in progress
  }
  initStartedRef.current = true
  // ... initialization logic
}, [])

// 4. Use Next.js Link for internal navigation
import Link from 'next/link'
<Link href="/draws">Draws</Link>  // NOT <a href="/draws">
```

**Key Files:** `app/context/AuthContext.tsx`, all page files with internal links

---

### Issue 2: Infinite Render Loop (Legacy)

**Symptom:** Console shows "Auth initialization timed out" with recursive `ol`/`or` function calls in stack trace. Different from Issue 1 - this is a true infinite loop.

**Cause:** Supabase client created on every render via useMemo that recreates:
```typescript
// BAD - if useMemo deps change, new client every render
const supabase = useMemo(() => createSupabaseBrowserClient(), [])

// This causes:
// 1. New client → useCallback deps change
// 2. useEffect runs (its deps include callbacks)
// 3. State updates → re-render → repeat forever
```

**Solution:** Use module-level singleton:
```typescript
// GOOD - singleton at module level
import { supabase } from '@/lib/supabase'
// No useMemo needed - supabase is stable
```

**Key File:** `app/context/AuthContext.tsx`

---

### Issue 3: "Email link is invalid or has expired"

**Symptom:** User clicks magic link but gets expiration error.

**Cause:** Email security scanner pre-clicked the link.

**Solution:** This is why we switched to OTP codes. If using magic links, switch to OTP.

**How to identify:** Check Supabase auth logs - the consuming IP will be different from the user's IP.

---

### Issue 4: Page stuck on "Verifying..." after entering code

**Symptom:** OTP verification succeeds but UI doesn't redirect.

**Cause:** `router.push()` or `router.replace()` not triggering navigation.

**Solution:** Use `window.location.href` for auth redirects:
```typescript
// DON'T do this
router.push(redirectTo)

// DO this instead
window.location.href = redirectTo
```

**Why:** Next.js router can fail to trigger navigation when auth state changes, especially with client-side session updates.

---

### Issue 5: Blank page after login (auth works but page doesn't load)

**Symptom:** User is authenticated (header shows initials) but dashboard content is blank. Manual refresh fixes it.

**Causes:**
1. Page useEffect only watches `authLoading`, not `isAuthenticated`
2. When auth state changes, the effect doesn't re-run to load data
3. AuthContext blocks too long on profile/permissions fetch

**Solution 1: Watch both authLoading AND isAuthenticated**
```typescript
// BAD - may not trigger when auth completes
useEffect(() => {
  if (!authLoading) loadData()
}, [authLoading])

// GOOD - triggers when user becomes authenticated
useEffect(() => {
  if (!authLoading && isAuthenticated && !dataLoadedRef.current) {
    dataLoadedRef.current = true
    loadData()
  }
}, [authLoading, isAuthenticated])
```

**Solution 2: Don't block on profile/permissions in AuthContext**
```typescript
// Set isLoading=false immediately after getting user
// Profile/permissions can load in background
if (session?.user) {
  setUser(session.user)
  setIsLoading(false)  // Unblock immediately

  // Non-blocking: fetch in background
  Promise.all([fetchProfile(), fetchPermissions()])
    .then(([profile, perms]) => { ... })
}
```

**Key Files:** `app/page.tsx`, `app/context/AuthContext.tsx`

---

### Issue 6: Rules of Hooks violation causing blank page

**Symptom:** Page crashes silently, shows blank content.

**Cause:** useEffect placed AFTER an early return statement:
```typescript
// BAD - violates Rules of Hooks
function Header() {
  const [state, setState] = useState(false)

  if (someCondition) return null  // Early return

  useEffect(() => { ... }, [])  // Hook AFTER return = violation!
}
```

**Solution:** All hooks must be called before any conditional returns:
```typescript
// GOOD - hooks before returns
function Header() {
  const [state, setState] = useState(false)

  useEffect(() => { ... }, [])  // Hook BEFORE any returns

  if (someCondition) return null  // Early return is now safe
}
```

**Key File:** `app/components/ui/Header.tsx`

---

### Issue 7: Sign out button doesn't work

**Symptom:** Clicking sign out does nothing or page stays stuck.

**Cause:** `router.push('/login')` not navigating.

**Solution:** Force hard redirect:
```typescript
// In Header.tsx signOut handler
try {
  await signOut()
} catch (e) {
  console.error(e)
}
localStorage.clear()
sessionStorage.clear()
window.location.href = '/login'
```

---

### Issue 8: "Missing authentication code" error

**Symptom:** Callback page shows no code parameter.

**Context:** This is from the old magic link flow. With OTP codes, there's no callback URL.

**If still seeing this:** User may have clicked an old magic link. Request new code.

---

### Issue 9: PKCE code_verifier error

**Error:** `"both auth code and code verifier should be non-empty"`

**Cause:** Server-side route trying to exchange code, but `code_verifier` is stored in browser.

**Solution:** Callback must be client-side (`page.tsx` not `route.ts`) to access browser storage.

**Current state:** We use OTP codes now, so this doesn't apply. But the callback page exists for legacy support.

---

### Issue 10: OTP code is 8 digits but UI expects 6

**Symptom:** User can't enter full code.

**Cause:** Supabase sends 8-digit codes (not 6 as documented).

**Solution:** OTP input UI must have 8 input boxes:
```typescript
const [otpCode, setOtpCode] = useState(['', '', '', '', '', '', '', ''])
```

---

## Emergency Procedures

### Emergency Sign Out (User Stuck)

If user is stuck on blank page or can't sign out normally:

**Option 1: Browser Console**
```javascript
localStorage.clear()
sessionStorage.clear()
location.href = '/login'
```

**Option 2: Header Emergency Button**
The header shows an emergency sign out button when `isLoading` is true. This button:
1. Clears localStorage and sessionStorage
2. Signs out via Supabase client
3. Forces `window.location.href = '/login'`

### Reset All Auth State (Development)

```javascript
// Clear everything and reload
localStorage.clear()
sessionStorage.clear()
indexedDB.deleteDatabase('supabase-auth')
location.reload()
```

### Check Current Session (Debugging)

```javascript
// Get current session
const token = localStorage.getItem('sb-uewqcbmaiuofdfvqmbmq-auth-token')
if (token) {
  const parsed = JSON.parse(token)
  console.log('User:', parsed.user?.email)
  console.log('Expires:', new Date(parsed.expires_at * 1000))
}
```

### View Supabase Auth Logs

1. Go to Supabase Dashboard
2. Navigate to **Authentication → Logs**
3. Filter by email or time range
4. Look for:
   - `otp_expired` - Code was already used or expired
   - `invalid_otp` - Wrong code entered
   - IP addresses - Different IP = scanner consumed link

---

## Development Guidelines

### Use Module-Level Supabase Singleton

```typescript
// BAD - new client every render = infinite loops
const supabase = createSupabaseBrowserClient()

// OK - but adds complexity
const supabase = useMemo(() => createSupabaseBrowserClient(), [])

// BEST - import module-level singleton
import { supabase } from '@/lib/supabase'
// No memoization needed - supabase is stable across all renders
```

### Use Next.js Link for Internal Navigation

```typescript
// BAD - causes full page reload, re-triggers auth init
<a href="/draws">Draws</a>

// GOOD - client-side navigation, preserves auth state
import Link from 'next/link'
<Link href="/draws">Draws</Link>
```

### All Hooks Before Conditional Returns

```typescript
// BAD - Rules of Hooks violation
function Component() {
  if (condition) return null
  useEffect(() => {}, [])  // After return = crash
}

// GOOD
function Component() {
  useEffect(() => {}, [])  // Before return
  if (condition) return null
}
```

### Watch isAuthenticated for Data Loading

```typescript
// BAD - authLoading alone may not trigger
useEffect(() => {
  if (!authLoading) loadData()
}, [authLoading])

// GOOD - triggers when user becomes authenticated
const { isLoading, isAuthenticated } = useAuth()
useEffect(() => {
  if (!isLoading && isAuthenticated) loadData()
}, [isLoading, isAuthenticated])
```

### Never Use router.push for Auth Redirects

```typescript
// BAD - can fail silently
router.push('/login')
router.replace('/')

// GOOD - always works
window.location.href = '/login'
```

### Always Wrap signOut in try/catch

```typescript
const handleSignOut = async () => {
  try {
    await signOut()
  } catch (e) {
    console.error('Sign out error:', e)
  }
  // Always redirect even if signOut fails
  window.location.href = '/login'
}
```

### OTP Code Validation

```typescript
// Verify code length matches Supabase config (currently 8)
if (verifyCode.length !== 8) {
  setErrorMessage('Please enter all 8 digits')
  return
}
```

### Check Both session AND user

```typescript
// Supabase may return user without session or vice versa
if (data.session || data.user) {
  // Success
} else {
  // Handle edge case
}
```

### Clear Storage on Auth Errors

When auth fails unexpectedly, clear storage to prevent stuck states:
```typescript
localStorage.clear()
sessionStorage.clear()
```

### Use Client Components for Auth

Auth components must be client-side (`'use client'`) to access:
- Browser localStorage (session storage)
- window.location (for redirects)
- Supabase browser client

---

## Testing Checklist

Before deploying auth changes:

- [ ] Login with valid allowlisted email
- [ ] Receive 8-digit code in email
- [ ] Enter code and verify redirect works
- [ ] Dashboard loads after redirect
- [ ] Sign out button works
- [ ] Emergency sign out works
- [ ] Protected routes redirect to login
- [ ] Login preserves redirect parameter
- [ ] First login modal shows for new users
- [ ] Permissions work (test with different permission levels)

---

## Version History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-18 | Add UI permission gating to create/edit pages | Users without permissions could see buttons/pages |
| 2026-01-18 | Switch from magic links to OTP codes | Email scanners consuming magic links |
| 2026-01-18 | Change OTP from 6 to 8 digits | Supabase sends 8-digit codes |
| 2026-01-18 | Use window.location.href for redirects | router.push fails after auth state change |
| 2026-01-18 | Add emergency sign out with storage clear | Users getting stuck on blank pages |
| 2026-01-18 | Memoize supabase client in AuthContext | Prevent infinite render loop |
| 2026-01-18 | Fix Rules of Hooks violation in Header | useEffect after early return caused crash |
| 2026-01-18 | Watch isAuthenticated in page useEffects | Auth state change wasn't triggering data load |
| 2026-01-18 | Non-blocking profile/permissions fetch | Auth init was slow (10-15 sec) blocking on DB |
| 2026-01-18 | Move profile editing to header dropdown | Replace FirstLoginModal with always-available option |
| 2026-01-19 | Fix auth timeout during client-side navigation | Use module-level singleton, prevent redundant init with refs |
| 2026-01-19 | Convert internal `<a href>` links to Next.js `<Link>` | Prevent full page reloads during navigation |
| 2026-01-19 | Add Account Settings page at /account | Profile, preferences, activity in one place |
| 2026-01-19 | Add user_activity table and login tracking | Security auditing with device/location metadata |
| 2026-01-19 | Add user preferences JSONB column | Theme, font size, reduced motion, default dashboard |

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full system architecture
- [CLAUDE.md](../CLAUDE.md) - Project context for AI assistants
- [supabase/004_auth.sql](../supabase/004_auth.sql) - Database schema and RLS policies
