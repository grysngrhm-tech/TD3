'use client'

import { motion } from 'framer-motion'
import { NavBackButton } from './NavBackButton'
import { SmartLogo } from './SmartLogo'
import { ThemeToggle } from './ThemeToggle'

/**
 * Global header component with:
 * - Material elevation shadow
 * - Glassmorphism backdrop blur
 * - Smart navigation elements
 */
export function Header() {
  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-header flex items-center px-4" 
      style={{ 
        height: 'var(--header-height)',
        background: 'var(--bg-card-transparent)', 
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: 'var(--elevation-1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
    >
      {/* Left - Back button */}
      <NavBackButton />

      {/* Center - Smart Logo (absolute centered) */}
      <SmartLogo />

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        
        {/* User Avatar */}
        <motion.div 
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer touch-target"
          style={{ 
            background: 'var(--accent-muted)', 
            color: 'var(--accent)',
            border: '2px solid transparent',
          }}
          whileHover={{ 
            scale: 1.05,
            borderColor: 'var(--accent)',
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          GG
        </motion.div>
      </div>
    </motion.nav>
  )
}

