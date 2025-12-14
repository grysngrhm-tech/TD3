'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditEvent } from '@/lib/audit'

interface DocumentUploadProps {
  drawRequestId: string
  projectId: string
  onUpload?: () => void
}

export function DocumentUpload({ drawRequestId, projectId, onUpload }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setError(null)
    setSuccess(null)

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    try {
      const uploadedCount = { success: 0, failed: 0 }

      for (const file of files) {
        // Validate file type
        if (!validTypes.includes(file.type)) {
          console.warn(`Skipping ${file.name}: invalid file type`)
          uploadedCount.failed++
          continue
        }

        // Validate file size
        if (file.size > maxSize) {
          console.warn(`Skipping ${file.name}: file too large`)
          uploadedCount.failed++
          continue
        }

        // Generate unique file path
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${projectId}/${drawRequestId}/${timestamp}_${sanitizedName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError)
          uploadedCount.failed++
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        // Calculate file hash (basic implementation)
        const arrayBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // Insert document record
        const { data: docData, error: dbError } = await supabase
          .from('documents')
          .insert({
            draw_request_id: drawRequestId,
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            file_hash: fileHash,
          })
          .select()
          .single()

        if (dbError) {
          console.error(`Failed to save document record for ${file.name}:`, dbError)
          uploadedCount.failed++
          continue
        }

        // Log audit event
        await logAuditEvent({
          entityType: 'document',
          entityId: docData.id,
          action: 'created',
          newData: { file_name: file.name, draw_request_id: drawRequestId },
        })

        uploadedCount.success++
      }

      // Show result message
      if (uploadedCount.success > 0) {
        setSuccess(`Successfully uploaded ${uploadedCount.success} file(s)`)
        onUpload?.()
      }
      if (uploadedCount.failed > 0) {
        setError(`Failed to upload ${uploadedCount.failed} file(s). Check file types and sizes.`)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('An error occurred while uploading files')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">Upload Documents</h3>
      
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-slate-600">Uploading...</p>
          </div>
        ) : (
          <>
            <svg
              className={`w-12 h-12 mx-auto mb-3 ${dragActive ? 'text-primary-500' : 'text-slate-400'}`}
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
            <p className="text-slate-700 font-medium">
              {dragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              or click to browse
            </p>
            <p className="text-slate-400 text-xs mt-3">
              Supported: PDF, JPG, PNG, WebP • Max 10MB
            </p>
          </>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}

/**
 * Compact document preview component
 */
export function DocumentPreview({ 
  fileName, 
  fileUrl, 
  fileSize,
  onRemove 
}: { 
  fileName: string
  fileUrl?: string
  fileSize?: number
  onRemove?: () => void
}) {
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.83 0 1.5.67 1.5 1.5S10.33 16 9.5 16H9v1.5H8V13h.5zm3 0h1c.83 0 1.5.67 1.5 1.5v2c0 .83-.67 1.5-1.5 1.5h-1V13zm4.5 0h2v1h-1.5v1h1v1h-1v1.5H15V13z"/>
        </svg>
      )
    }
    return (
      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
      <div className="flex items-center gap-3 min-w-0">
        {getFileIcon(fileName)}
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{fileName}</p>
          {fileSize && (
            <p className="text-xs text-slate-500">
              {fileSize < 1024 * 1024 
                ? `${Math.round(fileSize / 1024)}KB`
                : `${(fileSize / (1024 * 1024)).toFixed(1)}MB`
              }
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

