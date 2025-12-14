'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SpreadsheetData, ColumnMapping } from '@/lib/spreadsheet'

type SpreadsheetViewerProps = {
  data: SpreadsheetData
  mappings: ColumnMapping[]
  onMappingChange: (columnIndex: number, newMapping: ColumnMapping['mappedTo'], drawNumber?: number) => void
  maxRows?: number
}

const MAPPING_COLORS: Record<string, string> = {
  category: 'rgba(59, 130, 246, 0.25)',
  budget_amount: 'rgba(34, 197, 94, 0.25)',
  draw_amount: 'rgba(168, 85, 247, 0.25)',
  ignore: 'transparent',
}

const MAPPING_BORDER_COLORS: Record<string, string> = {
  category: 'rgba(59, 130, 246, 0.5)',
  budget_amount: 'rgba(34, 197, 94, 0.5)',
  draw_amount: 'rgba(168, 85, 247, 0.5)',
  ignore: 'transparent',
}

const MAPPING_LABELS: Record<string, string> = {
  category: 'Category',
  budget_amount: 'Budget',
  draw_amount: 'Draw',
  ignore: 'Ignore',
}

export function SpreadsheetViewer({ 
  data, 
  mappings, 
  onMappingChange,
  maxRows = 15 
}: SpreadsheetViewerProps) {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [drawNumberInput, setDrawNumberInput] = useState<number>(1)

  const displayRows = useMemo(() => {
    return data.rows.slice(0, maxRows)
  }, [data.rows, maxRows])

  const getMappingForColumn = (index: number) => {
    return mappings.find(m => m.columnIndex === index)
  }

  const handleColumnClick = (index: number) => {
    setSelectedColumn(index)
    const mapping = getMappingForColumn(index)
    if (mapping?.drawNumber) {
      setDrawNumberInput(mapping.drawNumber)
    } else {
      setDrawNumberInput(1)
    }
  }

  const handleMappingSelect = (mapping: ColumnMapping['mappedTo']) => {
    if (selectedColumn !== null) {
      const drawNum = mapping === 'draw_amount' ? drawNumberInput : undefined
      onMappingChange(selectedColumn, mapping, drawNum)
      setSelectedColumn(null)
    }
  }

  const closeModal = () => {
    setSelectedColumn(null)
  }

  return (
    <div className="relative">
      {/* Color Legend */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Column Types:
        </span>
        {(['category', 'budget_amount', 'draw_amount'] as const).map((type) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <div 
              className="w-4 h-4 rounded border-2"
              style={{ 
                background: MAPPING_COLORS[type],
                borderColor: MAPPING_BORDER_COLORS[type]
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{MAPPING_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Spreadsheet Table */}
      <div 
        className="overflow-x-auto rounded-ios-sm border"
        style={{ borderColor: 'var(--border)', maxHeight: '400px' }}
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {data.headers.map((header, index) => {
                const mapping = getMappingForColumn(index)
                const bgColor = mapping?.mappedTo ? MAPPING_COLORS[mapping.mappedTo] : 'var(--bg-secondary)'
                const borderColor = mapping?.mappedTo ? MAPPING_BORDER_COLORS[mapping.mappedTo] : 'transparent'
                
                return (
                  <th
                    key={index}
                    onClick={() => handleColumnClick(index)}
                    className="px-3 py-3 text-left font-semibold cursor-pointer transition-all hover:brightness-110 select-none"
                    style={{ 
                      background: bgColor,
                      color: 'var(--text-primary)',
                      borderBottom: `2px solid ${borderColor}`,
                      minWidth: '140px',
                      maxWidth: '200px'
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      {/* Header name + mapping badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{header || '(empty)'}</span>
                        {mapping?.mappedTo && mapping.mappedTo !== 'ignore' && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                            style={{ 
                              background: MAPPING_BORDER_COLORS[mapping.mappedTo],
                              color: 'white'
                            }}
                          >
                            {MAPPING_LABELS[mapping.mappedTo]}
                            {mapping.drawNumber ? ` #${mapping.drawNumber}` : ''}
                          </span>
                        )}
                      </div>
                      
                      {/* Confidence bar */}
                      {mapping?.confidence && mapping.confidence > 0 && (
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                          <motion.div 
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${mapping.confidence * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ background: 'var(--accent)' }}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="transition-colors hover:brightness-95"
              >
                {data.headers.map((_, colIndex) => {
                  const mapping = getMappingForColumn(colIndex)
                  const bgColor = mapping?.mappedTo ? MAPPING_COLORS[mapping.mappedTo] : 'transparent'
                  const value = row[colIndex]
                  
                  return (
                    <td
                      key={colIndex}
                      className="px-3 py-2 truncate"
                      style={{ 
                        background: bgColor,
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-subtle)',
                        maxWidth: '200px'
                      }}
                      title={value !== null && value !== undefined ? String(value) : ''}
                    >
                      {value !== null && value !== undefined ? String(value) : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row count indicator */}
      {data.rows.length > maxRows && (
        <p className="text-sm mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
          Showing {maxRows} of {data.rows.length} rows
        </p>
      )}

      {/* Column Mapping Modal */}
      <AnimatePresence>
        {selectedColumn !== null && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={closeModal}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed z-50 p-4 rounded-ios shadow-2xl"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                minWidth: '280px'
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Map Column
                </h3>
                <button 
                  onClick={closeModal}
                  className="w-8 h-8 rounded-ios-xs flex items-center justify-center hover:bg-[var(--bg-hover)]"
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Column Name */}
              <div className="mb-4 p-3 rounded-ios-sm" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  Column
                </p>
                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  "{data.headers[selectedColumn]}"
                </p>
              </div>

              {/* Mapping Options */}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Map to
                </p>
                
                {(['category', 'budget_amount', 'draw_amount', 'ignore'] as const).map((type) => {
                  const isSelected = getMappingForColumn(selectedColumn)?.mappedTo === type
                  
                  return (
                    <button
                      key={type}
                      onClick={() => type !== 'draw_amount' && handleMappingSelect(type)}
                      className={`w-full text-left px-4 py-3 rounded-ios-sm text-sm transition-all ${
                        type === 'draw_amount' ? '' : 'hover:brightness-110'
                      }`}
                      style={{ 
                        background: isSelected ? MAPPING_COLORS[type] : 'var(--bg-secondary)',
                        border: `1px solid ${isSelected ? MAPPING_BORDER_COLORS[type] : 'var(--border-subtle)'}`,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded border-2 flex-shrink-0"
                          style={{ 
                            background: MAPPING_COLORS[type],
                            borderColor: MAPPING_BORDER_COLORS[type]
                          }}
                        />
                        <span className="font-medium">{MAPPING_LABELS[type]}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 ml-auto" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Draw number input for draw_amount */}
                      {type === 'draw_amount' && (
                        <div className="mt-3 flex items-center gap-3">
                          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Draw #
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={drawNumberInput}
                            onChange={(e) => setDrawNumberInput(parseInt(e.target.value) || 1)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 px-2 py-1 rounded-ios-xs text-center"
                            style={{ 
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMappingSelect('draw_amount')
                            }}
                            className="ml-auto px-3 py-1 rounded-ios-xs text-xs font-medium"
                            style={{ 
                              background: 'var(--accent)',
                              color: 'white'
                            }}
                          >
                            Apply
                          </button>
                        </div>
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
