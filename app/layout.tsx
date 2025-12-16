import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastContainer } from '@/app/components/ui/Toast'
import { DevNav } from '@/app/components/ui/DevNav'
import { Providers } from '@/app/components/Providers'
import { Header } from '@/app/components/ui/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TD3 - Construction Draw Management',
  description: 'Budget and draw request management for construction lending',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Top Navigation Bar */}
            <Header />
            
            {/* Main Content - Below nav */}
            <main className="pt-14">
              {children}
            </main>
            
            {/* Toast Notifications */}
            <ToastContainer />
            
            {/* Dev Navigation */}
            <DevNav />
          </div>
        </Providers>
      </body>
    </html>
  )
}
