'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import MasterWorkflowChart from './MasterWorkflowChart'

function MinimalPopup({
  open,
  title,
  placeholder,
  onSubmit,
  onClose,
  loading,
}: {
  open: boolean
  title: string
  placeholder?: string
  onSubmit: (value: string) => void
  onClose: () => void
  loading?: boolean
}) {
  const [value, setValue] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="popup-minimal">
        <div className="popup-minimal-title">{title}</div>
        <textarea
          className="mb-2"
          rows={3}
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <div className="popup-minimal-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => { onSubmit(value); setValue('') }}
            disabled={loading || !value.trim()}
            type="button"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportChat({ workflowId }: { workflowId: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return
    setMessages(msgs => [...msgs, { role: 'user', content: input }])
    setLoading(true)
    try {
      const res = await fetch(`/api/master-workflow/${workflowId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      })
      const data = await res.json()
      setMessages(msgs => [...msgs, { role: 'assistant', content: data.answer || data.error || 'No answer.' }])
    } catch (e: any) {
      setMessages(msgs => [...msgs, { role: 'assistant', content: 'Error: ' + (e.message || 'Unknown error') }])
    }
    setInput('')
    setLoading(false)
  }

  const handleExcelRequest = async (instructions: string) => {
    if (!instructions) return
    setExcelLoading(true)
    try {
      const res = await fetch(`/api/master-workflow/${workflowId}/generate-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to generate Excel file')
        setExcelLoading(false)
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `custom_report_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e: any) {
      alert(e.message || 'Failed to generate Excel file')
    }
    setExcelLoading(false)
    setPopupOpen(false)
  }

  return (
    <div className="card-minimal mt-4">
      <div className="mb-2 font-semibold text-gray-700">Ask questions about this report:</div>
      <div className="max-h-48 overflow-y-auto mb-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <span className={msg.role === 'user' ? 'bg-blue-100 text-blue-800 px-2 py-1 rounded' : 'bg-gray-200 text-gray-800 px-2 py-1 rounded'}>
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="Type your question..."
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="btn-secondary"
          onClick={() => setPopupOpen(true)}
          disabled={excelLoading}
        >
          Generate New Excel from Report
        </button>
      </div>
      <MinimalPopup
        open={popupOpen}
        title="Generate New Excel from Report"
        placeholder='Describe how you want to generate the new Excel file (e.g., "Only rows where Status is Complete", "Summarize by Department", etc.)'
        onSubmit={handleExcelRequest}
        onClose={() => setPopupOpen(false)}
        loading={excelLoading}
      />
    </div>
  )
}

interface MasterWorkflowProps {
  roomId: string
  existingWorkflows: any[]
}

export default function MasterWorkflow({ roomId, existingWorkflows }: MasterWorkflowProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [openChatId, setOpenChatId] = useState<string | null>(null)
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

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this master workflow?')) return
    try {
      const response = await fetch(`/api/master-workflow/${workflowId}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete workflow')
      }
      setSuccess('Master workflow deleted successfully!')
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (error: any) {
      setError(error.message || 'Failed to delete workflow')
    }
  }

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Master Workflow</h2>
        <button
          onClick={handleCreateMasterWorkflow}
          disabled={isCreating}
          className="btn-primary"
        >
          {isCreating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
          ) : (
            'Create Master Workflow'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-green-800 text-sm">
          {success}
        </div>
      )}

      {existingWorkflows.length > 0 ? (
        <div className="space-y-4">
          {existingWorkflows.map((workflow: any) => (
            <div key={workflow.id} className="card-minimal">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{workflow.workflow_name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(workflow.created_at).toLocaleDateString()} &middot; By: {workflow.users?.username || 'Unknown'}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <button
                    onClick={() => handleDownload(workflow.id, workflow.workflow_name)}
                    className="btn-secondary text-xs"
                  >
                    Download Excel
                  </button>
                  <button
                    onClick={() => handleDelete(workflow.id)}
                    className="btn-danger text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {workflow.gemini_analysis && (
                <div className="bg-gray-50 rounded p-3 mt-3">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>AI Summary:</strong> {workflow.gemini_analysis.summary}
                  </p>
                  {workflow.gemini_analysis.insights && workflow.gemini_analysis.insights.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <strong>Key Insights:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {workflow.gemini_analysis.insights.slice(0, 3).map((insight: string, index: number) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <MasterWorkflowChart geminiAnalysis={workflow.gemini_analysis} />
                  <button
                    className="mt-4 btn-ghost text-sm"
                    onClick={() => setOpenChatId(openChatId === workflow.id ? null : workflow.id)}
                  >
                    {openChatId === workflow.id ? 'Close Chat' : 'Chat with Report'}
                  </button>
                  {openChatId === workflow.id && (
                    <ReportChat workflowId={workflow.id} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">No Master Workflows Yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4 text-sm">
            Create a master workflow to consolidate all Excel data using AI analysis and generate a downloadable report.
          </p>
        </div>
      )}
    </div>
  )
}
