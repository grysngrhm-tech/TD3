import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastContainer } from '@/app/components/ui/Toast'
import { Providers } from '@/app/components/Providers'
import { Header } from '@/app/components/ui/Header'

/**
 * TD3 Design Language System - Typography
 * 
 * Primary font: Inter (UI, body text)
 * Mono font: JetBrains Mono (financial values, code)
 */
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

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
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Top Navigation Bar */}
            <Header />
            
            {/* Main Content - Below nav */}
            <main style={{ paddingTop: 'var(--header-height)' }}>
              {children}
            </main>
            
            {/* Toast Notifications */}
            <ToastContainer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
