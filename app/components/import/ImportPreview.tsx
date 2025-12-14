'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { FileUploader } from './FileUploader'
import { SheetSelector } from './SheetSelector'
import { SpreadsheetViewer } from '../ui/SpreadsheetViewer'
import { 
  getWorkbookInfo, 
  parseSheet, 
  detectColumnMappings, 
  extractMappedData,
  calculateImportStats 
} from '@/lib/spreadsheet'
import type { SpreadsheetData, ColumnMapping, WorkbookInfo } from '@/lib/spreadsheet'

type ImportPreviewProps = {
  isOpen: boolean
  onClose: () => void
  onImport: (data: {
    categories: string[]
    budgetAmounts: number[]
    drawAmounts: { drawNumber: number; amounts: number[] }[]
  }) => Promise<void> | void
  importType: 'budget' | 'draw'
}

type ImportStats = {
  totalRows: number
  rowsWithCategory: number
  totalBudget: number
  drawColumns: number
  emptyCategories: number
  zeroBudgetRows: number
}

export function ImportPreview({ isOpen, onClose, onImport, importType }: ImportPreviewProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [workbookInfo, setWorkbookInfo] = useState<WorkbookInfo | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [data, setData] = useState<SpreadsheetData | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) handleReset()
  }, [isOpen])

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    setError(null)
    
    try {
      const info = await getWorkbookInfo(selectedFile)
      setWorkbookInfo(info)
      
      const mainSheet = info.sheets.reduce((best, current) => 
        current.rowCount > best.rowCount ? current : best
      )
      
      setSelectedSheet(mainSheet.name)
      const parsedData = parseSheet(info.workbook, mainSheet.name)
      const detectedMappings = detectColumnMappings(parsedData.headers, parsedData.rows)
      const importStats = calculateImportStats(parsedData.rows, detectedMappings)
      
      setData(parsedData)
      setMappings(detectedMappings)
      setStats(importStats)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSheetChange = useCallback((sheetName: string) => {
    if (!workbookInfo) return
    setSelectedSheet(sheetName)
    setLoading(true)
    
    try {
      const parsedData = parseSheet(workbookInfo.workbook, sheetName)
      const detectedMappings = detectColumnMappings(parsedData.headers, parsedData.rows)
      const importStats = calculateImportStats(parsedData.rows, detectedMappings)
      
      setData(parsedData)
      setMappings(detectedMappings)
      setStats(importStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse sheet')
    } finally {
      setLoading(false)
    }
  }, [workbookInfo])

  const handleMappingChange = useCallback((
    columnIndex: number, 
    newMapping: ColumnMapping['mappedTo'],
    drawNumber?: number
  ) => {
    setMappings(prev => {
      const updated = prev.map(m => 
        m.columnIndex === columnIndex 
          ? { ...m, mappedTo: newMapping, drawNumber, confidence: 1 }
          : m
      )
      if (data) {
        const newStats = calculateImportStats(data.rows, updated)
        setStats(newStats)
      }
      return updated
    })
  }, [data])

  const handleImport = useCallback(async () => {
    if (!data) return
    setImporting(true)
    setError(null)
    
    try {
      const extracted = extractMappedData(data.rows, mappings)
      await onImport(extracted)
      handleReset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [data, mappings, onImport, onClose])

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setWorkbookInfo(null)
    setSelectedSheet('')
    setData(null)
    setMappings([])
    setStats(null)
    setError(null)
    setImporting(false)
  }

  const hasCategoryMapping = mappings.some(m => m.mappedTo === 'category')
  const hasAmountMapping = importType === 'budget' 
    ? mappings.some(m => m.mappedTo === 'budget_amount')
    : mappings.some(m => m.mappedTo === 'draw_amount')
  const canImport = hasCategoryMapping && hasAmountMapping
  const detectedCount = mappings.filter(m => m.mappedTo && m.mappedTo !== 'ignore').length

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overlay"
          />
        </Dialog.Overlay>
        
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed z-50 inset-3 rounded-ios flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Compact Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <Dialog.Title className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {importType === 'budget' ? 'Import Budget' : 'Import Draw'}
                </Dialog.Title>
                {step === 'preview' && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                    {detectedCount} columns detected
                  </span>
                )}
              </div>
              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-ios-xs flex items-center justify-center hover:bg-[var(--bg-hover)]">
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {step === 'upload' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-6"
                  >
                    <FileUploader onFileSelect={handleFileSelect} />
                    
                    {loading && (
                      <div className="flex items-center justify-center mt-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
                        <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Processing...</span>
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-4 p-3 rounded-ios-sm text-center text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                        {error}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 'preview' && data && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* Compact Info Bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                      {/* File + Sheet */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{file?.name}</span>
                        <button onClick={handleReset} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Change</button>
                        
                        {workbookInfo && workbookInfo.sheets.length > 1 && (
                          <>
                            <div className="w-px h-4 mx-2" style={{ background: 'var(--border)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Sheet:</span>
                            <select
                              value={selectedSheet}
                              onChange={(e) => handleSheetChange(e.target.value)}
                              className="px-2 py-1 rounded text-xs"
                              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                            >
                              {workbookInfo.sheets.map(s => (
                                <option key={s.name} value={s.name}>{s.name} ({s.rowCount} rows)</option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>

                      {/* Compact Stats */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span style={{ color: 'var(--text-muted)' }}>Items:</span>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatNumber(stats?.rowsWithCategory || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span style={{ color: 'var(--text-muted)' }}>Budget:</span>
                          <span className="font-medium" style={{ color: 'var(--accent)' }}>{formatCurrency(stats?.totalBudget || 0)}</span>
                        </div>
                        {(stats?.drawColumns || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <span style={{ color: 'var(--text-muted)' }}>Draws:</span>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{stats?.drawColumns}</span>
                          </div>
                        )}
                        {(stats?.emptyCategories || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <span style={{ color: 'var(--warning)' }}>⚠ {stats?.emptyCategories} empty</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Validation Warning */}
                    {!canImport && (
                      <div className="px-4 py-2 text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                        ⚠ Map at least one Category and one {importType === 'budget' ? 'Budget' : 'Draw'} column
                      </div>
                    )}

                    {/* Spreadsheet - Takes most of the space */}
                    <div className="flex-1 min-h-0 p-3">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
                        </div>
                      ) : (
                        <SpreadsheetViewer
                          data={data}
                          mappings={mappings}
                          onMappingChange={handleMappingChange}
                          maxRows={100}
                        />
                      )}
                    </div>

                    {error && (
                      <div className="mx-4 mb-2 p-2 rounded-ios-sm text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                        {error}
                        <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Compact Footer */}
            {step === 'preview' && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={handleReset} disabled={importing} className="px-4 py-2 text-sm rounded-ios-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canImport || importing}
                  className="px-4 py-2 text-sm rounded-ios-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  style={{ background: canImport ? 'var(--accent)' : 'var(--bg-card)', color: canImport ? 'white' : 'var(--text-muted)' }}
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent border-white" />
                      Importing...
                    </>
                  ) : (
                    <>Import {formatNumber(stats?.rowsWithCategory || 0)} Items</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
