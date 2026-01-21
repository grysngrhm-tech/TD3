/**
 * Auth layout for login and callback pages.
 * These pages have no header - AppShell handles this automatically.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
