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
      console.warn('Gemini API key not configured, using fallback analysis')
      return createFallbackAnalysis(data)
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Limit data size for API call to prevent token limits
    const limitedData = data.map(sheet => ({
      fileName: sheet.fileName,
      sheetName: sheet.sheetName,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      // Only send sample data and headers to avoid token limits
      sampleData: sheet.data.slice(0, 5), // First 5 rows
      headers: sheet.data.length > 0 ? Object.keys(sheet.data[0]) : []
    }))

    const prompt = `
    You are an expert data analyst. I have multiple Excel sheets that need to be consolidated into a master workflow.

    Here's the structure and sample data from multiple Excel files:
    ${JSON.stringify(limitedData, null, 2)}

    Please analyze this data structure and create a consolidation plan. Return ONLY a valid JSON object with this exact structure:

    {
      "masterWorkflow": [],
      "summary": "Brief summary of the consolidation approach",
      "insights": ["insight about data patterns", "insight about common fields"],
      "recommendations": ["recommendation for data quality", "recommendation for workflow"],
      "consolidatedHeaders": ["header1", "header2", "header3"],
      "mergedData": []
    }

    For mergedData, create a unified structure that combines all sheets with consistent column names.
    Make sure all field names are consistent and the JSON is valid.
    Do not include any markdown formatting or code blocks in your response.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Clean the response text
    let cleanedText = text.trim()
    
    // Remove any potential markdown formatting
    cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    let analysis: GeminiAnalysis

    try {
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', cleanedText.substring(0, 500))
      console.error('Parse error:', parseError)
      return createFallbackAnalysis(data)
    }

    // Validate and complete the analysis
    analysis = validateAndCompleteAnalysis(analysis, data)
    
    // Ensure mergedData contains actual consolidated data
    if (!analysis.mergedData || analysis.mergedData.length === 0) {
      analysis.mergedData = createMergedData(data)
    }

    return analysis

  } catch (error: any) {
    console.error('Error analyzing data with Gemini:', error)
    return createFallbackAnalysis(data)
  }
}

function createFallbackAnalysis(data: ConsolidatedData[]): GeminiAnalysis {
  const allHeaders = new Set<string>()
  
  // Collect all unique headers across sheets
  data.forEach(sheet => {
    if (sheet.data.length > 0) {
      Object.keys(sheet.data[0]).forEach(header => allHeaders.add(header))
    }
  })

  const consolidatedHeaders = Array.from(allHeaders)
  
  // Add metadata headers
  consolidatedHeaders.unshift('Source_File', 'Source_Sheet', 'Original_Row')

  return {
    masterWorkflow: [],
    summary: `Consolidated ${data.length} Excel sheets with ${consolidatedHeaders.length} total unique columns. Combined ${data.reduce((sum, sheet) => sum + sheet.rowCount, 0)} total rows.`,
    insights: [
      `Found ${data.length} different Excel sheets`,
      `Identified ${consolidatedHeaders.length} unique column headers`,
      `Total data rows: ${data.reduce((sum, sheet) => sum + sheet.rowCount, 0)}`,
      'Data structure varies across sheets - manual review recommended'
    ],
    recommendations: [
      'Standardize column naming conventions across all sheets',
      'Implement data validation rules for consistent data entry',
      'Consider creating template sheets for future uploads',
      'Review merged data for duplicates and inconsistencies'
    ],
    consolidatedHeaders,
    mergedData: createMergedData(data)
  }
}

function createMergedData(data: ConsolidatedData[]): any[] {
  const mergedData: any[] = []

  data.forEach(sheet => {
    sheet.data.forEach((row, index) => {
      mergedData.push({
        Source_File: sheet.fileName,
        Source_Sheet: sheet.sheetName,
        Original_Row: index + 1,
        ...row
      })
    })
  })

  return mergedData
}

function validateAndCompleteAnalysis(analysis: any, data: ConsolidatedData[]): GeminiAnalysis {
  // Ensure all required fields exist with proper defaults
  const validated: GeminiAnalysis = {
    masterWorkflow: Array.isArray(analysis.masterWorkflow) ? analysis.masterWorkflow : [],
    summary: typeof analysis.summary === 'string' ? analysis.summary : 'Data consolidation completed',
    insights: Array.isArray(analysis.insights) ? analysis.insights : ['Data analysis completed'],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : ['Review consolidated data'],
    consolidatedHeaders: Array.isArray(analysis.consolidatedHeaders) ? analysis.consolidatedHeaders : [],
    mergedData: Array.isArray(analysis.mergedData) ? analysis.mergedData : []
  }

  // If headers are empty, generate them
  if (validated.consolidatedHeaders.length === 0) {
    const allHeaders = new Set<string>()
    data.forEach(sheet => {
      if (sheet.data.length > 0) {
        Object.keys(sheet.data[0]).forEach(header => allHeaders.add(header))
      }
    })
    validated.consolidatedHeaders = ['Source_File', 'Source_Sheet', ...Array.from(allHeaders)]
  }

  return validated
}

export function createExcelBuffer(data: any[], headers: string[]): Buffer {
  try {
    const XLSX = require('xlsx')
    
    // Create workbook
    const workbook = XLSX.utils.book_new()
    
    // Ensure we have data to work with
    if (!data || data.length === 0) {
      const emptyData = [{ Message: 'No data available' }]
      const worksheet = XLSX.utils.json_to_sheet(emptyData)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empty')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      return Buffer.from(buffer)
    }

    // Use provided headers or extract from data
    const effectiveHeaders = headers && headers.length > 0 
      ? headers 
      : Object.keys(data[0])
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, { header: effectiveHeaders })
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Workflow')
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    return Buffer.from(buffer)
    
  } catch (error: any) {
    console.error('Error creating Excel buffer:', error)
    
    // Create error fallback
    const XLSX = require('xlsx')
    const workbook = XLSX.utils.book_new()
    const errorData = [{ 
      Error: 'Failed to generate Excel file', 
      Message: error.message,
      Timestamp: new Date().toISOString()
    }]
    const worksheet = XLSX.utils.json_to_sheet(errorData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Error')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return Buffer.from(buffer)
  }
}
