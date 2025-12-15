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
  detectRowBoundariesWithAnalysis,
  calculateImportStats,
  prepareColumnExport,
  fileToBase64
} from '@/lib/spreadsheet'
import type { SpreadsheetData, ColumnMapping, WorkbookInfo, Invoice, RowRange, RowRangeWithAnalysis, RowAnalysis } from '@/lib/spreadsheet'
import { supabase } from '@/lib/supabase'

type Builder = {
  id: string
  company_name: string
}

type Project = {
  id: string
  name: string
  project_code: string | null
  builder_id: string | null
  builder?: Builder | null
}

type ImportPreviewProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void  // Optional callback after successful webhook submission
  importType: 'budget' | 'draw'
  preselectedProjectId?: string  // Pre-select a project when importing from project page
  preselectedBuilderId?: string  // Pre-select a builder
  initialFile?: File | null  // Pre-selected file to process immediately
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

export function ImportPreview({ isOpen, onClose, onSuccess, importType, preselectedProjectId, preselectedBuilderId, initialFile }: ImportPreviewProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [initialFileProcessed, setInitialFileProcessed] = useState(false)
  const [workbookInfo, setWorkbookInfo] = useState<WorkbookInfo | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [data, setData] = useState<SpreadsheetData | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Builder and project selection state
  const [builders, setBuilders] = useState<Builder[]>([])
  const [selectedBuilderId, setSelectedBuilderId] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [drawNumber, setDrawNumber] = useState<number>(1)
  const [loadingProjects, setLoadingProjects] = useState(false)
  
  // Invoice files state (for draw imports)
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([])
  
  // Row range state with analysis for filtering which rows to import
  const [rowRangeAnalysis, setRowRangeAnalysis] = useState<RowRangeWithAnalysis | null>(null)
  
  // Budget replacement state (for budget imports)
  const [deleteExistingBudget, setDeleteExistingBudget] = useState(false)
  const [existingBudgetCount, setExistingBudgetCount] = useState<number>(0)

  // Fetch builders when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBuilders()
    } else {
      handleReset()
      setInitialFileProcessed(false)
    }
  }, [isOpen])

  // Process initial file when modal opens with a pre-selected file
  useEffect(() => {
    if (isOpen && initialFile && !initialFileProcessed && !file) {
      setInitialFileProcessed(true)
      handleFileSelect(initialFile)
    }
  }, [isOpen, initialFile, initialFileProcessed, file])

  // Set preselected builder after builders are loaded
  useEffect(() => {
    if (preselectedBuilderId && builders.length > 0 && !selectedBuilderId) {
      const exists = builders.some(b => b.id === preselectedBuilderId)
      if (exists) {
        setSelectedBuilderId(preselectedBuilderId)
      }
    }
  }, [preselectedBuilderId, builders, selectedBuilderId])

  // Load projects when builder changes
  useEffect(() => {
    if (selectedBuilderId) {
      fetchProjectsForBuilder(selectedBuilderId)
    } else {
      setProjects([])
      setSelectedProjectId('')
    }
  }, [selectedBuilderId])

  // Set preselected project after projects are loaded
  useEffect(() => {
    if (preselectedProjectId && projects.length > 0 && !selectedProjectId) {
      const exists = projects.some(p => p.id === preselectedProjectId)
      if (exists) {
        setSelectedProjectId(preselectedProjectId)
      }
    }
  }, [preselectedProjectId, projects, selectedProjectId])
  
  // Check for existing budget when project is selected (for budget imports)
  useEffect(() => {
    if (selectedProjectId && importType === 'budget') {
      checkExistingBudget(selectedProjectId)
    } else {
      setExistingBudgetCount(0)
      setDeleteExistingBudget(false)
    }
  }, [selectedProjectId, importType])
  
  const checkExistingBudget = async (projectId: string) => {
    try {
      const { count, error } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
      
      if (error) throw error
      setExistingBudgetCount(count || 0)
    } catch (err) {
      console.error('Failed to check existing budget:', err)
      setExistingBudgetCount(0)
    }
  }
  
  const fetchBuilders = async () => {
    setLoadingProjects(true)
    try {
      // Fetch builders that have at least one non-historic project
      const { data: buildersData, error: buildersError } = await supabase
        .from('builders')
        .select('id, company_name')
        .order('company_name')
      
      if (buildersError) throw buildersError
      
      // Filter to only builders with pending or active projects
      const { data: activeProjects } = await supabase
        .from('projects')
        .select('builder_id')
        .in('lifecycle_stage', ['pending', 'active'])
      
      const builderIdsWithProjects = new Set(activeProjects?.map(p => p.builder_id) || [])
      const filteredBuilders = (buildersData || []).filter(b => builderIdsWithProjects.has(b.id))
      
      setBuilders(filteredBuilders)
    } catch (err) {
      console.error('Failed to fetch builders:', err)
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchProjectsForBuilder = async (builderId: string) => {
    setLoadingProjects(true)
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, project_code, builder_id, builder:builders(id, company_name)')
        .eq('builder_id', builderId)
        .in('lifecycle_stage', ['pending', 'active'])
        .order('project_code', { ascending: true })
      
      if (projectsError) throw projectsError
      setProjects((projectsData as Project[]) || [])
      setSelectedProjectId('') // Reset project selection when builder changes
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
      
      // Detect row boundaries with full analysis (pass styles for bold detection)
      const detectedAnalysis = detectRowBoundariesWithAnalysis(parsedData.rows, detectedMappings, parsedData.styles)
      setRowRangeAnalysis(detectedAnalysis)
      
      // Calculate stats with row range
      const importStats = calculateImportStats(parsedData.rows, detectedMappings, detectedAnalysis)
      
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
      
      // Detect row boundaries with full analysis for the new sheet
      const detectedAnalysis = detectRowBoundariesWithAnalysis(parsedData.rows, detectedMappings, parsedData.styles)
      setRowRangeAnalysis(detectedAnalysis)
      
      const importStats = calculateImportStats(parsedData.rows, detectedMappings, detectedAnalysis)
      
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
      // For 'category' and 'amount', only one column can have that mapping
      // Clear the previous column with this mapping before setting the new one
      const updated = prev.map(m => {
        if (m.columnIndex === columnIndex) {
          // This is the column being changed - apply new mapping
          return { ...m, mappedTo: newMapping, confidence: 1 }
        } else if (newMapping === 'category' || newMapping === 'amount') {
          // If another column already has this mapping, clear it
          if (m.mappedTo === newMapping) {
            return { ...m, mappedTo: 'ignore' as const, confidence: 0 }
          }
        }
        return m
      })
      if (data) {
        // Re-detect row boundaries with new mappings
        const newAnalysis = detectRowBoundariesWithAnalysis(data.rows, updated, data.styles)
        setRowRangeAnalysis(newAnalysis)
        const newStats = calculateImportStats(data.rows, updated, newAnalysis)
        setStats(newStats)
      }
      return updated
    })
  }, [data])

  // Handle row range changes from the spreadsheet viewer
  const handleRowRangeChange = useCallback((newRange: RowRange) => {
    // Update the range while preserving existing analysis
    setRowRangeAnalysis(prev => prev ? {
      ...prev,
      startRow: newRange.startRow,
      endRow: newRange.endRow
    } : null)
    if (data) {
      const newStats = calculateImportStats(data.rows, mappings, newRange)
      setStats(newStats)
    }
  }, [data, mappings])

  // Reset row range to auto-detected values
  const handleResetRowRange = useCallback(() => {
    if (data) {
      const detectedAnalysis = detectRowBoundariesWithAnalysis(data.rows, mappings, data.styles)
      setRowRangeAnalysis(detectedAnalysis)
      const newStats = calculateImportStats(data.rows, mappings, detectedAnalysis)
      setStats(newStats)
    }
  }, [data, mappings])

  const handleImport = useCallback(async () => {
    if (!data || !file || !selectedProjectId) return
    
    setImporting(true)
    setError(null)
    
    try {
      // Get mapped columns
      const categoryCol = mappings.find(m => m.mappedTo === 'category')
      const amountCol = mappings.find(m => m.mappedTo === 'amount')
      
      if (!categoryCol || !amountCol) {
        throw new Error('Category and amount columns must be mapped')
      }
      
      // Extract values from mapped columns
      const startRow = rowRangeAnalysis?.startRow ?? 0
      const endRow = rowRangeAnalysis?.endRow ?? data.rows.length - 1
      
      const categoryValues: string[] = []
      const amountValues: number[] = []
      
      for (let i = startRow; i <= endRow && i < data.rows.length; i++) {
        const row = data.rows[i]
        const catValue = row[categoryCol.columnIndex]
        const amtValue = row[amountCol.columnIndex]
        
        const category = catValue ? String(catValue).trim() : ''
        const amount = typeof amtValue === 'number' ? amtValue : 
          parseFloat(String(amtValue || '0').replace(/[$,]/g, '')) || 0
        
        // Only include rows with valid category and non-zero amount
        if (category && amount > 0) {
          categoryValues.push(category)
          amountValues.push(amount)
        }
      }
      
      if (importType === 'draw') {
        // === DRAW IMPORT: Create directly in Supabase ===
        
        // Calculate total amount
        const totalAmount = amountValues.reduce((sum, amt) => sum + amt, 0)
        
        // 1. Create draw_request in Supabase
        const { data: newDraw, error: drawError } = await supabase
          .from('draw_requests')
          .insert({
            project_id: selectedProjectId,
            draw_number: drawNumber,
            total_amount: totalAmount,
            status: 'review',
            request_date: new Date().toISOString(),
            notes: `Imported from ${file.name}`
          })
          .select()
          .single()
        
        if (drawError) {
          throw new Error('Failed to create draw request: ' + drawError.message)
        }
        
        // 2. Create draw_request_lines
        const drawLines = categoryValues.map((category, i) => ({
          draw_request_id: newDraw.id,
          category: category,
          amount_requested: amountValues[i]
        }))
        
        const { error: linesError } = await supabase
          .from('draw_request_lines')
          .insert(drawLines)
        
        if (linesError) {
          console.error('Failed to create draw lines:', linesError)
          // Don't throw - draw was created, lines can be added later
        }
        
        // 3. Upload invoices to Supabase Storage (if any)
        for (const invoiceFile of invoiceFiles) {
          const filePath = `invoices/${selectedProjectId}/${newDraw.id}/${crypto.randomUUID()}-${invoiceFile.name}`
          
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, invoiceFile)
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(filePath)
            
            // Create invoice record
            await supabase.from('invoices').insert({
              project_id: selectedProjectId,
              draw_request_id: newDraw.id,
              vendor_name: 'Pending Review',
              amount: 0,
              file_path: filePath,
              file_url: urlData.publicUrl,
              status: 'pending'
            })
          }
        }
        
        // 4. Optionally call N8N webhook for AI processing (can fail gracefully)
        const webhookUrl = DRAW_WEBHOOK_URL
        if (webhookUrl) {
          try {
            const exportData = prepareColumnExport(data, mappings, importType, {
              projectId: selectedProjectId,
              drawNumber,
              fileName: file.name,
              rowRange: rowRangeAnalysis ? { startRow: rowRangeAnalysis.startRow, endRow: rowRangeAnalysis.endRow } : undefined
            })
            
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...exportData, drawRequestId: newDraw.id })
            })
          } catch (n8nError) {
            console.warn('N8N processing failed, draw created successfully:', n8nError)
          }
        }
        
      } else {
        // === BUDGET IMPORT: Use existing webhook flow ===
        const webhookUrl = BUDGET_WEBHOOK_URL
        
        if (!webhookUrl) {
          setError('Budget import webhook URL not configured. Set NEXT_PUBLIC_N8N_BUDGET_WEBHOOK in environment.')
          setImporting(false)
          return
        }
        
        // Delete existing budget if checkbox is checked
        if (deleteExistingBudget && existingBudgetCount > 0) {
          const { error: deleteError } = await supabase
            .from('budgets')
            .delete()
            .eq('project_id', selectedProjectId)
          
          if (deleteError) {
            setError('Failed to delete existing budget: ' + deleteError.message)
            setImporting(false)
            return
          }
        }
        
        const exportData = prepareColumnExport(data, mappings, importType, {
          projectId: selectedProjectId,
          fileName: file.name,
          rowRange: rowRangeAnalysis ? { startRow: rowRangeAnalysis.startRow, endRow: rowRangeAnalysis.endRow } : undefined
        })
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exportData)
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Webhook failed (${response.status}): ${errorText}`)
        }
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
  }, [data, file, mappings, importType, selectedProjectId, drawNumber, invoiceFiles, rowRangeAnalysis, deleteExistingBudget, existingBudgetCount, onClose, onSuccess])

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setWorkbookInfo(null)
    setSelectedSheet('')
    setData(null)
    setMappings([])
    setStats(null)
    setRowRangeAnalysis(null)
    setError(null)
    setImporting(false)
    setSelectedBuilderId('')
    setProjects([])
    setSelectedProjectId('')
    setDrawNumber(1)
    setInvoiceFiles([])
    setDeleteExistingBudget(false)
    setExistingBudgetCount(0)
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
                    {/* Builder & Project Selection Bar */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Builder:</span>
                      <select
                        value={selectedBuilderId}
                        onChange={(e) => setSelectedBuilderId(e.target.value)}
                        className="px-2 py-1.5 rounded text-xs min-w-[150px]"
                        style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          border: `1px solid ${!selectedBuilderId ? 'var(--warning)' : 'var(--border)'}`
                        }}
                        disabled={loadingProjects}
                      >
                        <option value="">Select builder...</option>
                        {builders.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.company_name}
                          </option>
                        ))}
                      </select>
                      
                      {selectedBuilderId && (
                        <>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Project:</span>
                          <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="px-2 py-1.5 rounded text-xs min-w-[180px]"
                            style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              border: `1px solid ${!hasProjectSelected ? 'var(--warning)' : 'var(--border)'}`
                            }}
                            disabled={loadingProjects || projects.length === 0}
                          >
                            <option value="">Select project...</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.project_code || p.name}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      
                      {/* Replace existing budget checkbox - only for budget imports with existing items */}
                      {importType === 'budget' && existingBudgetCount > 0 && (
                        <>
                          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deleteExistingBudget}
                              onChange={(e) => setDeleteExistingBudget(e.target.checked)}
                              className="rounded"
                              style={{ accentColor: 'var(--warning)' }}
                            />
                            <span style={{ color: 'var(--warning)' }}>
                              Replace existing budget ({existingBudgetCount} items)
                            </span>
                          </label>
                        </>
                      )}
                      
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
                          rowRangeAnalysis={rowRangeAnalysis}
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
