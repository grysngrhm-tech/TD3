'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project, Budget, Builder, DrawRequestInsert } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx-js-style'

type ProjectWithBuilder = Project & {
  builder?: Builder | null
}

type ParsedSpreadsheetData = {
  categories: string[]
  budgetAmounts: number[]
  drawAmounts: number[]
  headers: string[]
}

type UploadedInvoice = {
  id: string
  file: File
  name: string
  size: number
  type: string
}

export default function NewDrawPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProjectId = searchParams.get('project')
  
  const [projects, setProjects] = useState<ProjectWithBuilder[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedProjectData, setSelectedProjectData] = useState<ProjectWithBuilder | null>(null)
  const [nextDrawNumber, setNextDrawNumber] = useState(1)
  
  // Spreadsheet state
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null)
  const [spreadsheetData, setSpreadsheetData] = useState<ParsedSpreadsheetData | null>(null)
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null)
  const [isParsingSpreadsheet, setIsParsingSpreadsheet] = useState(false)
  
  // Invoice state
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedInvoice[]>([])
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (preselectedProjectId && projects.length > 0) {
      setSelectedProject(preselectedProjectId)
    }
  }, [preselectedProjectId, projects])

  useEffect(() => {
    if (selectedProject) {
      loadProjectData()
    }
  }, [selectedProject])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*, builder:builders(*)')
      .eq('lifecycle_stage', 'active')
      .order('name')
    setProjects((data as ProjectWithBuilder[]) || [])
  }

  async function loadProjectData() {
    // Get project with builder
    const project = projects.find(p => p.id === selectedProject)
    setSelectedProjectData(project || null)

    // Load budgets for selected project
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .eq('project_id', selectedProject)
      .order('sort_order')
    setBudgets(budgetData || [])

    // Get next draw number
    const { data: lastDraw } = await supabase
      .from('draw_requests')
      .select('draw_number')
      .eq('project_id', selectedProject)
      .order('draw_number', { ascending: false })
      .limit(1)
      .single()

    setNextDrawNumber((lastDraw?.draw_number || 0) + 1)
  }

  // Spreadsheet parsing
  const parseSpreadsheet = useCallback(async (file: File) => {
    setIsParsingSpreadsheet(true)
    setSpreadsheetError(null)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][]

      if (jsonData.length < 2) {
        throw new Error('Spreadsheet must have at least a header row and one data row')
      }

      const headers = (jsonData[0] as string[]).map(h => String(h || '').toLowerCase().trim())
      
      // Find category column
      const categoryIndex = headers.findIndex(h => 
        h.includes('category') || h.includes('item') || h.includes('description')
      )
      
      // Find budget amount column
      const budgetIndex = headers.findIndex(h => 
        h.includes('budget') || h.includes('original') || h.includes('total')
      )
      
      // Find draw amount column (often a date or "draw" or "request")
      const drawIndex = headers.findIndex(h => 
        h.includes('draw') || h.includes('request') || h.includes('current') || 
        /^\d{1,2}[-\/]\w{3}/.test(h) // Date patterns like "17-Jul"
      )

      if (categoryIndex === -1) {
        throw new Error('Could not find a category column. Please ensure your spreadsheet has a column with "Category", "Item", or "Description"')
      }

      if (drawIndex === -1) {
        throw new Error('Could not find a draw amount column. Please ensure your spreadsheet has a column with draw amounts')
      }

      // Parse data rows
      const categories: string[] = []
      const budgetAmounts: number[] = []
      const drawAmounts: number[] = []

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        const category = String(row[categoryIndex] || '').trim()
        
        if (!category) continue // Skip empty rows

        const budgetAmount = budgetIndex >= 0 ? parseFloat(String(row[budgetIndex] || '0').replace(/[$,]/g, '')) || 0 : 0
        const drawAmount = parseFloat(String(row[drawIndex] || '0').replace(/[$,]/g, '')) || 0

        if (drawAmount > 0) { // Only include rows with draw amounts
          categories.push(category)
          budgetAmounts.push(budgetAmount)
          drawAmounts.push(drawAmount)
        }
      }

      if (categories.length === 0) {
        throw new Error('No draw amounts found in the spreadsheet. Please ensure your draw column contains values greater than 0')
      }

      setSpreadsheetData({
        categories,
        budgetAmounts,
        drawAmounts,
        headers: headers as string[]
      })
    } catch (err) {
      setSpreadsheetError(err instanceof Error ? err.message : 'Failed to parse spreadsheet')
      setSpreadsheetData(null)
    } finally {
      setIsParsingSpreadsheet(false)
    }
  }, [])

  const handleSpreadsheetDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const validExtensions = ['.xlsx', '.xls', '.csv']
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      if (!hasValidExtension) {
        setSpreadsheetError('Please upload an Excel or CSV file')
        return
      }
      setSpreadsheetFile(file)
      parseSpreadsheet(file)
    }
  }, [parseSpreadsheet])

  const handleSpreadsheetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSpreadsheetFile(file)
      parseSpreadsheet(file)
    }
  }, [parseSpreadsheet])

  // Invoice handling
  const handleInvoiceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    addInvoiceFiles(files)
  }, [])

  const handleInvoiceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addInvoiceFiles(files)
  }, [])

  const addInvoiceFiles = (files: File[]) => {
    setInvoiceError(null)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
    
    const newInvoices: UploadedInvoice[] = []
    
    for (const file of files) {
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      if (!validTypes.includes(file.type) && !hasValidExtension) {
        setInvoiceError(`Invalid file type: ${file.name}. Please upload PDF or image files.`)
        continue
      }
      
      if (file.size > 20 * 1024 * 1024) {
        setInvoiceError(`File too large: ${file.name}. Maximum size is 20MB.`)
        continue
      }

      newInvoices.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type
      })
    }

    setInvoiceFiles(prev => [...prev, ...newInvoices])
  }

  const removeInvoice = (id: string) => {
    setInvoiceFiles(prev => prev.filter(inv => inv.id !== id))
  }

  // Process draw request
  const handleProcess = async () => {
    setError('')

    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    if (!spreadsheetData || spreadsheetData.categories.length === 0) {
      setError('Please upload a budget spreadsheet with draw amounts')
      return
    }

    setIsProcessing(true)

    try {
      setProcessingStatus('Creating draw request...')
      
      // Calculate total amount
      const totalAmount = spreadsheetData.drawAmounts.reduce((sum, amt) => sum + amt, 0)

      // Create draw request in 'processing' status
      const drawRequest: DrawRequestInsert = {
        project_id: selectedProject,
        draw_number: nextDrawNumber,
        total_amount: totalAmount,
        status: 'processing',
        request_date: new Date().toISOString(),
        notes: `Uploaded ${spreadsheetFile?.name || 'spreadsheet'} with ${invoiceFiles.length} invoice(s)`
      }

      const { data: newDraw, error: drawError } = await supabase
        .from('draw_requests')
        .insert(drawRequest)
        .select()
        .single()

      if (drawError) throw drawError

      setProcessingStatus('Creating draw lines...')

      // Create draw request lines
      const drawLines = spreadsheetData.categories.map((category, index) => ({
        draw_request_id: newDraw.id,
        amount_requested: spreadsheetData.drawAmounts[index],
        // Try to match to existing budget
        budget_id: budgets.find(b => 
          b.category.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(b.category.toLowerCase())
        )?.id || null,
        flags: null,
        confidence_score: null
      }))

      const { error: linesError } = await supabase
        .from('draw_request_lines')
        .insert(drawLines)

      if (linesError) throw linesError

      setProcessingStatus('Uploading invoices...')

      // Upload invoices to Supabase storage and create records
      for (const invoice of invoiceFiles) {
        const filePath = `invoices/${selectedProject}/${newDraw.id}/${invoice.id}-${invoice.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, invoice.file)

        if (uploadError) {
          console.error('Invoice upload error:', uploadError)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        // Create invoice record
        await supabase.from('invoices').insert({
          project_id: selectedProject,
          draw_request_id: newDraw.id,
          vendor_name: 'Pending AI Match',
          amount: 0,
          file_path: filePath,
          file_url: urlData.publicUrl,
          status: 'pending'
        })
      }

      setProcessingStatus('Sending to AI for processing...')

      // Send to N8N for AI processing
      const n8nPayload = {
        drawRequestId: newDraw.id,
        projectId: selectedProject,
        drawNumber: nextDrawNumber,
        categories: spreadsheetData.categories,
        drawAmounts: spreadsheetData.drawAmounts,
        budgets: budgets.map(b => ({
          id: b.id,
          category: b.category,
          nahbCategory: b.nahb_category,
          nahbSubcategory: b.nahb_subcategory,
          costCode: b.cost_code,
          remaining: b.remaining_amount
        })),
        invoiceCount: invoiceFiles.length
      }

      try {
        const response = await fetch('/api/webhooks/draw-submitted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(n8nPayload)
        })

        if (!response.ok) {
          console.warn('N8N webhook failed, continuing to review page')
        }
      } catch (webhookError) {
        console.warn('N8N webhook error:', webhookError)
      }

      // Update status to review
      await supabase
        .from('draw_requests')
        .update({ status: 'review' })
        .eq('id', newDraw.id)

      setProcessingStatus('Complete! Redirecting...')

      // Redirect to review page
      router.push(`/draws/${newDraw.id}`)

    } catch (err: any) {
      setError(err.message || 'Failed to process draw request')
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalDrawAmount = spreadsheetData?.drawAmounts.reduce((sum, amt) => sum + amt, 0) || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          New Draw Request
        </h1>
        <p style={{ color: 'var(--text-muted)' }} className="mt-1">
          Upload budget spreadsheet with draw amounts and invoices
        </p>
      </div>

      <div className="space-y-6">
        {/* Project Selection */}
        <div className="card p-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Project *
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input w-full"
            required
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code || p.name} - {p.builder?.company_name || 'No Builder'}
              </option>
            ))}
          </select>

          {selectedProjectData && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Builder</span>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selectedProjectData.builder?.company_name || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Loan Amount</span>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(selectedProjectData.loan_amount || 0)}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Draw #</span>
                  <p className="font-medium text-lg" style={{ color: 'var(--accent)' }}>
                    #{nextDrawNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Budget Spreadsheet Upload */}
        {selectedProject && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Budget Spreadsheet
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Upload your budget spreadsheet with a column containing the draw amounts for this request
            </p>

            {!spreadsheetFile ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleSpreadsheetDrop}
                className="drop-zone block cursor-pointer"
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleSpreadsheetChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center py-8">
                  <svg className="w-12 h-12 mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Drop Excel or CSV file here
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    or click to browse
                  </p>
                </div>
              </label>
            ) : (
              <div>
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{spreadsheetFile.name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatFileSize(spreadsheetFile.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSpreadsheetFile(null)
                      setSpreadsheetData(null)
                    }}
                    className="text-sm px-3 py-1 rounded hover:bg-red-100"
                    style={{ color: 'var(--error)' }}
                  >
                    Remove
                  </button>
                </div>

                {isParsingSpreadsheet && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Parsing spreadsheet...</p>
                  </div>
                )}

                {spreadsheetError && (
                  <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <p style={{ color: 'var(--error)' }}>{spreadsheetError}</p>
                  </div>
                )}

                {spreadsheetData && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {spreadsheetData.categories.length} line items found
                      </span>
                      <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        Total: {formatCurrency(totalDrawAmount)}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border-primary)' }}>
                      <table className="w-full text-sm">
                        <thead style={{ background: 'var(--bg-secondary)' }}>
                          <tr>
                            <th className="text-left p-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Category</th>
                            <th className="text-right p-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Draw Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spreadsheetData.categories.map((cat, i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--border-primary)' }}>
                              <td className="p-2" style={{ color: 'var(--text-primary)' }}>{cat}</td>
                              <td className="p-2 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(spreadsheetData.drawAmounts[i])}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Invoice Upload */}
        {selectedProject && spreadsheetData && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Invoice Files
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Upload invoice PDFs or images to be matched with draw line items
            </p>

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleInvoiceDrop}
              className="drop-zone block cursor-pointer"
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInvoiceChange}
                className="hidden"
                multiple
              />
              <div className="flex flex-col items-center py-6">
                <svg className="w-10 h-10 mb-2" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Drop invoice files here
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  PDF, JPG, PNG up to 20MB each
                </p>
              </div>
            </label>

            {invoiceError && (
              <p className="mt-2 text-sm" style={{ color: 'var(--error)' }}>{invoiceError}</p>
            )}

            {invoiceFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <AnimatePresence>
                  {invoiceFiles.map((invoice) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <div className="flex items-center gap-3">
                        {invoice.type === 'application/pdf' ? (
                          <svg className="w-6 h-6" style={{ color: 'var(--error)' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 18a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h1a1.5 1.5 0 010 3H9v.5a.5.5 0 01-.5.5zm6 0a.5.5 0 01-.5-.5v-3a.5.5 0 011 0v1h1a.5.5 0 010 1h-1v1a.5.5 0 01-.5.5z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{invoice.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(invoice.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeInvoice(invoice.id)}
                        className="p-1 rounded hover:bg-red-100"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <p className="text-sm text-center pt-2" style={{ color: 'var(--text-muted)' }}>
                  {invoiceFiles.length} invoice{invoiceFiles.length !== 1 ? 's' : ''} ready to upload
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <p style={{ color: 'var(--error)' }}>{error}</p>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="card p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
            <p className="mt-3 font-medium" style={{ color: 'var(--text-primary)' }}>{processingStatus}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <a href="/draws" className="btn-secondary">
            Cancel
          </a>
          <button
            onClick={handleProcess}
            className="btn-primary"
            disabled={!selectedProject || !spreadsheetData || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Draw Request →'}
          </button>
        </div>
      </div>
    </div>
  )
}
