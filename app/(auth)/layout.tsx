import { ToastContainer } from '@/app/components/ui/Toast'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)',
      }}
    >
      {children}
      <ToastContainer />
    </div>
  )
}
