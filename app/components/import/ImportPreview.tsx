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

// Get webhook URLs from environment
const BUDGET_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_BUDGET_WEBHOOK || ''
const DRAW_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_DRAW_WEBHOOK || ''

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}

// Fuzzy match scoring function - returns 0-1 score
function fuzzyMatchScore(input: string, target: string): number {
  if (!input || !target) return 0
  
  const a = input.toLowerCase().trim()
  const b = target.toLowerCase().trim()
  
  if (!a || !b) return 0
  
  // Exact match = 1.0
  if (a === b) return 1.0
  
  // One contains the other = 0.9
  if (a.includes(b) || b.includes(a)) return 0.9
  
  // Tokenized word matching - handles "Framing Labor" vs "Framing - Labor" 
  const aWords = a.split(/[\s\-_,&]+/).filter(w => w.length > 1)
  const bWords = b.split(/[\s\-_,&]+/).filter(w => w.length > 1)
  
  if (aWords.length > 0 && bWords.length > 0) {
    // Count words that match or are contained in each other
    const matchedAWords = aWords.filter(aw => 
      bWords.some(bw => bw.includes(aw) || aw.includes(bw) || levenshteinDistance(aw, bw) <= 1)
    )
    const matchedBWords = bWords.filter(bw => 
      aWords.some(aw => aw.includes(bw) || bw.includes(aw) || levenshteinDistance(aw, bw) <= 1)
    )
    
    const wordScore = (matchedAWords.length + matchedBWords.length) / (aWords.length + bWords.length)
    if (wordScore >= 0.5) return 0.65 + (wordScore * 0.25) // Returns 0.65-0.9
  }
  
  // Levenshtein distance for shorter strings (handles typos)
  if (a.length < 30 && b.length < 30) {
    const distance = levenshteinDistance(a, b)
    const maxLen = Math.max(a.length, b.length)
    const similarity = 1 - (distance / maxLen)
    if (similarity >= 0.7) return similarity * 0.8 // Returns 0.56-0.8
  }
  
  return 0
}

// Find best matching budget with score threshold
function findBestBudgetMatch(
  category: string, 
  budgets: { id: string; builder_category_raw: string | null; category: string }[] | null,
  threshold: number = 0.6
): { budget: typeof budgets extends (infer T)[] ? T : never; score: number } | null {
  if (!budgets || budgets.length === 0) return null
  
  let bestMatch: { budget: typeof budgets[0]; score: number } | null = null
  
  for (const b of budgets) {
    const builderScore = fuzzyMatchScore(category, b.builder_category_raw || '')
    const stdScore = fuzzyMatchScore(category, b.category)
    const score = Math.max(builderScore, stdScore)
    
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { budget: b, score }
    }
  }
  
  return bestMatch
}

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
  const [importSuccess, setImportSuccess] = useState(false) // Track success state for UI feedback
  const [importedCount, setImportedCount] = useState<number | null>(null) // Track actual items imported from N8N
  const [processingMessage, setProcessingMessage] = useState<string>('') // Contextual processing message
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
  
  // Track if user has manually adjusted the row range (to preserve their selection)
  const [userOverrodeRowRange, setUserOverrodeRowRange] = useState(false)
  
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
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select('*')
          .eq('project_id', selectedProjectId)
        
        if (budgetsError) {
          console.error('Failed to fetch budgets:', budgetsError)
        }
        
        // Calculate total amount
        const totalAmount = amountValues.reduce((sum, amt) => sum + amt, 0)
        
        // 2. Create draw_request in Supabase
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
        const { data: createdLines, error: linesError } = await supabase
          .from('draw_request_lines')
          .insert(drawLinesData)
          .select()
        
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
        // === BUDGET IMPORT: Use existing webhook flow ===
        const webhookUrl = BUDGET_WEBHOOK_URL
        
        // Validate webhook URL is configured and looks valid
        if (!webhookUrl) {
          setError('Budget import webhook URL not configured. Set NEXT_PUBLIC_N8N_BUDGET_WEBHOOK in environment variables (Vercel dashboard for production).')
          setImporting(false)
          return
        }
        
        if (!webhookUrl.startsWith('http')) {
          console.error('[Budget Import] Invalid webhook URL:', webhookUrl)
          setError('Budget import webhook URL is invalid. It should start with https://')
          setImporting(false)
          return
        }
        
        console.log('[Budget Import] Using webhook URL:', webhookUrl)
        
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
        
        // Count categories being sent for user feedback
        const categoryCount = categoryValues.length
        setProcessingMessage(`Classifying ${categoryCount} categories with AI...`)
        
        console.log('[Budget Import] Sending', categoryCount, 'categories to N8N for project:', selectedProjectId)
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exportData)
        })
        
        console.log('[Budget Import] N8N response status:', response.status)
        
        // Read and validate the response body from N8N
        const responseText = await response.text()
        let n8nResult: { success?: boolean; imported?: number; message?: string; error?: string } = {}
        
        try {
          n8nResult = JSON.parse(responseText)
          console.log('[Budget Import] N8N response:', n8nResult)
        } catch (parseError) {
          // N8N always returns JSON - if we can't parse it, something is wrong
          console.error('[Budget Import] Failed to parse N8N response as JSON:', responseText.substring(0, 500))
          throw new Error(`Invalid response from N8N webhook. Expected JSON but got: ${responseText.substring(0, 100)}...`)
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
      }
      
      // Success - show confirmation before closing
      // N8N has now confirmed the budget was successfully imported to Supabase.
      
      setProcessingMessage('') // Clear processing message
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
      setImporting(false) // Only reset on error, success path closes modal
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
    setUserOverrodeRowRange(false)
    setError(null)
    setImporting(false)
    setImportSuccess(false)
    setImportedCount(null)
    setProcessingMessage('')
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
                    {/* Context Bar - read-only display */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {importType === 'budget' ? 'Importing budget for:' : 'Importing draw for:'}
                      </span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {selectedProject?.builder?.company_name || builders.find(b => b.id === selectedBuilderId)?.company_name || '—'} 
                        {' — '}
                        {selectedProject?.project_code || selectedProject?.name || '—'}
                      </span>
                      {importType === 'draw' && (
                        <span 
                          className="px-2 py-0.5 rounded-full font-medium" 
                          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
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
                            <span style={{ color: 'var(--warning)' }}>
                              Replace existing budget ({existingBudgetCount} items)
                            </span>
                          </label>
                        </>
                      )}
                    </div>
                    
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
                <button onClick={handleReset} disabled={importing || importSuccess} className="px-4 py-2 text-sm rounded-ios-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canImport || importing || importSuccess}
                  className="px-4 py-2 text-sm rounded-ios-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all"
                  style={{ 
                    background: importSuccess ? 'var(--success)' : canImport ? 'var(--accent)' : 'var(--bg-card)', 
                    color: importSuccess || canImport ? 'white' : 'var(--text-muted)' 
                  }}
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent border-white" />
                      {processingMessage || 'Processing...'}
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
