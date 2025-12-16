'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SpreadsheetData, ColumnMapping, RowRange, CellStyle, RowRangeWithAnalysis, RowAnalysis, RowClassification } from '@/lib/spreadsheet'

type SpreadsheetViewerProps = {
  data: SpreadsheetData
  mappings: ColumnMapping[]
  rowRangeAnalysis: RowRangeWithAnalysis | null
  onMappingChange: (columnIndex: number, newMapping: ColumnMapping['mappedTo']) => void
  onRowRangeChange: (range: RowRange) => void
  onResetRowRange?: () => void  // Optional callback to reset to auto-detected range
  maxRows?: number
}

// Classification badge labels
const CLASSIFICATION_BADGES: Record<RowClassification, { label: string; color: string } | null> = {
  header: { label: 'H', color: 'rgb(107, 114, 128)' },    // Gray
  total: { label: 'T', color: 'rgb(239, 68, 68)' },       // Red
  closing: { label: 'C', color: 'rgb(249, 115, 22)' },    // Orange
  data: null,  // No badge for data rows
  empty: null,
  unknown: null,
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
  rowRangeAnalysis,
  onMappingChange,
  onRowRangeChange,
  onResetRowRange,
  maxRows = 100
}: SpreadsheetViewerProps) {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  
  // Drag state for adjusting row range
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
  const [dragPreviewRow, setDragPreviewRow] = useState<number | null>(null)
  
  // Refs for drag handling (to avoid stale closures in event handlers)
  const dragTypeRef = useRef<'start' | 'end' | null>(null)
  const dragRowRef = useRef<number | null>(null)

  const displayRows = useMemo(() => data.rows.slice(0, maxRows), [data.rows, maxRows])
  const getMappingForColumn = (index: number) => mappings.find(m => m.columnIndex === index)
  
  // Extract simple range for convenience
  const rowRange = rowRangeAnalysis ? { 
    startRow: rowRangeAnalysis.startRow, 
    endRow: rowRangeAnalysis.endRow 
  } : null

  // Get analysis for a specific row
  const getRowAnalysis = useCallback((rowIndex: number): RowAnalysis | null => {
    return rowRangeAnalysis?.analysis?.[rowIndex] ?? null
  }, [rowRangeAnalysis])

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

  // Handle row click to toggle inclusion in range
  const handleRowClick = (rowIndex: number, event: React.MouseEvent) => {
    if (!rowRange) return
    
    // Don't handle click if it was on the drag handle
    if ((event.target as HTMLElement).closest('[data-drag-handle]')) return

    const inRange = isRowInRange(rowIndex)
    
    if (event.shiftKey) {
      // Shift+click: set end row (extend/shrink from current start)
      onRowRangeChange({
        startRow: Math.min(rowRange.startRow, rowIndex),
        endRow: Math.max(rowRange.startRow, rowIndex)
      })
    } else if (inRange) {
      // Click inside range: move the CLOSEST boundary to this row
      const distToStart = Math.abs(rowIndex - rowRange.startRow)
      const distToEnd = Math.abs(rowIndex - rowRange.endRow)
      
      if (distToStart <= distToEnd) {
        // Closer to start - move start to this row
        onRowRangeChange({ startRow: rowIndex, endRow: rowRange.endRow })
      } else {
        // Closer to end - move end to this row
        onRowRangeChange({ startRow: rowRange.startRow, endRow: rowIndex })
      }
    } else {
      // Click outside range: expand range to include this row
      if (rowIndex < rowRange.startRow) {
        onRowRangeChange({ startRow: rowIndex, endRow: rowRange.endRow })
      } else if (rowIndex > rowRange.endRow) {
        onRowRangeChange({ startRow: rowRange.startRow, endRow: rowIndex })
      }
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

  // Drag handle mouse down - start dragging
  // Event handlers are defined inside to capture fresh values via refs
  const handleDragStart = (type: 'start' | 'end', event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    // Store in refs for use in event handlers (avoids stale closure issues)
    dragTypeRef.current = type
    dragRowRef.current = type === 'start' ? rowRange?.startRow ?? 0 : rowRange?.endRow ?? 0
    
    setIsDragging(type)
    setDragPreviewRow(dragRowRef.current)
    
    // Capture current rowRange to use in handlers
    const currentRange = rowRange
    
    // Define handlers inside to capture current state
    const onMove = (e: MouseEvent) => {
      // Find the row element under the mouse
      const tableBody = document.querySelector('.spreadsheet-tbody')
      if (!tableBody) return
      
      const rows = tableBody.querySelectorAll('tr')
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          dragRowRef.current = i
          setDragPreviewRow(i)
          break
        }
      }
    }
    
    const onUp = () => {
      const finalRow = dragRowRef.current
      const dragType = dragTypeRef.current
      
      if (dragType && finalRow !== null && currentRange) {
        if (dragType === 'start') {
          onRowRangeChange({
            startRow: Math.min(finalRow, currentRange.endRow),
            endRow: currentRange.endRow
          })
        } else {
          onRowRangeChange({
            startRow: currentRange.startRow,
            endRow: Math.max(finalRow, currentRange.startRow)
          })
        }
      }
      
      // Cleanup
      setIsDragging(null)
      setDragPreviewRow(null)
      dragTypeRef.current = null
      dragRowRef.current = null
      
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Keyboard shortcuts for row range adjustment
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if our container or a child has focus
      if (!containerRef.current?.contains(document.activeElement) && 
          document.activeElement !== containerRef.current) {
        return
      }
      
      if (!rowRange) return
      
      // Ignore if typing in an input
      if ((event.target as HTMLElement).tagName === 'INPUT') return
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          if (event.shiftKey) {
            // Shift+Up: Move end row up
            if (rowRange.endRow > rowRange.startRow) {
              onRowRangeChange({ startRow: rowRange.startRow, endRow: rowRange.endRow - 1 })
            }
          } else {
            // Up: Move start row up
            if (rowRange.startRow > 0) {
              onRowRangeChange({ startRow: rowRange.startRow - 1, endRow: rowRange.endRow })
            }
          }
          break
        case 'ArrowDown':
          event.preventDefault()
          if (event.shiftKey) {
            // Shift+Down: Move end row down
            if (rowRange.endRow < data.rows.length - 1) {
              onRowRangeChange({ startRow: rowRange.startRow, endRow: rowRange.endRow + 1 })
            }
          } else {
            // Down: Move start row down
            if (rowRange.startRow < rowRange.endRow) {
              onRowRangeChange({ startRow: rowRange.startRow + 1, endRow: rowRange.endRow })
            }
          }
          break
        case 'r':
        case 'R':
          // R: Reset to auto-detected range
          if (!event.ctrlKey && !event.metaKey && onResetRowRange) {
            event.preventDefault()
            onResetRowRange()
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [rowRange, data.rows.length, onRowRangeChange, onResetRowRange])

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col h-full outline-none" 
      tabIndex={0}
      title="Use arrow keys to adjust selection (Shift for end row)"
    >
      {/* Legend and Row Range Controls */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        {/* Legend - columns and row classifications */}
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: BORDER_COLORS.category }} />
            <span style={{ color: 'var(--text-secondary)' }}>Category</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: BORDER_COLORS.amount }} />
            <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] px-1 rounded font-bold" style={{ background: 'rgb(107, 114, 128)', color: 'white' }}>H</span>
            <span style={{ color: 'var(--text-muted)' }}>Header</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] px-1 rounded font-bold" style={{ background: 'rgb(239, 68, 68)', color: 'white' }}>T</span>
            <span style={{ color: 'var(--text-muted)' }}>Total</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] px-1 rounded font-bold" style={{ background: 'rgb(249, 115, 22)', color: 'white' }}>C</span>
            <span style={{ color: 'var(--text-muted)' }}>Closing</span>
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
            <span 
              className="px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(22, 163, 74)' }}
            >
              {rowRange.endRow - rowRange.startRow + 1} rows
            </span>
            {onResetRowRange && (
              <button
                onClick={onResetRowRange}
                className="px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
                style={{
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)'
                }}
                title="Reset row selection to auto-detected range (R)"
              >
                Reset
              </button>
            )}
            {/* Keyboard shortcut hint - ? icon with tooltip */}
            <div className="relative group">
              <button
                type="button"
                className="w-4 h-4 rounded-full text-[10px] font-medium flex items-center justify-center"
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)'
                }}
                title="Keyboard shortcuts"
              >
                ?
              </button>
              {/* Expandable tooltip on hover */}
              <div 
                className="absolute bottom-full right-0 mb-1 px-2 py-1.5 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{ 
                  background: 'var(--bg-primary)', 
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</div>
                <div>↑↓ &nbsp;Adjust start row</div>
                <div>⇧↑↓ Adjust end row</div>
                <div>R &nbsp;&nbsp;&nbsp;Reset selection</div>
              </div>
            </div>
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
                
                // Get header cell style (index 0 in styles array)
                const headerStyle = data.styles?.[0]?.[index]
                
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
                    className="px-2 py-1.5 text-left cursor-pointer select-none whitespace-nowrap"
                    style={{ 
                      background: headerBg,
                      color: 'var(--text-primary)',
                      borderBottom: `2px solid ${borderColor}`,
                      borderRight: headerStyle?.borderRight ? '1px solid var(--border)' : undefined,
                      minWidth: '80px',
                      maxWidth: '150px',
                      fontWeight: headerStyle?.bold ? 700 : 500
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
          <tbody className="spreadsheet-tbody">
            {displayRows.map((row, rowIndex) => {
              const inRange = isRowInRange(rowIndex)
              const analysis = getRowAnalysis(rowIndex)
              const classification = analysis?.classification ?? 'unknown'
              const badge = CLASSIFICATION_BADGES[classification]
              const isStartRow = rowRange && rowIndex === rowRange.startRow
              const isEndRow = rowRange && rowIndex === rowRange.endRow
              
              // Row styling based on classification
              const isExcluded = classification === 'header' || classification === 'total' || classification === 'closing'
              const rowOpacity = isExcluded && !inRange ? 0.5 : 1
              
              // Build detailed tooltip
              const tooltipParts = [`Row ${rowIndex}: ${classification}`]
              if (analysis) {
                tooltipParts.push(`Confidence: ${analysis.confidence}%`)
                const signals = []
                if (analysis.signals.hasHeaderKeyword) signals.push('header keyword')
                if (analysis.signals.hasTotalKeyword) signals.push('total keyword')
                if (analysis.signals.hasClosingKeyword) signals.push('closing cost keyword')
                if (analysis.signals.isBold) signals.push('bold text')
                if (analysis.signals.amountMatchesSum) signals.push('amount = running total')
                if (signals.length > 0) tooltipParts.push(`Signals: ${signals.join(', ')}`)
              }
              tooltipParts.push(inRange ? 'Click to adjust range' : 'Click to include')
              
              return (
                <tr
                  key={rowIndex}
                  className="hover:brightness-95 cursor-pointer transition-opacity duration-150"
                  onClick={(e) => handleRowClick(rowIndex, e)}
                  title={tooltipParts.join('\n')}
                  style={{ opacity: rowOpacity }}
                >
                  {/* Row number cell with drag handle and classification badge */}
                  <td
                    className="px-1 py-1 font-mono sticky left-0 select-none group"
                    style={{
                      background: isDragging && dragPreviewRow === rowIndex 
                        ? 'rgba(59, 130, 246, 0.3)'
                        : inRange ? 'rgba(250, 204, 21, 0.4)' 
                        : isExcluded ? 'rgba(156, 163, 175, 0.15)' : 'var(--bg-secondary)',
                      color: inRange ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderRight: '1px solid var(--border)',
                      borderLeft: (isStartRow || isEndRow) ? '3px solid var(--accent)' : undefined,
                      fontWeight: inRange ? 600 : 400,
                      minWidth: '65px',
                      cursor: (isStartRow || isEndRow) ? 'ns-resize' : 'pointer'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {/* Drag handle for start/end rows */}
                      {(isStartRow || isEndRow) && (
                        <span
                          data-drag-handle
                          className="cursor-ns-resize opacity-40 group-hover:opacity-100 transition-opacity text-[10px]"
                          onMouseDown={(e) => handleDragStart(isStartRow ? 'start' : 'end', e)}
                          title={isStartRow ? 'Drag to adjust start row' : 'Drag to adjust end row'}
                          style={{ color: 'var(--accent)' }}
                        >
                          ≡
                        </span>
                      )}
                      <span className="text-[10px]">{rowIndex}</span>
                      {badge && (
                        <span
                          className="text-[8px] px-1 rounded font-bold ml-auto"
                          style={{
                            background: badge.color,
                            color: 'white'
                          }}
                          title={classification}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </td>
                  {data.headers.map((_, colIndex) => {
                    const value = row[colIndex]
                    const cellBg = getCellBackground(colIndex, rowIndex)
                    
                    // Get cell style (data row 0 = styles index 1, etc.)
                    const cellStyle = data.styles?.[rowIndex + 1]?.[colIndex]
                    
                    return (
                      <td
                        key={colIndex}
                        className="px-2 py-1 truncate"
                        style={{ 
                          background: cellBg,
                          color: 'var(--text-secondary)',
                          borderBottom: cellStyle?.borderBottom ? '1px solid var(--border)' : '1px solid var(--border-subtle)',
                          borderTop: cellStyle?.borderTop ? '1px solid var(--border)' : undefined,
                          borderRight: cellStyle?.borderRight ? '1px solid var(--border)' : undefined,
                          borderLeft: cellStyle?.borderLeft ? '1px solid var(--border)' : undefined,
                          maxWidth: '150px',
                          fontWeight: cellStyle?.bold ? 600 : 400
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