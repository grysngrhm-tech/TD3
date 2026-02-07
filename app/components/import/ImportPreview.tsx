'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { FileUploader } from './FileUploader'
import { SheetSelector } from './SheetSelector'
import { SpreadsheetViewer } from '../ui/SpreadsheetViewer'
import { LoadingSpinner } from '../ui/LoadingSpinner'
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
import { findBestBudgetMatch } from '@/lib/fuzzyMatching'
import type { Budget, DrawRequest, DrawRequestLine } from '@/types/custom'

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

// Result type for budget imports
export type BudgetImportResult = {
  importedCount: number
}

type ImportPreviewProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (result?: string | BudgetImportResult) => void  // drawId for draws, BudgetImportResult for budgets
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

// API routes that proxy n8n webhook calls (avoids CORS issues)
const BUDGET_WEBHOOK_URL = '/api/n8n/budget-import'
const DRAW_WEBHOOK_URL = '/api/n8n/draw-process'

// Exaggerated task messages for the processing animation
const PROCESSING_TASKS = [
  "Parsing your spreadsheet with laser focus...",
  "Waking up the construction cost oracle...",
  "Teaching AI about lumber and drywall...",
  "Cross-referencing against sacred NAHB codes...",
  "Validating every dollar and cent carefully...",
  "Matching categories with surgical precision...",
  "Double-checking the math one more time...",
  "Applying the finishing touches with care...",
]

export function ImportPreview({ isOpen, onClose, onSuccess, importType, preselectedProjectId, preselectedBuilderId, initialFile }: ImportPreviewProps) {
  const DEFAULT_PREVIEW_ROWS = 100
  const MAX_AUTO_PREVIEW_ROWS = 2000

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
  const [importSuccess, setImportSuccess] = useState(false) // Track success state for UI feedback
  const [importedCount, setImportedCount] = useState<number | null>(null) // Track actual items imported from N8N
  const [processingMessage, setProcessingMessage] = useState<string>('') // Contextual processing message
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null) // Countdown timer for processing
  const [initialCountdown, setInitialCountdown] = useState<number | null>(null) // Track initial total for progress calculation
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

  // Preview row rendering limit (adaptive based on sheet size)
  const [maxRowsToDisplay, setMaxRowsToDisplay] = useState<number>(DEFAULT_PREVIEW_ROWS)
  const [userOverrodeMaxRows, setUserOverrodeMaxRows] = useState(false)
  
  // Track if user has manually adjusted the row range (to preserve their selection)
  const [userOverrodeRowRange, setUserOverrodeRowRange] = useState(false)
  
  // Budget replacement state (for budget imports)
  const [deleteExistingBudget, setDeleteExistingBudget] = useState(false)
  const [existingBudgetCount, setExistingBudgetCount] = useState<number>(0)
  
  // Protected budgets - budgets with funded/pending_wire draws that cannot be deleted
  type ProtectedBudget = {
    id: string
    category: string | null
    builder_category_raw: string | null
    funded_amount: number
  }
  const [protectedBudgets, setProtectedBudgets] = useState<ProtectedBudget[]>([])

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
  }, [isOpen, initialFile, initialFileProcessed, file, handleFileSelect])

  // Adapt preview row count to the sheet size so long budgets are visible/editable.
  useEffect(() => {
    if (!data) {
      setMaxRowsToDisplay(DEFAULT_PREVIEW_ROWS)
      setUserOverrodeMaxRows(false)
      return
    }

    // If the user already clicked "show all", don't shrink the view until sheet changes.
    if (userOverrodeMaxRows) return

    const totalRows = data.rows?.length || 0
    const nextMax = Math.min(Math.max(DEFAULT_PREVIEW_ROWS, totalRows), MAX_AUTO_PREVIEW_ROWS)
    setMaxRowsToDisplay(nextMax)
  }, [data, userOverrodeMaxRows])

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
      setProtectedBudgets([])
    }
  }, [selectedProjectId, importType, checkExistingBudget])

  // Countdown timer effect - decrements every second while importing
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return
    
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev === null || prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [countdownSeconds])
  
  // Auto-fetch next draw number when project is selected (for draw imports)
  useEffect(() => {
    if (selectedProjectId && importType === 'draw') {
      fetchNextDrawNumber(selectedProjectId)
    }
  }, [selectedProjectId, importType])
  
  const fetchNextDrawNumber = async (projectId: string) => {
    try {
      const { data } = await supabase
        .from('draw_requests')
        .select('draw_number')
        .eq('project_id', projectId)
        .order('draw_number', { ascending: false })
        .limit(1)
        .single()
      
      setDrawNumber((data?.draw_number || 0) + 1)
    } catch {
      // No existing draws, start at 1
      setDrawNumber(1)
    }
  }
  
  const checkExistingBudget = useCallback(async (projectId: string) => {
    try {
      // Get total budget count
      const { count, error } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
      
      if (error) throw error
      setExistingBudgetCount(count || 0)
      
      // Check for protected budgets (those with funded or pending_wire draws)
      // We need to find budgets that have draw_request_lines linked to funded/pending_wire draw_requests
      const { data: budgetsWithDraws, error: protectedError } = await supabase
        .from('budgets')
        .select(`
          id,
          category,
          builder_category_raw,
          draw_request_lines (
            amount_requested,
            draw_requests!inner (
              status
            )
          )
        `)
        .eq('project_id', projectId)
      
      if (protectedError) {
        console.error('Failed to check protected budgets:', protectedError)
        setProtectedBudgets([])
        return
      }
      
      // Type definition for the query result
      type BudgetWithDrawLines = {
        id: string
        category: string | null
        builder_category_raw: string | null
        draw_request_lines: Array<{
          amount_requested: number
          draw_requests: { status: string } | null
        }>
      }
      
      // Filter to budgets that have at least one funded or pending_wire draw
      const protected_: ProtectedBudget[] = []
      for (const budget of (budgetsWithDraws as BudgetWithDrawLines[] | null) || []) {
        const fundedLines = (budget.draw_request_lines || []).filter((line) => {
          const status = line.draw_requests?.status
          return status === 'funded' || status === 'pending_wire'
        })
        
        if (fundedLines.length > 0) {
          const totalFunded = fundedLines.reduce((sum: number, line) => 
            sum + (line.amount_requested || 0), 0
          )
          protected_.push({
            id: budget.id,
            category: budget.category,
            builder_category_raw: budget.builder_category_raw,
            funded_amount: totalFunded
          })
        }
      }
      
      setProtectedBudgets(protected_)
      console.log('[Budget Import] Found', protected_.length, 'protected budgets with funded draws')
      
    } catch (err) {
      console.error('Failed to check existing budget:', err)
      setExistingBudgetCount(0)
      setProtectedBudgets([])
    }
  }, [])

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
    // Reset user override since this is a new sheet
    setUserOverrodeRowRange(false)
    
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
        // Only re-detect row boundaries if user hasn't manually adjusted them
        if (!userOverrodeRowRange) {
          const newAnalysis = detectRowBoundariesWithAnalysis(data.rows, updated, data.styles)
          setRowRangeAnalysis(newAnalysis)
          const newStats = calculateImportStats(data.rows, updated, newAnalysis)
          setStats(newStats)
        } else {
          // Preserve user's row selection, just recalculate stats with current range
          const newStats = calculateImportStats(data.rows, updated, rowRangeAnalysis)
          setStats(newStats)
        }
      }
      return updated
    })
  }, [data, userOverrodeRowRange, rowRangeAnalysis])

  // Handle row range changes from the spreadsheet viewer
  const handleRowRangeChange = useCallback((newRange: RowRange) => {
    // Mark that user has manually adjusted the row range
    setUserOverrodeRowRange(true)
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
    // Clear the user override flag since they're explicitly resetting
    setUserOverrodeRowRange(false)
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
    
    // Track created draw ID for callback (draw imports only)
    let createdDrawId: string | undefined = undefined
    // Track imported count for callback (budget imports only)
    let budgetImportedCount: number | undefined = undefined
    
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
        
        // 1. Fetch existing budgets for this project to match against
        const { data: budgetsRaw, error: budgetsError } = await supabase
          .from('budgets')
          .select('*')
          .eq('project_id', selectedProjectId)
        const budgets = (budgetsRaw || []) as Budget[]

        if (budgetsError) {
          console.error('Failed to fetch budgets:', budgetsError)
        }
        
        // Calculate total amount
        const totalAmount = amountValues.reduce((sum, amt) => sum + amt, 0)
        
        // 2. Create draw_request in Supabase
        const { data: newDrawRaw, error: drawError } = await supabase
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
        const newDraw = newDrawRaw as DrawRequest

        // Store draw ID for redirect after success
        createdDrawId = newDraw.id
        
        // 3. Match draw categories to BUILDER categories (builder_category_raw) from budgets
        // Uses fuzzy matching to handle typos, word order differences, and minor variations
        const drawLinesData = categoryValues.map((category, i) => {
          // Use fuzzy matching with 0.6 threshold to find best budget match
          const matchResult = findBestBudgetMatch(category, budgets, 0.6)
          const matchedBudget = matchResult?.budget
          
          // Generate flags based on matching results
          const flags: string[] = []
          if (!matchedBudget) {
            flags.push('NO_BUDGET_MATCH')
          } else if (matchedBudget && amountValues[i] > (matchedBudget.remaining_amount || 0)) {
            flags.push('OVER_BUDGET')
          }
          
          return {
            draw_request_id: newDraw.id,
            budget_id: matchedBudget?.id || null,
            amount_requested: amountValues[i],
            flags: flags.length > 0 ? JSON.stringify(flags) : null,
            // Store original category for reference (in notes) - include match score if partial match
            notes: !matchedBudget 
              ? `Original category: ${category}` 
              : (matchResult?.score && matchResult.score < 1.0 ? `Fuzzy matched (${Math.round(matchResult.score * 100)}%): ${category}` : null)
          }
        })
        
        // 4. Insert draw_request_lines with proper budget_id
        const { data: createdLinesRaw, error: linesError } = await supabase
          .from('draw_request_lines')
          .insert(drawLinesData)
          .select()
        const createdLines = (createdLinesRaw || []) as DrawRequestLine[]

        if (linesError) {
          console.error('Failed to create draw lines:', linesError)
          // Don't throw - draw was created, lines can be added later
        }
        
        // 5. Upload invoices via server-side API (if any)
        if (invoiceFiles.length > 0) {
          const formData = new FormData()
          formData.append('projectId', selectedProjectId)
          formData.append('drawRequestId', newDraw.id)
          
          for (const file of invoiceFiles) {
            formData.append('files', file)
          }
          
          try {
            const uploadResponse = await fetch('/api/invoices/upload', {
              method: 'POST',
              body: formData
            })
            
            const uploadResult = await uploadResponse.json()
            
            if (!uploadResponse.ok) {
              console.error('Invoice upload failed:', uploadResult.error)
            } else if (uploadResult.failed > 0) {
              console.warn('Some invoice uploads failed:', uploadResult.errors)
            }
          } catch (uploadErr) {
            console.error('Invoice upload error:', uploadErr)
            // Don't throw - draw was created, invoices can be added later
          }
        }
        
        // 6. Call N8N webhook AFTER lines are created with enriched payload for AI invoice matching
        const webhookUrl = DRAW_WEBHOOK_URL
        if (webhookUrl && createdLines && createdLines.length > 0) {
          try {
            // Build enriched line data with NAHB categories for AI context
            const enrichedLines = createdLines.map((line, i) => {
              const matchedBudget = budgets?.find(b => b.id === line.budget_id)
              return {
                lineId: line.id,
                builderCategory: categoryValues[i], // Original from spreadsheet
                nahbCategory: matchedBudget?.nahb_category || null,
                nahbSubcategory: matchedBudget?.nahb_subcategory || null,
                costCode: matchedBudget?.cost_code || null,
                budgetAmount: matchedBudget?.current_amount || 0,
                remainingAmount: matchedBudget?.remaining_amount || 0,
                amountRequested: line.amount_requested
              }
            })
            
            // N8N gets full context for smarter invoice matching
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                drawRequestId: newDraw.id,
                projectId: selectedProjectId,
                lines: enrichedLines,
                invoiceCount: invoiceFiles.length
              })
            })
          } catch (n8nError) {
            console.warn('N8N processing failed, draw created successfully:', n8nError)
          }
        }
        
      } else {
        // === BUDGET IMPORT: Use API route that proxies to n8n ===
        const webhookUrl = BUDGET_WEBHOOK_URL

        console.log('[Budget Import] Using API route:', webhookUrl)
        
        // Delete existing budget if checkbox is checked (excluding protected budgets)
        if (deleteExistingBudget && existingBudgetCount > 0) {
          // Get IDs of protected budgets that should NOT be deleted
          const protectedBudgetIds = protectedBudgets.map(b => b.id)
          
          if (protectedBudgetIds.length > 0) {
            // Delete only unprotected budgets
            console.log('[Budget Import] Preserving', protectedBudgetIds.length, 'protected budgets with funded draws')
            const { error: deleteError } = await supabase
              .from('budgets')
              .delete()
              .eq('project_id', selectedProjectId)
              .not('id', 'in', `(${protectedBudgetIds.join(',')})`)
            
            if (deleteError) {
              setError('Failed to delete existing budget: ' + deleteError.message)
              setImporting(false)
              return
            }
          } else {
            // No protected budgets, delete all
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
        }
        
        const exportData = prepareColumnExport(data, mappings, importType, {
          projectId: selectedProjectId,
          fileName: file.name,
          rowRange: rowRangeAnalysis ? { startRow: rowRangeAnalysis.startRow, endRow: rowRangeAnalysis.endRow } : undefined
        })
        
        // Count categories being sent for user feedback - use actual export data count (includes $0 budgets)
        const categoryCount = exportData.columns.category.values.length
        setProcessingMessage(`Classifying ${categoryCount} categories with AI...`)
        
        // Estimate processing time: ~1.1 sec per category, rounded up to nearest 10 seconds
        // Ensure minimum 10 seconds even for small imports
        const estimatedSeconds = Math.max(10, Math.ceil((categoryCount * 1.1) / 10) * 10)
        setCountdownSeconds(estimatedSeconds)
        setInitialCountdown(estimatedSeconds)
        
        console.log('[Budget Import] Sending', categoryCount, 'categories to N8N for project:', selectedProjectId)
        console.log('[Budget Import] Estimated processing time:', estimatedSeconds, 'seconds')
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exportData)
        })
        
        console.log('[Budget Import] N8N response status:', response.status)
        
        // Read and validate the response body from N8N
        const responseText = await response.text()
        const contentType = response.headers.get('content-type') || ''
        let n8nResult: { success?: boolean; imported?: number; message?: string; error?: string } = {}
        
        // n8n webhooks may return an empty body (200) even when the workflow runs asynchronously.
        // Treat empty 2xx responses as "accepted" to avoid false-negative failures in the UI.
        if (!responseText || responseText.trim().length === 0) {
          if (!response.ok) {
            throw new Error(`N8N webhook error (${response.status}) with empty response body`)
          }
          n8nResult = { success: true, message: 'Accepted by n8n (empty response body)' }
          console.log('[Budget Import] N8N returned empty body; treating as accepted')
        } else {
          try {
            n8nResult = JSON.parse(responseText)
            console.log('[Budget Import] N8N response:', n8nResult)
          } catch (parseError) {
            console.error('[Budget Import] Failed to parse N8N response as JSON:', responseText.substring(0, 500))
            throw new Error(
              `Invalid response from N8N webhook. Expected JSON but got (${response.status}, ${contentType || 'unknown content-type'}): ${responseText.substring(0, 100)}...`
            )
          }
        }
        
        // Check the success field from N8N
        if (!response.ok || n8nResult.success === false) {
          const errorMsg = n8nResult.error || n8nResult.message || `Import failed (${response.status})`
          console.error('[Budget Import] N8N returned error:', errorMsg)
          throw new Error(errorMsg)
        }
        
        // Store the imported count for display and callback
        if (n8nResult.imported !== undefined) {
          budgetImportedCount = n8nResult.imported
          setImportedCount(budgetImportedCount)
          console.log('[Budget Import] Successfully imported', budgetImportedCount, 'budget items')
        }
        
        // Smart merge: Handle duplicates between new imports and protected budgets
        // This prevents duplicate budget lines when protected categories match newly imported ones
        if (protectedBudgets.length > 0 && deleteExistingBudget) {
          console.log('[Budget Import] Checking for duplicate categories with protected budgets...')
          
          // Fetch all current budgets for this project
          const { data: allBudgets, error: fetchError } = await supabase
            .from('budgets')
            .select('id, nahb_category, nahb_subcategory, category, builder_category_raw, current_amount, original_amount')
            .eq('project_id', selectedProjectId)
          
          if (!fetchError && allBudgets) {
            // Group budgets by NAHB category + subcategory to find duplicates
            const budgetsByCategory: Record<string, typeof allBudgets> = {}
            for (const budget of allBudgets) {
              const key = `${budget.nahb_category || ''}::${budget.nahb_subcategory || ''}`
              if (!budgetsByCategory[key]) budgetsByCategory[key] = []
              budgetsByCategory[key].push(budget)
            }
            
            // Find categories with duplicates (more than one budget line)
            const protectedIds = new Set(protectedBudgets.map(b => b.id))
            for (const [key, budgets] of Object.entries(budgetsByCategory)) {
              if (budgets.length <= 1) continue
              
              // Check if one is protected and others are new
              const protectedInGroup = budgets.filter(b => protectedIds.has(b.id))
              const newInGroup = budgets.filter(b => !protectedIds.has(b.id))
              
              if (protectedInGroup.length > 0 && newInGroup.length > 0) {
                // Merge: sum new amounts into protected budget, then delete the new ones
                const totalNewAmount = newInGroup.reduce((sum, b) => sum + (b.current_amount || 0), 0)
                const protectedBudget = protectedInGroup[0]
                
                console.log(`[Budget Import] Merging ${newInGroup.length} new budget(s) into protected category "${key}"`)
                
                // Update the protected budget with combined amount
                await supabase
                  .from('budgets')
                  .update({ 
                    current_amount: (protectedBudget.current_amount || 0) + totalNewAmount,
                    original_amount: (protectedBudget.original_amount || 0) + totalNewAmount
                  })
                  .eq('id', protectedBudget.id)
                
                // Delete the duplicate new budgets
                for (const newBudget of newInGroup) {
                  await supabase
                    .from('budgets')
                    .delete()
                    .eq('id', newBudget.id)
                }
                
                // Adjust the imported count
                budgetImportedCount = Math.max(0, (budgetImportedCount || 0) - newInGroup.length)
              }
            }
            
            setImportedCount(budgetImportedCount)
          }
        }
      }
      
      // Success - show confirmation before closing
      // N8N has now confirmed the budget was successfully imported to Supabase.
      
      setProcessingMessage('') // Clear processing message
      setCountdownSeconds(null) // Clear countdown
      setInitialCountdown(null) // Clear initial countdown
      setImporting(false)
      setImportSuccess(true)
      
      // Show success state so user sees clear feedback with imported count
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Close modal - the useEffect cleanup will handle state reset
      onClose()
      
      // Pass appropriate result based on import type
      if (importType === 'draw') {
        onSuccess?.(createdDrawId)
      } else {
        // For budget imports, pass the imported count
        onSuccess?.(budgetImportedCount !== undefined ? { importedCount: budgetImportedCount } : undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setProcessingMessage('') // Clear processing message on error
      setCountdownSeconds(null) // Clear countdown on error
      setInitialCountdown(null) // Clear initial countdown on error
      setImporting(false) // Only reset on error, success path closes modal
    }
  }, [data, file, mappings, importType, selectedProjectId, drawNumber, invoiceFiles, rowRangeAnalysis, deleteExistingBudget, existingBudgetCount, protectedBudgets, onClose, onSuccess])

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setWorkbookInfo(null)
    setSelectedSheet('')
    setData(null)
    setMappings([])
    setStats(null)
    setRowRangeAnalysis(null)
    setUserOverrodeRowRange(false)
    setError(null)
    setImporting(false)
    setImportSuccess(false)
    setImportedCount(null)
    setProcessingMessage('')
    setCountdownSeconds(null)
    setInitialCountdown(null)
    setSelectedBuilderId('')
    setProjects([])
    setSelectedProjectId('')
    setDrawNumber(1)
    setProtectedBudgets([])
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
                className="fixed z-50 inset-3 rounded-ios flex flex-col overflow-hidden bg-background-secondary"
              >
            {/* Compact Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <Dialog.Title className="text-base font-semibold text-text-primary">
                  {importType === 'budget' ? 'Import Budget' : 'Import Draw'}
                </Dialog.Title>
                {step === 'preview' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-glow text-accent">
                    {detectedCount} columns detected
                  </span>
                )}
              </div>
              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-ios-xs flex items-center justify-center hover:bg-[var(--bg-hover)]">
                  <svg className="w-4 h-4 text-text-muted"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <LoadingSpinner size="md" />
                        <span className="ml-2 text-sm text-text-secondary">Processing...</span>
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
                    {/* Context Bar - read-only display */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b text-xs border-border-subtle bg-background-card">
                      <span className="text-text-muted">
                        {importType === 'budget' ? 'Importing budget for:' : 'Importing draw for:'}
                      </span>
                      <span className="font-medium text-text-primary">
                        {selectedProject?.builder?.company_name || builders.find(b => b.id === selectedBuilderId)?.company_name || '—'} 
                        {' — '}
                        {selectedProject?.project_code || selectedProject?.name || '—'}
                      </span>
                      {importType === 'draw' && (
                        <span 
                          className="px-2 py-0.5 rounded-full font-medium bg-accent-glow text-accent"
                        >
                          Draw #{drawNumber}
                        </span>
                      )}
                      
                      {/* Replace existing budget checkbox - only for budget imports with existing items */}
                      {importType === 'budget' && existingBudgetCount > 0 && (
                        <>
                          <div className="w-px h-4 ml-auto" style={{ background: 'var(--border)' }} />
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deleteExistingBudget}
                              onChange={(e) => setDeleteExistingBudget(e.target.checked)}
                              className="rounded"
                              style={{ accentColor: 'var(--warning)' }}
                            />
                            <span className="text-warning">
                              Replace existing budget ({existingBudgetCount} items)
                            </span>
                          </label>
                        </>
                      )}
                    </div>
                    
                    {/* Protected budgets warning - shows when replace is checked and there are protected budgets */}
                    {importType === 'budget' && deleteExistingBudget && protectedBudgets.length > 0 && (
                      <div 
                        className="px-4 py-3 border-b flex items-start gap-3"
                        style={{ 
                          borderColor: 'var(--border-subtle)', 
                          background: 'rgba(245, 158, 11, 0.1)'
                        }}
                      >
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-warning">
                            {protectedBudgets.length} budget categor{protectedBudgets.length === 1 ? 'y' : 'ies'} cannot be replaced
                          </p>
                          <p className="text-xs mt-1 text-text-muted">
                            These categories have funded draws and will be preserved:
                          </p>
                          <ul className="mt-2 space-y-1">
                            {protectedBudgets.slice(0, 5).map((budget) => (
                              <li key={budget.id} className="text-xs flex items-center gap-2 text-text-secondary">
                                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                                <span className="font-medium">{budget.builder_category_raw || budget.category || 'Unknown'}</span>
                                <span className="text-text-muted">
                                  (${budget.funded_amount.toLocaleString()} funded)
                                </span>
                              </li>
                            ))}
                            {protectedBudgets.length > 5 && (
                              <li className="text-xs text-text-muted">
                                ...and {protectedBudgets.length - 5} more
                              </li>
                            )}
                          </ul>
                          <p className="text-xs mt-2 text-text-muted">
                            New budget data will be added alongside these protected categories.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Compact Info Bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-xs">
                      {/* File + Sheet */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-4 h-4 flex-shrink-0 text-text-muted"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate text-text-secondary">{file?.name}</span>
                        <button onClick={handleReset} className="text-xs font-medium text-accent">Change</button>
                        
                        {workbookInfo && workbookInfo.sheets.length > 1 && (
                          <>
                            <div className="w-px h-4 mx-2" style={{ background: 'var(--border)' }} />
                            <span className="text-text-muted">Sheet:</span>
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
                          <span className="text-text-muted">Items:</span>
                          <span className="font-medium text-text-primary">{formatNumber(stats?.rowsWithCategory || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-text-muted">Total:</span>
                          <span className="font-medium text-accent">{formatCurrency(stats?.totalAmount || 0)}</span>
                        </div>
                        {(stats?.emptyCategories || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-warning">⚠ {stats?.emptyCategories} empty</span>
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
                          <LoadingSpinner size="md" />
                        </div>
                      ) : (
                        <SpreadsheetViewer
                          data={data}
                          mappings={mappings}
                          rowRangeAnalysis={rowRangeAnalysis}
                          onMappingChange={handleMappingChange}
                          onRowRangeChange={handleRowRangeChange}
                          onResetRowRange={handleResetRowRange}
                          maxRows={maxRowsToDisplay}
                        />
                      )}
                    </div>

                    {/* If we cap large sheets, offer an explicit "show all" escape hatch */}
                    {!loading && data && data.rows.length > maxRowsToDisplay && (
                      <div className="mx-4 mb-2 flex items-center justify-between gap-3 text-xs text-text-muted">
                        <span>
                          Showing {maxRowsToDisplay.toLocaleString()} of {data.rows.length.toLocaleString()} rows
                        </span>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            setMaxRowsToDisplay(data.rows.length)
                            setUserOverrodeMaxRows(true)
                          }}
                        >
                          Show all rows (may be slow)
                        </button>
                      </div>
                    )}

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
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
                {/* Left side: Back button or spacer when importing */}
                {importing && initialCountdown !== null && countdownSeconds !== null ? (
                  <div className="flex items-center justify-end gap-3 flex-1 mr-4">
                    {/* Animated task message - pushed right, next to timer */}
                    <div className="min-w-0 max-w-[280px]">
                      <AnimatePresence mode="wait">
                        {(() => {
                          // Calculate bounded task index once for both key and content
                          const taskIndex = initialCountdown > 0
                            ? Math.min(
                                Math.max(0, Math.floor(((initialCountdown - countdownSeconds) / initialCountdown) * PROCESSING_TASKS.length)),
                                PROCESSING_TASKS.length - 1
                              )
                            : 0
                          return (
                            <motion.div
                              key={taskIndex}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                              className="text-xs text-right text-text-muted"
                              
                            >
                              {PROCESSING_TASKS[taskIndex]}
                            </motion.div>
                          )
                        })()}
                      </AnimatePresence>
                    </div>
                    
                    {/* Countdown timer pill */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
                      style={{ 
                        background: 'var(--accent-muted)',
                        border: '1px solid var(--accent-400)'
                      }}
                    >
                      <div 
                        className="w-1.5 h-1.5 rounded-full animate-pulse bg-accent"
                      />
                      <span 
                        className="text-xs font-mono font-medium tabular-nums text-accent-700"
                        
                      >
                        {countdownSeconds > 0 
                          ? `${Math.floor(countdownSeconds / 60)}:${String(countdownSeconds % 60).padStart(2, '0')}`
                          : 'Finishing...'
                        }
                      </span>
                    </motion.div>
                  </div>
                ) : (
                  <button 
                    onClick={handleReset} 
                    disabled={importing || importSuccess} 
                    className="px-4 py-2 text-sm rounded-ios-sm transition-colors bg-background-card text-text-secondary"
                  >
                    Back
                  </button>
                )}
                
                {/* Submit button */}
                <button
                  onClick={handleImport}
                  disabled={!canImport || importing || importSuccess}
                  className="px-4 py-2 text-sm rounded-ios-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all shrink-0"
                  style={{ 
                    background: importSuccess ? 'var(--success)' : canImport ? 'var(--accent)' : 'var(--bg-card)', 
                    color: importSuccess || canImport ? 'white' : 'var(--text-muted)' 
                  }}
                >
                  {importing ? (
                    <>
                      <LoadingSpinner size="xs" variant="white" />
                      Processing...
                    </>
                  ) : importSuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {importedCount !== null ? `Imported ${importedCount} items` : 'Submitted Successfully'}
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