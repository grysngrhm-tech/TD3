import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50">
          {/* Navigation */}
          <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <a href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">TD3</span>
                    </div>
                    <span className="font-semibold text-slate-900">Draw Management</span>
                  </a>
                </div>
                <div className="flex items-center gap-6">
                  <a href="/" className="text-slate-600 hover:text-primary-600 font-medium">
                    Dashboard
                  </a>
                  <a href="/projects" className="text-slate-600 hover:text-primary-600 font-medium">
                    Projects
                  </a>
                  <a href="/budgets" className="text-slate-600 hover:text-primary-600 font-medium">
                    Budgets
                  </a>
                  <a href="/draws" className="text-slate-600 hover:text-primary-600 font-medium">
                    Draw Requests
                  </a>
                  <a href="/reports" className="text-slate-600 hover:text-primary-600 font-medium">
                    Reports
                  </a>
                </div>
              </div>
            </div>
          </nav>
          
          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

