'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'

/**
 * Routes where the header should be hidden (public/auth pages)
 */
const HEADERLESS_ROUTES = ['/login', '/auth/callback']

interface AppShellProps {
  children: React.ReactNode
}

/**
 * App shell that conditionally renders the header and adjusts layout.
 * - On auth routes: No header, content starts at viewport top
 * - On app routes: Header visible, content offset below header
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const showHeader = !HEADERLESS_ROUTES.some(route => pathname?.startsWith(route))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {showHeader && <Header />}
      <main style={showHeader ? { paddingTop: 'var(--header-height)' } : undefined}>
        {children}
      </main>
    </div>
  )
}
