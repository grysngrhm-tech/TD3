'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SpreadsheetData, ColumnMapping, RowRange } from '@/lib/spreadsheet'

type SpreadsheetViewerProps = {
  data: SpreadsheetData
  mappings: ColumnMapping[]
  rowRange: RowRange | null
  onMappingChange: (columnIndex: number, newMapping: ColumnMapping['mappedTo']) => void
  onRowRangeChange: (range: RowRange) => void
  maxRows?: number
}

// RGB Color System - Base colors (30% opacity for columns, 25% for rows)
const COLORS = {
  // Column colors (outside row range)
  categoryColumn: 'rgba(59, 130, 246, 0.15)',   // Blue - faded
  amountColumn: 'rgba(239, 68, 68, 0.15)',      // Red - faded
  
  // Row highlight (selected range)
  selectedRow: 'rgba(250, 204, 21, 0.25)',      // Yellow
  
  // Intersection colors (column + selected row)
  categoryIntersection: 'rgba(34, 197, 94, 0.35)',   // Green (Blue + Yellow)
  amountIntersection: 'rgba(249, 115, 22, 0.35)',    // Orange (Red + Yellow)
  
  // Full intensity for headers with mapping
  categoryHeader: 'rgba(59, 130, 246, 0.3)',    // Blue
  amountHeader: 'rgba(239, 68, 68, 0.3)',       // Red
}

// Border colors for visual distinction
const BORDER_COLORS = {
  category: 'rgb(59, 130, 246)',   // Blue
  amount: 'rgb(239, 68, 68)',      // Red
}

const MAPPING_LABELS: Record<string, string> = {
  category: 'Category',
  amount: 'Amount',
  ignore: '—',
}

const AVAILABLE_MAPPINGS: Array<'category' | 'amount' | 'ignore'> = ['category', 'amount', 'ignore']

export function SpreadsheetViewer({ 
  data, 
  mappings, 
  rowRange,
  onMappingChange,
  onRowRangeChange,
  maxRows = 100
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

  // Check if a row is within the selected range
  const isRowInRange = useCallback((rowIndex: number) => {
    if (!rowRange) return true // If no range, all rows are "in range"
    return rowIndex >= rowRange.startRow && rowIndex <= rowRange.endRow
  }, [rowRange])

  // Get cell background color based on column mapping and row selection
  const getCellBackground = useCallback((colIndex: number, rowIndex: number) => {
    const mapping = getMappingForColumn(colIndex)
    const inRange = isRowInRange(rowIndex)
    
    // No mapping or ignored column
    if (!mapping?.mappedTo || mapping.mappedTo === 'ignore') {
      return inRange ? COLORS.selectedRow : 'transparent'
    }
    
    // Column has mapping
    if (mapping.mappedTo === 'category') {
      return inRange ? COLORS.categoryIntersection : COLORS.categoryColumn
    }
    if (mapping.mappedTo === 'amount') {
      return inRange ? COLORS.amountIntersection : COLORS.amountColumn
    }
    
    return 'transparent'
  }, [getMappingForColumn, isRowInRange])

  // Handle row click to set start/end of range
  const handleRowClick = (rowIndex: number, event: React.MouseEvent) => {
    if (!rowRange) return
    
    // Shift+click sets end row, regular click sets start row
    if (event.shiftKey) {
      onRowRangeChange({ 
        startRow: Math.min(rowRange.startRow, rowIndex), 
        endRow: Math.max(rowRange.startRow, rowIndex) 
      })
    } else {
      onRowRangeChange({ startRow: rowIndex, endRow: rowRange.endRow })
    }
  }

  // Handle row number input change
  const handleStartRowChange = (value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0 && rowRange) {
      onRowRangeChange({ 
        startRow: Math.min(num, rowRange.endRow), 
        endRow: rowRange.endRow 
      })
    }
  }

  const handleEndRowChange = (value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0 && rowRange) {
      onRowRangeChange({ 
        startRow: rowRange.startRow, 
        endRow: Math.max(num, rowRange.startRow) 
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Legend and Row Range Controls */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        {/* Legend - only 3 base colors */}
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Click headers to map:</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: BORDER_COLORS.category }} />
            <span style={{ color: 'var(--text-secondary)' }}>Category</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: BORDER_COLORS.amount }} />
            <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(250, 204, 21)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Rows</span>
          </div>
        </div>

        {/* Row Range Controls */}
        {rowRange && (
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Rows:</span>
            <input
              type="number"
              min={0}
              max={data.rows.length - 1}
              value={rowRange.startRow}
              onChange={(e) => handleStartRowChange(e.target.value)}
              className="w-14 px-1.5 py-0.5 rounded text-center"
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input
              type="number"
              min={0}
              max={data.rows.length - 1}
              value={rowRange.endRow}
              onChange={(e) => handleEndRowChange(e.target.value)}
              className="w-14 px-1.5 py-0.5 rounded text-center"
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>
              ({rowRange.endRow - rowRange.startRow + 1} selected)
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-ios-xs border min-h-0" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Row number header */}
              <th
                className="px-2 py-1.5 text-center font-medium whitespace-nowrap sticky left-0 z-20"
                style={{ 
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  borderBottom: '2px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                  minWidth: '40px',
                  width: '40px'
                }}
              >
                #
              </th>
              {data.headers.map((header, index) => {
                const mapping = getMappingForColumn(index)
                const hasMapping = mapping?.mappedTo && mapping.mappedTo !== 'ignore'
                const mappingType = mapping?.mappedTo
                
                // Header background
                let headerBg = 'var(--bg-secondary)'
                let borderColor = 'var(--border)'
                
                if (mappingType === 'category') {
                  headerBg = COLORS.categoryHeader
                  borderColor = BORDER_COLORS.category
                } else if (mappingType === 'amount') {
                  headerBg = COLORS.amountHeader
                  borderColor = BORDER_COLORS.amount
                }
                
                return (
                  <th
                    key={index}
                    onClick={() => handleColumnClick(index)}
                    className="px-2 py-1.5 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                    style={{ 
                      background: headerBg,
                      color: 'var(--text-primary)',
                      borderBottom: `2px solid ${borderColor}`,
                      minWidth: '80px',
                      maxWidth: '150px'
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{header || '—'}</span>
                      {hasMapping && (
                        <span 
                          className="text-[10px] px-1 py-px rounded font-medium flex-shrink-0"
                          style={{ 
                            background: mappingType === 'category' ? BORDER_COLORS.category : BORDER_COLORS.amount, 
                            color: 'white' 
                          }}
                        >
                          {MAPPING_LABELS[mappingType!]}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => {
              const inRange = isRowInRange(rowIndex)
              
              return (
                <tr 
                  key={rowIndex} 
                  className="hover:brightness-95 cursor-pointer"
                  onClick={(e) => handleRowClick(rowIndex, e)}
                  title={inRange ? 'Click to set start row, Shift+click to set end row' : 'Click to include this row'}
                >
                  {/* Row number cell */}
                  <td
                    className="px-2 py-1 text-center font-mono sticky left-0"
                    style={{ 
                      background: inRange ? 'rgba(250, 204, 21, 0.4)' : 'var(--bg-secondary)',
                      color: inRange ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderRight: '1px solid var(--border)',
                      fontWeight: inRange ? 600 : 400
                    }}
                  >
                    {rowIndex}
                  </td>
                  {data.headers.map((_, colIndex) => {
                    const value = row[colIndex]
                    const cellBg = getCellBackground(colIndex, rowIndex)
                    
                    return (
                      <td
                        key={colIndex}
                        className="px-2 py-1 truncate"
                        style={{ 
                          background: cellBg,
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
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {data.rows.length > maxRows && (
        <p className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
          Showing {maxRows} of {data.rows.length} rows
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
                  const bgColor = type === 'category' ? COLORS.categoryHeader 
                                : type === 'amount' ? COLORS.amountHeader 
                                : 'transparent'
                  const dotColor = type === 'category' ? BORDER_COLORS.category
                                 : type === 'amount' ? BORDER_COLORS.amount
                                 : 'var(--bg-hover)'
                  
                  return (
                    <button
                      key={type}
                      onClick={() => handleMappingSelect(type)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
                      style={{ 
                        background: isSelected ? bgColor : 'transparent',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div className="w-3 h-3 rounded-sm" style={{ background: dotColor }} />
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
