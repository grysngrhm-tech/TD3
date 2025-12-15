import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeToggle } from '@/app/components/ui/ThemeToggle'
import { ToastContainer } from '@/app/components/ui/Toast'
import { DevNav } from '@/app/components/ui/DevNav'

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
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
          {/* Top Navigation Bar - Minimal */}
          <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b flex items-center px-6" style={{ 
            background: 'var(--bg-secondary)', 
            borderColor: 'var(--border-subtle)' 
          }}>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-ios-xs flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <span className="text-white font-bold text-xs">TD3</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Draw Management
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-105"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
              >
                GG
              </div>
            </div>
          </nav>
          
          {/* Main Content - Below nav */}
          <main className="pt-14">
            {children}
          </main>
          
          {/* Toast Notifications */}
          <ToastContainer />
          
          {/* Dev Navigation */}
          <DevNav />
        </div>
      </body>
    </html>
  )
}
