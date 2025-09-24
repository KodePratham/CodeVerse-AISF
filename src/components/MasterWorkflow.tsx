'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MasterWorkflowProps {
  roomId: string
  existingWorkflows: any[]
}

export default function MasterWorkflow({ roomId, existingWorkflows }: MasterWorkflowProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleCreateMasterWorkflow = async () => {
    setIsCreating(true)
    setError('')
    setSuccess('')

    try {
      console.log('Creating master workflow for room:', roomId)
      
      const response = await fetch(`/api/rooms/${roomId}/master-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server responded with ${response.status}`)
      }

      console.log('Master workflow created successfully:', data)
      setSuccess('Master workflow created successfully!')
      
      // Refresh the page to show new workflow
      setTimeout(() => {
        router.refresh()
      }, 1000)
      
    } catch (error: any) {
      console.error('Master workflow creation error:', error)
      setError(error.message || 'Failed to create master workflow. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDownload = async (workflowId: string, workflowName: string) => {
    try {
      console.log('Downloading workflow:', workflowId)
      
      const response = await fetch(`/api/master-workflow/${workflowId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download workflow')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflowName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('Download completed successfully')
    } catch (error: any) {
      console.error('Download error:', error)
      alert(`Failed to download workflow: ${error.message}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Master Workflow</h2>
        <button
          onClick={handleCreateMasterWorkflow}
          disabled={isCreating}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          {isCreating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Workflow...
            </span>
          ) : (
            '✨ Create Master Workflow'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}

      {existingWorkflows.length > 0 ? (
        <div className="space-y-4">
          {existingWorkflows.map((workflow: any) => (
            <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{workflow.workflow_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Created on {new Date(workflow.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    By: {workflow.users?.username || 'Unknown User'}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(workflow.id, workflow.workflow_name)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Excel</span>
                </button>
              </div>
              
              {workflow.gemini_analysis && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-md p-3 mt-3">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>AI Summary:</strong> {workflow.gemini_analysis.summary}
                  </p>
                  {workflow.gemini_analysis.insights && workflow.gemini_analysis.insights.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <strong>Key Insights:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {workflow.gemini_analysis.insights.slice(0, 3).map((insight: string, index: number) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Master Workflows Yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4">
            Create a master workflow to consolidate all Excel data using AI analysis and generate a downloadable report.
          </p>
        </div>
      )}
    </div>
  )
}
