'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ExcelUploadProps {
  roomId: string
}

export default function ExcelUpload({ roomId }: ExcelUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/rooms/${roomId}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file')
      }

      // Refresh the page to show new data
      router.refresh()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  return (
    <div>
      <input
        type="file"
        id={`file-upload-${roomId}`}
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <svg
            className={`mx-auto h-12 w-12 ${
              dragActive ? 'text-primary-400' : 'text-gray-400'
            }`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label
              htmlFor={`file-upload-${roomId}`}
              className={`cursor-pointer rounded-md font-medium ${
                isUploading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-primary-600 hover:text-primary-500'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Upload Excel file'}
            </label>
            <p className="text-xs text-gray-500 mt-1">
              or drag and drop (.xlsx, .xls)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
