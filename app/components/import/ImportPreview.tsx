'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as XLSX from 'xlsx'
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
import type { SpreadsheetData, ColumnMapping, SheetInfo, WorkbookInfo } from '@/lib/spreadsheet'

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      handleReset()
    }
  }, [isOpen])

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    setError(null)
    
    try {
      const info = await getWorkbookInfo(selectedFile)
      setWorkbookInfo(info)
      
      // Auto-select sheet with most data
      const mainSheet = info.sheets.reduce((best, current) => 
        current.rowCount > best.rowCount ? current : best
      )
      
      setSelectedSheet(mainSheet.name)
      
      // Parse the selected sheet
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
      // Recalculate stats with new mappings
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 inset-4 rounded-ios flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <Dialog.Title className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {importType === 'budget' ? 'Import Budget' : 'Import Draw'}
                </Dialog.Title>
                <Dialog.Description className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {step === 'upload' 
                    ? 'Upload an Excel or CSV file to import' 
                    : 'Review detected columns and adjust if needed'}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="w-10 h-10 rounded-ios-sm flex items-center justify-center hover:bg-[var(--bg-hover)]">
                  <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {step === 'upload' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <FileUploader onFileSelect={handleFileSelect} />
                    
                    {loading && (
                      <div className="flex items-center justify-center mt-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
                        <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Processing file...</span>
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-4 p-4 rounded-ios-sm text-center" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                        <p style={{ color: 'var(--error)' }}>{error}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 'preview' && data && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4 h-full min-h-0"
                  >
                    {/* File info + Sheet selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                      {/* File info */}
                      <div className="flex items-center gap-3 p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
                        <svg className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file?.name}</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {workbookInfo?.sheets.length || 1} sheet{(workbookInfo?.sheets.length || 1) > 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={handleReset}
                          className="text-sm font-medium flex-shrink-0"
                          style={{ color: 'var(--accent)' }}
                        >
                          Change
                        </button>
                      </div>

                      {/* Sheet selector */}
                      {workbookInfo && workbookInfo.sheets.length > 1 && (
                        <SheetSelector
                          sheets={workbookInfo.sheets}
                          selectedSheet={selectedSheet}
                          onSheetChange={handleSheetChange}
                        />
                      )}
                    </div>

                    {/* AI Detection Banner */}
                    <div className="flex items-center gap-3 p-4 rounded-ios-sm flex-shrink-0" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
                      <svg className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          AI detected {detectedCount} column{detectedCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Click any column header to change its mapping
                        </p>
                      </div>
                    </div>

                    {/* Validation Messages */}
                    {!canImport && (
                      <div className="p-3 rounded-ios-sm flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                        <p className="text-sm" style={{ color: 'var(--error)' }}>
                          Please map at least one column to "Category" and one to "{importType === 'budget' ? 'Budget' : 'Draw'}"
                        </p>
                      </div>
                    )}

                    {/* Import Stats */}
                    {stats && canImport && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
                        <div className="p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
                          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Line Items</p>
                          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {stats.rowsWithCategory}
                          </p>
                        </div>
                        <div className="p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
                          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Budget</p>
                          <p className="text-xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                            {formatCurrency(stats.totalBudget)}
                          </p>
                        </div>
                        <div className="p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
                          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Draw Columns</p>
                          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {stats.drawColumns}
                          </p>
                        </div>
                        {stats.emptyCategories > 0 && (
                          <div className="p-3 rounded-ios-sm" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)' }}>
                            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--warning)' }}>Skipped</p>
                            <p className="text-xl font-bold mt-1" style={{ color: 'var(--warning)' }}>
                              {stats.emptyCategories}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>empty rows</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Spreadsheet Preview - Fills remaining space */}
                    <div className="flex-1 min-h-0">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)' }} />
                        </div>
                      ) : (
                        <SpreadsheetViewer
                          data={data}
                          mappings={mappings}
                          onMappingChange={handleMappingChange}
                          maxRows={50}
                        />
                      )}
                    </div>

                    {/* Error display */}
                    {error && (
                      <div className="p-4 rounded-ios-sm flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                        <p className="font-medium" style={{ color: 'var(--error)' }}>Import Error</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                        <button
                          onClick={() => setError(null)}
                          className="mt-2 text-sm font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step === 'preview' && (
              <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={handleReset}
                  disabled={importing}
                  className="btn-secondary disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canImport || importing}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                      Importing...
                    </>
                  ) : canImport ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import {stats?.rowsWithCategory || 0} Line Items
                    </>
                  ) : (
                    'Map Required Columns'
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
