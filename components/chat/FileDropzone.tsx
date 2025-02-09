'use client'

import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void
  isActive?: boolean
  onActiveChange?: (isActive: boolean) => void
  className?: string
}

export function FileDropzone({
  onFilesAccepted,
  isActive = false,
  onActiveChange,
  className
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAccepted(acceptedFiles)
    },
    [onFilesAccepted]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'],
      'application/pdf': ['.pdf']
    }
  })

  // Update parent about drag state using useEffect
  useEffect(() => {
    if (isDragActive !== isActive) {
      onActiveChange?.(isDragActive)
    }
  }, [isDragActive, isActive, onActiveChange])

  return (
    <div
      {...getRootProps()}
      className={cn(
        'absolute inset-0 pointer-events-none',
        isDragActive && 'pointer-events-auto',
        isDragActive &&
          'after:absolute after:inset-0 after:rounded-3xl after:border-2 after:border-dashed after:border-primary after:bg-primary/5',
        className
      )}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm font-medium shadow-lg">
            <Upload className="size-4" />
            Drop files to upload
          </div>
        </div>
      )}
    </div>
  )
} 