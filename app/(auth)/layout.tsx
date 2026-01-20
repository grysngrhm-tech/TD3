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
      }}
    >
      {children}
      <ToastContainer />
    </div>
  )
}
