'use client'

import { useState } from 'react'

interface SyncErrorAlertProps {
  syncError: string
}

export default function SyncErrorAlert({ syncError }: SyncErrorAlertProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetrySync = async () => {
    setIsRetrying(true)
    try {
      const response = await fetch('/api/users/sync', { method: 'POST' })
      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        alert(`Sync failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Manual sync failed:', error)
      alert('Failed to retry sync. Please refresh the page.')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            User Synchronization Failed
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{syncError}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={handleRetrySync}
              disabled={isRetrying}
              className="bg-red-100 hover:bg-red-200 disabled:bg-red-50 disabled:text-red-400 text-red-800 px-3 py-1 rounded text-sm transition-colors"
            >
              {isRetrying ? 'Retrying...' : 'Retry Sync'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
