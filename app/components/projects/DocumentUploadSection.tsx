'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditEvent } from '@/lib/audit'
import { DOCUMENT_TYPES, DocumentType, Document } from '@/types/database'
import { toast } from '@/app/components/ui/Toast'

type DocumentUploadSectionProps = {
  projectId: string
  onDocumentChange?: () => void
}

export function DocumentUploadSection({ projectId, onDocumentChange }: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType>('other')
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('draw_request_id', null) // Only get project-level documents
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files))
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files))
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    try {
      let successCount = 0
      let failCount = 0

      for (const file of files) {
        // Validate file type
        if (!validTypes.includes(file.type)) {
          console.warn(`Skipping ${file.name}: invalid file type`)
          failCount++
          continue
        }

        // Validate file size
        if (file.size > maxSize) {
          console.warn(`Skipping ${file.name}: file too large`)
          failCount++
          continue
        }

        // Generate unique file path
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${projectId}/origination/${selectedType}/${timestamp}_${sanitizedName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError)
          failCount++
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        // Calculate file hash
        const arrayBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // Insert document record
        const { data: docData, error: dbError } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            file_hash: fileHash,
            document_type: selectedType,
          })
          .select()
          .single()

        if (dbError) {
          console.error(`Failed to save document record for ${file.name}:`, dbError)
          failCount++
          continue
        }

        // Log audit event
        await logAuditEvent({
          entityType: 'document',
          entityId: docData.id,
          action: 'created',
          newData: { file_name: file.name, document_type: selectedType },
        })

        successCount++
      }

      // Show result
      if (successCount > 0) {
        toast({
          type: 'success',
          title: 'Upload Complete',
          message: `Successfully uploaded ${successCount} file(s)`
        })
        loadDocuments()
        onDocumentChange?.()
      }
      if (failCount > 0) {
        toast({
          type: 'error',
          title: 'Upload Failed',
          message: `Failed to upload ${failCount} file(s). Check file types and sizes.`
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
      toast({
        type: 'error',
        title: 'Upload Error',
        message: 'An error occurred while uploading files'
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      // Log audit event
      await logAuditEvent({
        entityType: 'document',
        entityId: doc.id,
        action: 'deleted',
        oldData: { file_name: doc.file_name, document_type: doc.document_type },
      })

      toast({
        type: 'success',
        title: 'Document Deleted',
        message: `${doc.file_name} has been removed`
      })
      
      loadDocuments()
      onDocumentChange?.()
    } catch (err) {
      console.error('Delete error:', err)
      toast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete document'
      })
    }
  }

  // Group documents by type
  const documentsByType = DOCUMENT_TYPES.map(type => ({
    ...type,
    documents: documents.filter(d => d.document_type === type.id)
  })).filter(g => g.documents.length > 0)

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.includes('pdf')) {
      return (
        <svg className="w-5 h-5" style={{ color: 'var(--error)' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z"/>
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }

  const formatFileSize = (size: number | null) => {
    if (!size) return ''
    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="card-ios">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Documents</h3>

      {/* Upload Section */}
      <div className="space-y-3 mb-6">
        {/* Document Type Selector */}
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            Document Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType)}
            className="input w-full"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
          style={{ 
            borderColor: dragActive ? 'var(--accent)' : 'var(--border)',
            background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleChange}
            className="hidden"
          />
          
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                style={{ borderColor: 'var(--accent)' }}
              />
              <p style={{ color: 'var(--text-muted)' }}>Uploading...</p>
            </div>
          ) : (
            <>
              <svg
                className="w-10 h-10 mx-auto mb-2"
                style={{ color: dragActive ? 'var(--accent)' : 'var(--text-muted)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {dragActive ? 'Drop files here' : 'Drag & drop files'}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                or click to browse
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                PDF, JPG, PNG, WebP • Max 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="text-center py-6">
          <div 
            className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent mx-auto"
            style={{ borderColor: 'var(--accent)' }}
          />
        </div>
      ) : documentsByType.length === 0 ? (
        <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documentsByType.map(group => (
            <div key={group.id}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.documents.map(doc => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg group"
                    style={{ background: 'var(--bg-hover)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(doc.mime_type)}
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {doc.file_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--accent)' }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--error)' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
