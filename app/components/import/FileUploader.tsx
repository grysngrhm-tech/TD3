'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

type FileUploaderProps = {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
}

export function FileUploader({ 
  onFileSelect, 
  accept = '.xlsx,.xls,.csv',
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): boolean => {
    setError(null)
    
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      setError('Please upload an Excel or CSV file')
      return false
    }
    
    // Check file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / 1024 / 1024}MB`)
      return false
    }
    
    return true
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && validateFile(file)) {
      onFileSelect(file)
    }
  }, [onFileSelect, maxSize])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      onFileSelect(file)
    }
  }, [onFileSelect, maxSize])

  return (
    <div className="w-full">
      <motion.label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{ scale: isDragging ? 1.02 : 1 }}
        className={`drop-zone block cursor-pointer ${isDragging ? 'dragging' : ''}`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ y: isDragging ? -5 : 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <svg 
              className="w-16 h-16 mb-4" 
              style={{ color: isDragging ? 'var(--accent)' : 'var(--text-muted)' }} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </motion.div>
          
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {isDragging ? 'Drop your file here' : 'Drop Excel or CSV file here'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            or click to browse
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Supports .xlsx, .xls, .csv up to 10MB
          </p>
        </div>
      </motion.label>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-center"
          style={{ color: 'var(--error)' }}
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}
