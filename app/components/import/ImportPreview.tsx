'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { FileUploader } from './FileUploader'
import { SpreadsheetViewer } from '../ui/SpreadsheetViewer'
import { parseSpreadsheet, detectColumnMappings, extractMappedData } from '@/lib/spreadsheet'
import type { SpreadsheetData, ColumnMapping } from '@/lib/spreadsheet'

type ImportPreviewProps = {
  isOpen: boolean
  onClose: () => void
  onImport: (data: {
    categories: string[]
    budgetAmounts: number[]
    drawAmounts: { drawNumber: number; amounts: number[] }[]
  }) => void
  importType: 'budget' | 'draw'
}

export function ImportPreview({ isOpen, onClose, onImport, importType }: ImportPreviewProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<SpreadsheetData | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    setError(null)
    
    try {
      const parsedData = await parseSpreadsheet(selectedFile)
      const detectedMappings = detectColumnMappings(parsedData.headers)
      
      setData(parsedData)
      setMappings(detectedMappings)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMappingChange = useCallback((
    columnIndex: number, 
    newMapping: ColumnMapping['mappedTo'],
    drawNumber?: number
  ) => {
    setMappings(prev => prev.map(m => 
      m.columnIndex === columnIndex 
        ? { ...m, mappedTo: newMapping, drawNumber, confidence: 1 }
        : m
    ))
  }, [])

  const handleImport = useCallback(() => {
    if (!data) return
    
    const extracted = extractMappedData(data.rows, mappings)
    onImport(extracted)
    handleReset()
    onClose()
  }, [data, mappings, onImport, onClose])

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setData(null)
    setMappings([])
    setError(null)
  }

  const hasCategoryMapping = mappings.some(m => m.mappedTo === 'category')
  const hasAmountMapping = importType === 'budget' 
    ? mappings.some(m => m.mappedTo === 'budget_amount')
    : mappings.some(m => m.mappedTo === 'draw_amount')
  const canImport = hasCategoryMapping && hasAmountMapping

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-ios flex flex-col"
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
            <div className="flex-1 overflow-y-auto p-6">
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
                      <p className="mt-4 text-center" style={{ color: 'var(--error)' }}>{error}</p>
                    )}
                  </motion.div>
                )}

                {step === 'preview' && data && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* File info */}
                    <div className="flex items-center gap-3 p-3 rounded-ios-sm" style={{ background: 'var(--bg-card)' }}>
                      <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{file?.name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {data.rows.length} rows · Sheet: {data.sheetName}
                        </p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="text-sm font-medium"
                        style={{ color: 'var(--accent)' }}
                      >
                        Change file
                      </button>
                    </div>

                    {/* AI Detection Banner */}
                    <div className="flex items-center gap-3 p-4 rounded-ios-sm" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
                      <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          AI detected {mappings.filter(m => m.mappedTo && m.mappedTo !== 'ignore').length} columns
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Click any column header to change its mapping
                        </p>
                      </div>
                    </div>

                    {/* Validation Messages */}
                    {!canImport && (
                      <div className="p-3 rounded-ios-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}>
                        <p className="text-sm" style={{ color: 'var(--error)' }}>
                          Please map at least one column to "Category" and one to "{importType === 'budget' ? 'Budget' : 'Draw'}"
                        </p>
                      </div>
                    )}

                    {/* Spreadsheet Preview */}
                    <SpreadsheetViewer
                      data={data}
                      mappings={mappings}
                      onMappingChange={handleMappingChange}
                      maxRows={15}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step === 'preview' && (
              <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={handleReset}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canImport}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canImport ? 'Import Data' : 'Map Required Columns'}
                </button>
              </div>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
