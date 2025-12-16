'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project, Builder } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { ImportPreview } from '@/app/components/import/ImportPreview'
import { useNavigation } from '@/app/context/NavigationContext'

type ProjectWithBuilder = Project & {
  builder?: Builder | null
}

type UploadedInvoice = {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview: string // Object URL for preview
}

function NewDrawPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setCurrentPageTitle } = useNavigation()
  const preselectedBuilderId = searchParams.get('builder')
  const preselectedProjectId = searchParams.get('project')

  // Register page title
  useEffect(() => {
    setCurrentPageTitle('New Draw Request')
  }, [setCurrentPageTitle])
  
  // Builder and project state
  const [builders, setBuilders] = useState<Builder[]>([])
  const [selectedBuilder, setSelectedBuilder] = useState('')
  const [projects, setProjects] = useState<ProjectWithBuilder[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedProjectData, setSelectedProjectData] = useState<ProjectWithBuilder | null>(null)
  const [nextDrawNumber, setNextDrawNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  
  // Budget file state
  const [budgetFile, setBudgetFile] = useState<File | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  
  // Invoice state
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedInvoice[]>([])
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Load builders on mount
  useEffect(() => {
    loadBuilders()
  }, [])

  // Handle project-only preselection (need to auto-select builder)
  useEffect(() => {
    if (preselectedProjectId && !preselectedBuilderId && builders.length > 0) {
      loadProjectAndSelectBuilder(preselectedProjectId)
    }
  }, [preselectedProjectId, preselectedBuilderId, builders])

  // Pre-select builder from URL param
  useEffect(() => {
    if (preselectedBuilderId && builders.length > 0) {
      setSelectedBuilder(preselectedBuilderId)
    }
  }, [preselectedBuilderId, builders])

  // Load projects when builder changes
  useEffect(() => {
    if (selectedBuilder) {
      loadProjectsForBuilder(selectedBuilder)
    } else {
      setProjects([])
      setSelectedProject('')
    }
  }, [selectedBuilder])

  // Pre-select project from URL param (after projects load)
  useEffect(() => {
    if (preselectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === preselectedProjectId)
      if (project) {
        setSelectedProject(preselectedProjectId)
      }
    }
  }, [preselectedProjectId, projects])

  useEffect(() => {
    if (selectedProject) {
      loadProjectData()
    }
  }, [selectedProject])

  async function loadBuilders() {
    setLoading(true)
    try {
      // Load builders that have at least one active project
      const { data: buildersData } = await supabase
        .from('builders')
        .select('*')
        .order('company_name')
      
      // Filter to only builders with active projects
      const { data: activeProjects } = await supabase
        .from('projects')
        .select('builder_id')
        .eq('lifecycle_stage', 'active')
      
      const builderIdsWithActiveProjects = new Set(
        (activeProjects as { builder_id: string | null }[] || []).map(p => p.builder_id)
      )
      const filteredBuilders = ((buildersData || []) as Builder[]).filter(b => builderIdsWithActiveProjects.has(b.id))
      
      setBuilders(filteredBuilders)
    } finally {
      setLoading(false)
    }
  }

  async function loadProjectAndSelectBuilder(projectId: string) {
    // Fetch the project to get its builder_id
    const { data: project } = await supabase
      .from('projects')
      .select('*, builder:builders(*)')
      .eq('id', projectId)
      .single()
    
    if ((project as ProjectWithBuilder)?.builder_id) {
      setSelectedBuilder((project as ProjectWithBuilder).builder_id!)
    }
  }

  async function loadProjectsForBuilder(builderId: string) {
    const { data } = await supabase
      .from('projects')
      .select('*, builder:builders(*)')
      .eq('builder_id', builderId)
      .eq('lifecycle_stage', 'active')
      .order('project_code')
    setProjects((data as ProjectWithBuilder[]) || [])
    
    // Only reset project selection if not preselected
    if (!preselectedProjectId) {
      setSelectedProject('')
    }
  }

  async function loadProjectData() {
    // Get project with builder
    const project = projects.find(p => p.id === selectedProject)
    setSelectedProjectData(project || null)

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

  // Budget file handling
  const handleBudgetDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const validExtensions = ['.xlsx', '.xls', '.csv']
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      if (hasValidExtension) {
        setBudgetFile(file)
        setShowImportModal(true)
      }
    }
  }, [])

  const handleBudgetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBudgetFile(file)
      setShowImportModal(true)
    }
  }, [])

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
        type: file.type,
        preview: URL.createObjectURL(file)
      })
    }

    setInvoiceFiles(prev => [...prev, ...newInvoices])
  }

  const removeInvoice = (id: string) => {
    setInvoiceFiles(prev => {
      const invoice = prev.find(inv => inv.id === id)
      if (invoice) {
        URL.revokeObjectURL(invoice.preview)
      }
      return prev.filter(inv => inv.id !== id)
    })
  }

  const isImageFile = (invoice: UploadedInvoice) => {
    return invoice.type.startsWith('image/')
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

  const handleImportSuccess = () => {
    setShowImportModal(false)
    setBudgetFile(null)
    router.push('/staging')
  }

  const handleImportClose = () => {
    setShowImportModal(false)
    setBudgetFile(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          New Draw Request
        </h1>
        <p style={{ color: 'var(--text-muted)' }} className="mt-1">
          Upload invoices and budget spreadsheet with draw amounts
        </p>
      </div>

      <div className="space-y-6">
        {/* Builder & Project Selection */}
        <div className="card p-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Builder *
          </label>
          <select
            value={selectedBuilder}
            onChange={(e) => setSelectedBuilder(e.target.value)}
            className="input w-full"
            required
          >
            <option value="">Select a builder...</option>
            {builders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.company_name}
              </option>
            ))}
          </select>

          {/* Active Loans List - appears when builder selected */}
          {selectedBuilder && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Select Active Loan
              </label>
              {projects.length === 0 ? (
                <p className="text-sm py-3" style={{ color: 'var(--text-muted)' }}>
                  No active loans for this builder
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProject(p.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedProject === p.id 
                          ? 'border-2' 
                          : 'hover:border-opacity-70'
                      }`}
                      style={{ 
                        background: selectedProject === p.id ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                        borderColor: selectedProject === p.id ? 'var(--accent)' : 'var(--border-primary)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {p.project_code || p.name}
                          </p>
                          {p.address && (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {p.address}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(p.loan_amount || 0)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Project Details */}
          {selectedProjectData && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent)' }}>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Project</span>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selectedProjectData.project_code || selectedProjectData.name}
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

        {/* Invoice Upload - Now first after project selection */}
        {selectedProject && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
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
                  Drop invoice files here or click to browse
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  PDF, JPG, PNG up to 20MB each
                </p>
              </div>
            </label>

            {invoiceError && (
              <p className="mt-2 text-sm" style={{ color: 'var(--error)' }}>{invoiceError}</p>
            )}

            {/* Invoice Thumbnails Grid */}
            {invoiceFiles.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  <AnimatePresence>
                    {invoiceFiles.map((invoice, index) => (
                      <motion.div
                        key={invoice.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-[var(--accent)] transition-all"
                        style={{ background: 'var(--bg-secondary)' }}
                        onClick={() => setPreviewIndex(index)}
                      >
                        {isImageFile(invoice) ? (
                          <img 
                            src={invoice.preview} 
                            alt={invoice.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <svg className="w-8 h-8 mb-1" style={{ color: 'var(--error)' }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9 15v-2h2v2H9zm0 2h2v2H9v-2zm4-2h2v2h-2v-2zm0 2h2v2h-2v-2z"/>
                            </svg>
                            <span className="text-xs text-center truncate w-full" style={{ color: 'var(--text-muted)' }}>
                              PDF
                            </span>
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeInvoice(invoice.id)
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <p className="text-sm text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                  {invoiceFiles.length} invoice{invoiceFiles.length !== 1 ? 's' : ''} ready • Click to preview
                </p>
              </div>
            )}
          </div>
        )}

        {/* Budget Spreadsheet Upload - Direct file selection */}
        {selectedProject && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Budget Spreadsheet
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Upload your budget spreadsheet with draw amounts to continue
            </p>
            
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleBudgetDrop}
              className="drop-zone block cursor-pointer"
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleBudgetChange}
                className="hidden"
              />
              <div className="flex flex-col items-center py-8">
                <svg className="w-12 h-12 mb-3" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Drop budget file here or click to browse
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Excel or CSV with draw amounts
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <a href="/" className="btn-secondary">
            Cancel
          </a>
        </div>
      </div>

      {/* Import Modal - Opens with pre-selected file */}
      <ImportPreview
        isOpen={showImportModal}
        onClose={handleImportClose}
        onSuccess={handleImportSuccess}
        importType="draw"
        preselectedBuilderId={selectedBuilder}
        preselectedProjectId={selectedProject}
        initialFile={budgetFile}
      />

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {previewIndex !== null && invoiceFiles[previewIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setPreviewIndex(null)}
          >
            {/* Previous button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex(prev => Math.max(0, (prev ?? 0) - 1))
              }}
              disabled={previewIndex === 0}
              className="absolute left-4 z-10 p-3 rounded-full transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Preview content */}
            <div 
              className="max-w-4xl max-h-[80vh] mx-16"
              onClick={(e) => e.stopPropagation()}
            >
              {isImageFile(invoiceFiles[previewIndex]) ? (
                <img 
                  src={invoiceFiles[previewIndex].preview} 
                  alt={invoiceFiles[previewIndex].name}
                  className="max-w-full max-h-[80vh] rounded-lg object-contain"
                />
              ) : (
                <iframe 
                  src={invoiceFiles[previewIndex].preview}
                  className="w-[800px] h-[80vh] rounded-lg"
                  title={invoiceFiles[previewIndex].name}
                />
              )}
            </div>

            {/* Next button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex(prev => Math.min(invoiceFiles.length - 1, (prev ?? 0) + 1))
              }}
              disabled={previewIndex === invoiceFiles.length - 1}
              className="absolute right-4 z-10 p-3 rounded-full transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute top-4 right-4 p-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* File info and counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
              <p className="text-white font-medium">{invoiceFiles[previewIndex].name}</p>
              <p className="text-white/60 text-sm">
                {previewIndex + 1} of {invoiceFiles.length} • {formatFileSize(invoiceFiles[previewIndex].size)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function NewDrawPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
      </div>
    }>
      <NewDrawPageContent />
    </Suspense>
  )
}
