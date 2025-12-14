'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { SpreadsheetData, ColumnMapping } from '@/lib/spreadsheet'

type SpreadsheetViewerProps = {
  data: SpreadsheetData
  mappings: ColumnMapping[]
  onMappingChange: (columnIndex: number, newMapping: ColumnMapping['mappedTo'], drawNumber?: number) => void
  maxRows?: number
}

const MAPPING_COLORS: Record<string, string> = {
  category: 'rgba(59, 130, 246, 0.2)', // blue
  budget_amount: 'rgba(34, 197, 94, 0.2)', // green
  draw_amount: 'rgba(168, 85, 247, 0.2)', // purple
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
  maxRows = 20 
}: SpreadsheetViewerProps) {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [showMappingMenu, setShowMappingMenu] = useState(false)

  const displayRows = useMemo(() => {
    return data.rows.slice(0, maxRows)
  }, [data.rows, maxRows])

  const getMappingForColumn = (index: number) => {
    return mappings.find(m => m.columnIndex === index)
  }

  const handleColumnClick = (index: number) => {
    setSelectedColumn(index)
    setShowMappingMenu(true)
  }

  const handleMappingSelect = (mapping: ColumnMapping['mappedTo']) => {
    if (selectedColumn !== null) {
      onMappingChange(selectedColumn, mapping)
      setShowMappingMenu(false)
      setSelectedColumn(null)
    }
  }

  return (
    <div className="relative">
      {/* Column Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(['category', 'budget_amount', 'draw_amount'] as const).map((type) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <div 
              className="w-4 h-4 rounded"
              style={{ background: MAPPING_COLORS[type] }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{MAPPING_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto rounded-ios-sm border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {data.headers.map((header, index) => {
                const mapping = getMappingForColumn(index)
                const bgColor = mapping?.mappedTo ? MAPPING_COLORS[mapping.mappedTo] : 'transparent'
                
                return (
                  <th
                    key={index}
                    onClick={() => handleColumnClick(index)}
                    className="px-3 py-2 text-left font-semibold cursor-pointer transition-all hover:opacity-80"
                    style={{ 
                      background: bgColor,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border)',
                      minWidth: '120px'
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{header}</span>
                      {mapping?.mappedTo && mapping.mappedTo !== 'ignore' && (
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                        >
                          {MAPPING_LABELS[mapping.mappedTo]}
                          {mapping.drawNumber ? ` #${mapping.drawNumber}` : ''}
                        </span>
                      )}
                    </div>
                    {mapping?.confidence && mapping.confidence > 0 && (
                      <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${mapping.confidence * 100}%`,
                            background: 'var(--accent)'
                          }}
                        />
                      </div>
                    )}
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
                  const bgColor = mapping?.mappedTo ? MAPPING_COLORS[mapping.mappedTo] : 'transparent'
                  const value = row[colIndex]
                  
                  return (
                    <td
                      key={colIndex}
                      className="px-3 py-2"
                      style={{ 
                        background: bgColor,
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
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

      {data.rows.length > maxRows && (
        <p className="text-sm mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          Showing {maxRows} of {data.rows.length} rows
        </p>
      )}

      {/* Column Mapping Menu */}
      {showMappingMenu && selectedColumn !== null && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowMappingMenu(false)
              setSelectedColumn(null)
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute z-50 mt-2 p-2 rounded-ios-sm shadow-lg"
            style={{ 
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 0
            }}
          >
            <p className="text-xs font-medium px-3 py-2" style={{ color: 'var(--text-muted)' }}>
              Map "{data.headers[selectedColumn]}" to:
            </p>
            {(['category', 'budget_amount', 'draw_amount', 'ignore'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleMappingSelect(type)}
                className="w-full text-left px-3 py-2 rounded-ios-xs text-sm transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ background: MAPPING_COLORS[type] || 'var(--bg-hover)' }}
                  />
                  {MAPPING_LABELS[type]}
                </div>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
