'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SpreadsheetData, ColumnMapping } from '@/lib/spreadsheet'

type SpreadsheetViewerProps = {
  data: SpreadsheetData
  mappings: ColumnMapping[]
  onMappingChange: (columnIndex: number, newMapping: ColumnMapping['mappedTo']) => void
  maxRows?: number
}

const MAPPING_COLORS: Record<string, string> = {
  category: 'rgba(59, 130, 246, 0.2)',
  amount: 'rgba(34, 197, 94, 0.2)',
  ignore: 'transparent',
}

const MAPPING_BORDER_COLORS: Record<string, string> = {
  category: 'rgb(59, 130, 246)',
  amount: 'rgb(34, 197, 94)',
  ignore: 'transparent',
}

const MAPPING_LABELS: Record<string, string> = {
  category: 'Category',
  amount: 'Amount',
  ignore: '—',
}

// Available mapping types: Category, Amount, or Ignore
const AVAILABLE_MAPPINGS: Array<'category' | 'amount' | 'ignore'> = ['category', 'amount', 'ignore']

export function SpreadsheetViewer({ 
  data, 
  mappings, 
  onMappingChange,
  maxRows = 50
}: SpreadsheetViewerProps) {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)

  const displayRows = useMemo(() => data.rows.slice(0, maxRows), [data.rows, maxRows])
  const getMappingForColumn = (index: number) => mappings.find(m => m.columnIndex === index)

  const handleColumnClick = (index: number) => {
    setSelectedColumn(index)
  }

  const handleMappingSelect = (mapping: ColumnMapping['mappedTo']) => {
    if (selectedColumn !== null) {
      onMappingChange(selectedColumn, mapping)
      setSelectedColumn(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Inline Legend */}
      <div className="flex items-center gap-4 mb-2 text-xs">
        <span style={{ color: 'var(--text-muted)' }}>Click headers to map:</span>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: MAPPING_BORDER_COLORS.category }} />
          <span style={{ color: 'var(--text-secondary)' }}>Category</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: MAPPING_BORDER_COLORS.amount }} />
          <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-ios-xs border min-h-0" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {data.headers.map((header, index) => {
                const mapping = getMappingForColumn(index)
                const hasMapping = mapping?.mappedTo && mapping.mappedTo !== 'ignore'
                
                return (
                  <th
                    key={index}
                    onClick={() => handleColumnClick(index)}
                    className="px-2 py-1.5 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                    style={{ 
                      background: hasMapping ? MAPPING_COLORS[mapping!.mappedTo!] : 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      borderBottom: `2px solid ${hasMapping ? MAPPING_BORDER_COLORS[mapping!.mappedTo!] : 'var(--border)'}`,
                      minWidth: '80px',
                      maxWidth: '150px'
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{header || '—'}</span>
                      {hasMapping && (
                        <span 
                          className="text-[10px] px-1 py-px rounded font-medium flex-shrink-0"
                          style={{ background: MAPPING_BORDER_COLORS[mapping!.mappedTo!], color: 'white' }}
                        >
                          {MAPPING_LABELS[mapping!.mappedTo!]}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[var(--bg-hover)]">
                {data.headers.map((_, colIndex) => {
                  const mapping = getMappingForColumn(colIndex)
                  const hasMapping = mapping?.mappedTo && mapping.mappedTo !== 'ignore'
                  const value = row[colIndex]
                  
                  return (
                    <td
                      key={colIndex}
                      className="px-2 py-1 truncate"
                      style={{ 
                        background: hasMapping ? MAPPING_COLORS[mapping!.mappedTo!] : 'transparent',
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-subtle)',
                        maxWidth: '150px'
                      }}
                      title={value != null ? String(value) : ''}
                    >
                      {value != null ? String(value) : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {data.rows.length > maxRows && (
        <p className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
          {maxRows} of {data.rows.length} rows
        </p>
      )}

      {/* Mapping Modal */}
      <AnimatePresence>
        {selectedColumn !== null && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setSelectedColumn(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-[70] p-3 rounded-ios-sm shadow-xl"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Map Column</span>
                <button onClick={() => setSelectedColumn(null)} className="p-1 rounded hover:bg-[var(--bg-hover)]">
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="text-xs mb-3 p-2 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                "{data.headers[selectedColumn]}"
              </div>

              <div className="space-y-1">
                {AVAILABLE_MAPPINGS.map((type) => {
                  const isSelected = getMappingForColumn(selectedColumn)?.mappedTo === type
                  
                  return (
                    <button
                      key={type}
                      onClick={() => handleMappingSelect(type)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
                      style={{ 
                        background: isSelected ? MAPPING_COLORS[type] : 'transparent',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div className="w-3 h-3 rounded-sm" style={{ background: type === 'ignore' ? 'var(--bg-hover)' : MAPPING_BORDER_COLORS[type] }} />
                      <span>{type === 'category' ? 'Category' : type === 'amount' ? 'Amount' : 'Ignore'}</span>
                      {isSelected && (
                        <svg className="w-3 h-3 ml-auto" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

