'use client'

import { useRouter } from 'next/navigation'

interface ExcelSheetListProps {
  roomId: string
  excelSheets: any[]
}

export default function ExcelSheetList({ roomId, excelSheets }: ExcelSheetListProps) {
  const router = useRouter()

  const handleDeleteExcel = async (sheetId: string) => {
    if (!confirm('Are you sure you want to delete this Excel file?')) return
    try {
      const response = await fetch(`/api/rooms/${roomId}/excel-sheet/${sheetId}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete file')
      }
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to delete file')
    }
  }

  if (!excelSheets.length) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Excel Files Yet</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Upload Excel files to start consolidating and analyzing your data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {excelSheets.map((sheet: any) => (
        <div key={sheet.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-gray-900">{sheet.file_name}</h3>
              <p className="text-sm text-gray-600">Sheet: {sheet.sheet_name}</p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span className="text-xs text-gray-500">
                {new Date(sheet.upload_date).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleDeleteExcel(sheet.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{sheet.row_count} rows × {sheet.column_count} columns</span>
            <span>By: {sheet.users?.username}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
