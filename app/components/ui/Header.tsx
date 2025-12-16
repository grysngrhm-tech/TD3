'use client'

import { NavBackButton } from './NavBackButton'
import { SmartLogo } from './SmartLogo'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 h-14 border-b flex items-center px-4" 
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      {/* Left - Back button */}
      <NavBackButton />

      {/* Center - Smart Logo (absolute centered) */}
      <SmartLogo />

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-105"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
        >
          GG
        </div>
      </div>
    </nav>
  )
}

