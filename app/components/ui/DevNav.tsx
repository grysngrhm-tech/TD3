'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/staging', label: 'Draw Staging', icon: '📋' },
  { href: '/draws/new', label: 'New Draw', icon: '➕' },
  { href: '/draws', label: 'All Draws', icon: '📄' },
  { href: '/projects', label: 'Projects', icon: '🏗️' },
  { href: '/projects/new', label: 'New Project', icon: '🆕' },
  { href: '/budgets', label: 'Budgets', icon: '💰' },
  { href: '/reports', label: 'Reports', icon: '📊' },
]

export function DevNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 right-0 w-48 rounded-lg shadow-xl border overflow-hidden"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-primary)' 
            }}
          >
            <div className="p-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <span className="text-xs font-medium px-2" style={{ color: 'var(--text-muted)' }}>
                Dev Navigation
              </span>
            </div>
            <div className="py-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-opacity-50"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-transform hover:scale-105"
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-primary)',
          color: 'var(--text-secondary)'
        }}
        title="Dev Navigation"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  )
}
