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
  detectRowBoundaries,
  calculateImportStats,
  prepareColumnExport,
  fileToBase64
} from '@/lib/spreadsheet'
import type { SpreadsheetData, ColumnMapping, WorkbookInfo, Invoice, RowRange } from '@/lib/spreadsheet'
import { supabase } from '@/lib/supabase'

type Project = {
  id: string
  name: string
  project_code: string | null
  builder_name: string | null
}

type ImportPreviewProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void  // Optional callback after successful webhook submission
  importType: 'budget' | 'draw'
  preselectedProjectId?: string  // Pre-select a project when importing from project page
}

type ImportStats = {
  totalRows: number
  rowsWithCategory: number
  totalAmount: number
  emptyCategories: number
  zeroAmountRows: number
}

// Get webhook URLs from environment
const BUDGET_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_BUDGET_WEBHOOK || ''
const DRAW_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_DRAW_WEBHOOK || ''

export function ImportPreview({ isOpen, onClose, onSuccess, importType, preselectedProjectId }: ImportPreviewProps) {
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
  
  // Project selection state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [drawNumber, setDrawNumber] = useState<number>(1)
  const [loadingProjects, setLoadingProjects] = useState(false)
  
  // Invoice files state (for draw imports)
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([])
  
  // Row range state for filtering which rows to import
  const [rowRange, setRowRange] = useState<RowRange | null>(null)

  // Fetch projects when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects()
    } else {
      handleReset()
    }
  }, [isOpen])

  // Set preselected project after projects are loaded
  useEffect(() => {
    if (preselectedProjectId && projects.length > 0 && !selectedProjectId) {
      const exists = projects.some(p => p.id === preselectedProjectId)
      if (exists) {
        setSelectedProjectId(preselectedProjectId)
      }
    }
  }, [preselectedProjectId, projects, selectedProjectId])
  
  const fetchProjects = async () => {
    setLoadingProjects(true)
    try {
      // Fetch projects that are not historic (pending or active)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, project_code, builder_name, lifecycle_stage')
        .in('lifecycle_stage', ['pending', 'active'])
        .order('builder_name', { ascending: true })
        .order('project_code', { ascending: true })
      
      if (projectsError) throw projectsError
      setProjects(projectsData || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoadingProjects(false)
    }
  }

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
      
      // Detect row boundaries for import
      const detectedRowRange = detectRowBoundaries(parsedData.rows, detectedMappings)
      setRowRange(detectedRowRange)
      
      // Calculate stats with row range
      const importStats = calculateImportStats(parsedData.rows, detectedMappings, detectedRowRange)
      
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
      
      // Detect row boundaries for the new sheet
      const detectedRowRange = detectRowBoundaries(parsedData.rows, detectedMappings)
      setRowRange(detectedRowRange)
      
      const importStats = calculateImportStats(parsedData.rows, detectedMappings, detectedRowRange)
      
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
    newMapping: ColumnMapping['mappedTo']
  ) => {
    setMappings(prev => {
      const updated = prev.map(m => 
        m.columnIndex === columnIndex 
          ? { ...m, mappedTo: newMapping, confidence: 1 }
          : m
      )
      if (data) {
        // Re-detect row boundaries with new mappings
        const newRowRange = detectRowBoundaries(data.rows, updated)
        setRowRange(newRowRange)
        const newStats = calculateImportStats(data.rows, updated, newRowRange)
        setStats(newStats)
      }
      return updated
    })
  }, [data])

  // Handle row range changes from the spreadsheet viewer
  const handleRowRangeChange = useCallback((newRange: RowRange) => {
    setRowRange(newRange)
    if (data) {
      const newStats = calculateImportStats(data.rows, mappings, newRange)
      setStats(newStats)
    }
  }, [data, mappings])

  // Reset row range to auto-detected values
  const handleResetRowRange = useCallback(() => {
    if (data) {
      const detectedRowRange = detectRowBoundaries(data.rows, mappings)
      setRowRange(detectedRowRange)
      const newStats = calculateImportStats(data.rows, mappings, detectedRowRange)
      setStats(newStats)
    }
  }, [data, mappings])

  const handleImport = useCallback(async () => {
    if (!data || !file || !selectedProjectId) return
    
    const webhookUrl = importType === 'budget' ? BUDGET_WEBHOOK_URL : DRAW_WEBHOOK_URL
    
    // Check if webhook URL is configured
    if (!webhookUrl) {
      setError(`${importType === 'budget' ? 'Budget' : 'Draw'} import webhook URL not configured. Set NEXT_PUBLIC_N8N_${importType.toUpperCase()}_WEBHOOK in environment.`)
      return
    }
    
    setImporting(true)
    setError(null)
    
    try {
      // Convert invoice files to base64 for draw imports
      let invoices: Invoice[] | undefined
      if (importType === 'draw' && invoiceFiles.length > 0) {
        invoices = await Promise.all(
          invoiceFiles.map(async (invoiceFile) => ({
            fileName: invoiceFile.name,
            fileData: await fileToBase64(invoiceFile)
          }))
        )
      }
      
      const exportData = prepareColumnExport(data, mappings, importType, {
        projectId: selectedProjectId,
        drawNumber: importType === 'draw' ? drawNumber : undefined,
        fileName: file.name,
        invoices,
        rowRange: rowRange || undefined
      })
      
      // POST to n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Webhook failed (${response.status}): ${errorText}`)
      }
      
      // Success - close modal and trigger refresh
      handleReset()
      onClose()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [data, file, mappings, importType, selectedProjectId, drawNumber, invoiceFiles, rowRange, onClose, onSuccess])

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setWorkbookInfo(null)
    setSelectedSheet('')
    setData(null)
    setMappings([])
    setStats(null)
    setRowRange(null)
    setError(null)
    setImporting(false)
    setSelectedProjectId('')
    setDrawNumber(1)
    setInvoiceFiles([])
  }

  const hasCategoryMapping = mappings.some(m => m.mappedTo === 'category')
  const hasAmountMapping = mappings.some(m => m.mappedTo === 'amount')
  const hasProjectSelected = selectedProjectId !== ''
  const canImport = hasCategoryMapping && hasAmountMapping && hasProjectSelected
  const detectedCount = mappings.filter(m => m.mappedTo && m.mappedTo !== 'ignore').length
  
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
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
                    {/* Project Selection Bar */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Project:</span>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="px-2 py-1.5 rounded text-xs min-w-[200px]"
                        style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          border: `1px solid ${!hasProjectSelected ? 'var(--warning)' : 'var(--border)'}`
                        }}
                        disabled={loadingProjects}
                      >
                        <option value="">Select a project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.project_code || p.name} {p.builder_name ? `(${p.builder_name})` : ''}
                          </option>
                        ))}
                      </select>
                      
                      {importType === 'draw' && (
                        <>
                          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Draw #:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={drawNumber}
                            onChange={(e) => setDrawNumber(parseInt(e.target.value) || 1)}
                            className="w-14 px-2 py-1.5 rounded text-xs text-center"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                          />
                          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Invoices:</span>
                          <label className="px-2 py-1.5 rounded text-xs cursor-pointer hover:opacity-80" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            <input
                              type="file"
                              accept=".pdf"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || [])
                                // Limit: max 10 files, 5MB each
                                const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024).slice(0, 10 - invoiceFiles.length)
                                setInvoiceFiles(prev => [...prev, ...validFiles].slice(0, 10))
                                e.target.value = '' // Reset input
                              }}
                            />
                            + Add PDFs
                          </label>
                          {invoiceFiles.length > 0 && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {invoiceFiles.length} file{invoiceFiles.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </>
                      )}
                      
                      {selectedProject && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                          {selectedProject.builder_name}
                        </span>
                      )}
                    </div>
                    
                    {/* Invoice Files List (for draw imports) */}
                    {importType === 'draw' && invoiceFiles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {invoiceFiles.map((invoiceFile, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-1 px-2 py-1 rounded"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                          >
                            <span className="truncate max-w-[150px]" style={{ color: 'var(--text-secondary)' }}>
                              {invoiceFile.name}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              ({(invoiceFile.size / 1024).toFixed(0)}KB)
                            </span>
                            <button
                              onClick={() => setInvoiceFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--bg-hover)]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setInvoiceFiles([])}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--error)' }}
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    
                    {/* Compact Info Bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
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
                          <span style={{ color: 'var(--text-muted)' }}>Total:</span>
                          <span className="font-medium" style={{ color: 'var(--accent)' }}>{formatCurrency(stats?.totalAmount || 0)}</span>
                        </div>
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
                        ⚠ {!hasProjectSelected 
                          ? 'Select a project to import to' 
                          : 'Map at least one Category and one Amount column'}
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
                          rowRange={rowRange}
                          onMappingChange={handleMappingChange}
                          onRowRangeChange={handleRowRangeChange}
                          onResetRowRange={handleResetRowRange}
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
                      Submitting...
                    </>
                  ) : (
                    <>Submit {formatNumber(stats?.rowsWithCategory || 0)} Items</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
