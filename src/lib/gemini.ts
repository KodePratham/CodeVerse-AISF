import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface ConsolidatedData {
  fileName: string
  sheetName: string
  rowCount: number
  columnCount: number
  data: any[]
}

export interface GeminiAnalysis {
  masterWorkflow: any[]
  summary: string
  insights: string[]
  recommendations: string[]
  consolidatedHeaders: string[]
  mergedData: any[]
}

export async function analyzeExcelData(data: ConsolidatedData[]): Promise<GeminiAnalysis> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not configured, using fallback')
      return createSimpleFallback(data)
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `
You are a data consolidation expert. Merge multiple Excel sheets into ONE efficient table with minimum rows and columns but covering ALL data.

EXCEL SHEETS TO MERGE:
${JSON.stringify(data, null, 2)}

REQUIREMENTS:
1. Create a SINGLE consolidated table
2. Minimize duplicate rows - merge entities with same identifiers
3. Include ALL unique data from all sheets
4. Clean column names (remove special chars, use PascalCase)
5. Normalize data types (dates as YYYY-MM-DD, numbers as numbers)
6. Remove empty/null values

RESPOND WITH VALID JSON ONLY:
{
  "mergedData": [
    {"Column1": "value", "Column2": "value", ...},
    ...
  ],
  "consolidatedHeaders": ["Column1", "Column2", ...],
  "summary": "Brief description of merge",
  "insights": ["Key insight 1", "Key insight 2", ...],
  "recommendations": ["Recommendation 1", ...]
}
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    try {
      const geminiResult = JSON.parse(cleanedText)
      
      return {
        masterWorkflow: [{ 
          strategy: 'gemini_merge',
          totalSheets: data.length,
          mergedRows: geminiResult.mergedData?.length || 0
        }],
        summary: geminiResult.summary || 'Data merged successfully',
        insights: geminiResult.insights || [],
        recommendations: geminiResult.recommendations || [],
        consolidatedHeaders: geminiResult.consolidatedHeaders || [],
        mergedData: geminiResult.mergedData || []
      }
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response, using fallback')
      return createSimpleFallback(data)
    }

  } catch (error: any) {
    console.error('Error with Gemini:', error)
    return createSimpleFallback(data)
  }
}

function createSimpleFallback(data: ConsolidatedData[]): GeminiAnalysis {
  // Simple merge - just combine all data with source tracking
  const mergedData: any[] = []
  const allHeaders = new Set<string>()
  
  data.forEach(sheet => {
    sheet.data.forEach(row => {
      const cleanRow: any = {
        Source: `${sheet.fileName}_${sheet.sheetName}`
      }
      
      Object.entries(row).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '').replace(/\b\w/g, l => l.toUpperCase())
          cleanRow[cleanKey] = value
          allHeaders.add(cleanKey)
        }
      })
      
      if (Object.keys(cleanRow).length > 1) { // More than just Source
        mergedData.push(cleanRow)
      }
    })
  })
  
  return {
    masterWorkflow: [{ 
      strategy: 'simple_combine',
      totalSheets: data.length,
      mergedRows: mergedData.length
    }],
    summary: `Combined ${data.length} sheets into ${mergedData.length} rows`,
    insights: [`Total unique columns: ${allHeaders.size}`],
    recommendations: ['Configure Gemini API for smarter merging'],
    consolidatedHeaders: Array.from(allHeaders),
    mergedData
  }
}

export function createExcelBuffer(data: any[], headers: string[]): Buffer {
  try {
    const XLSX = require('xlsx')
    
    if (!data || data.length === 0) {
      const emptyData = [{ Message: 'No data available' }]
      const worksheet = XLSX.utils.json_to_sheet(emptyData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empty')
      return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
    }

    const effectiveHeaders = headers?.length > 0 ? headers : Object.keys(data[0])
    const worksheet = XLSX.utils.json_to_sheet(data, { header: effectiveHeaders })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Data')
    
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
    
  } catch (error: any) {
    console.error('Error creating Excel buffer:', error)
    
    const XLSX = require('xlsx')
    const workbook = XLSX.utils.book_new()
    const errorData = [{ 
      Error: 'Failed to generate Excel file', 
      Message: error.message,
      Timestamp: new Date().toISOString()
    }]
    const worksheet = XLSX.utils.json_to_sheet(errorData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Error')
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
  }
}
