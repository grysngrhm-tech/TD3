import { ToastContainer } from '@/app/components/ui/Toast'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg-primary)',
        // Pull content up into the header padding area since Header is hidden on auth routes
        marginTop: 'calc(-1 * var(--header-height))',
      }}
    >
      {children}
      <ToastContainer />
    </div>
  )
}
