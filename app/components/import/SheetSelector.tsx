'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SheetInfo } from '@/lib/spreadsheet'

type SheetSelectorProps = {
  sheets: SheetInfo[]
  selectedSheet: string
  onSheetChange: (sheetName: string) => void
}

export function SheetSelector({ sheets, selectedSheet, onSheetChange }: SheetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (sheets.length <= 1) {
    return null // Don't show selector if only one sheet
  }

  const selected = sheets.find(s => s.name === selectedSheet)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-3 rounded-ios-sm transition-all hover:brightness-110"
        style={{ 
          background: 'var(--bg-card)',
          border: '1px solid var(--border)'
        }}
      >
        <svg 
          className="w-5 h-5 flex-shrink-0" 
          style={{ color: 'var(--accent)' }} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        
        <div className="flex-1 text-left">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Sheet
          </p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {selected?.name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {selected?.rowCount} rows
          </p>
        </div>

        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-40 mt-2 w-full rounded-ios-sm shadow-lg overflow-hidden"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)'
              }}
            >
              {sheets.map((sheet) => {
                const isSelected = sheet.name === selectedSheet
                
                return (
                  <button
                    key={sheet.name}
                    onClick={() => {
                      onSheetChange(sheet.name)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ 
                      background: isSelected ? 'var(--accent-glow)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected && (
                        <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span 
                        className={`font-medium ${isSelected ? '' : 'ml-7'}`}
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        {sheet.name}
                      </span>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {sheet.rowCount} rows × {sheet.columnCount} cols
                    </span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
