'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function MasterWorkflowChart({ geminiAnalysis }: { geminiAnalysis: any }) {
  // Try to find numeric columns in mergedData
  const data = geminiAnalysis?.mergedData
  const headers = geminiAnalysis?.consolidatedHeaders

  if (!Array.isArray(data) || data.length === 0 || !Array.isArray(headers) || headers.length === 0) {
    return <div className="text-gray-500 text-sm">This workflow is not made for visualization.</div>
  }

  // Find up to 2 numeric columns for visualization
  const numericKeys = headers.filter(h =>
    data.some((row: any) => typeof row[h] === 'number')
  ).slice(0, 2)

  if (numericKeys.length === 0) {
    return <div className="text-gray-500 text-sm">This workflow is not made for visualization.</div>
  }

  // Use the first non-numeric column as X axis (if available)
  const xKey = headers.find(h => typeof data[0][h] === 'string') || headers[0]

  return (
    <div className="my-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data.slice(0, 10)}>
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {numericKeys.map((key, idx) => (
            <Bar key={key} dataKey={key} fill={idx === 0 ? "#8884d8" : "#82ca9d"} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
