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
  description: 'Streamline construction lending with intelligent budget tracking, draw automation, and real-time portfolio visibility.',
  metadataBase: new URL('https://td3.tennantdevelopments.com'),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'TD3 - Construction Draw Management',
    description: 'Streamline construction lending with intelligent budget tracking, draw automation, and real-time portfolio visibility.',
    url: 'https://td3.tennantdevelopments.com',
    siteName: 'TD3',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TD3 - Construction Draw Management',
    description: 'Streamline construction lending with intelligent budget tracking and draw automation.',
  },
  keywords: ['construction lending', 'draw management', 'budget tracking', 'construction loans', 'wire transfers'],
  authors: [{ name: 'Tennant Development' }],
  creator: 'Tennant Development',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`light ${inter.variable} ${jetbrainsMono.variable}`}>
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
