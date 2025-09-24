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
      console.warn('Gemini API key not configured, using intelligent fallback analysis')
      return createIntelligentFallbackAnalysis(data)
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Create comprehensive data analysis
    const dataAnalysis = analyzeDataStructures(data)
    
    // Prepare all data for Gemini (with reasonable limits)
    const consolidatedData = data.map(sheet => ({
      fileName: sheet.fileName,
      sheetName: sheet.sheetName,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      data: sheet.data.slice(0, 100), // Send up to 100 rows per sheet
      headers: sheet.data.length > 0 ? Object.keys(sheet.data[0]) : [],
      dataTypes: analyzeDataTypes(sheet.data.slice(0, 10)),
      commonPatterns: findCommonPatterns(sheet.data.slice(0, 10))
    }))

    const prompt = `
    You are a senior data consolidation expert. Your task is to create a SINGLE UNIFIED TABLE that combines data from multiple Excel sources intelligently.

    CRITICAL REQUIREMENT: DO NOT CREATE DUPLICATE ROWS FOR THE SAME ENTITY. Instead, merge all attributes into a single row per unique entity.

    EXCEL DATA TO PROCESS:
    ${JSON.stringify(consolidatedData, null, 2)}

   You are given JSON data that was created by converting one or more Excel files into a flat table. 
The table contains rows from multiple different sources, with a "Source File" or similar indicator 
that shows where each row came from. Because the sources had different column headers, 
many rows contain irrelevant or empty fields.

Your task:
1. Group the rows by their source (for example, using "Source File" or an equivalent column).
2. For each group, generate a JSON array that contains only the relevant fields for that source. 
   - If a column is always empty or irrelevant for that source, drop it.
   - Keep only the meaningful fields with non-empty values.
3. Build a clean hierarchical JSON structure with the format:

{
  "Source1": [
    { "FieldA": "value", "FieldB": "value", ... },
    ...
  ],
  "Source2": [
    { "FieldX": "value", "FieldY": "value", ... },
    ...
  ]
}

4. Normalize the data:
   - Convert date-like values into ISO format (YYYY-MM-DD).
   - Keep numbers as numbers (not strings).
   - Remove null/NaN/empty entries.
   - Trim whitespace from text values.
5. Ensure the final output is valid JSON only, with no explanations or extra text.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    let analysis: GeminiAnalysis

    try {
      analysis = JSON.parse(cleanedText)
      analysis = validateAndEnhanceAnalysis(analysis, data, dataAnalysis)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', cleanedText.substring(0, 500))
      return createIntelligentFallbackAnalysis(data)
    }

    return analysis

  } catch (error: any) {
    console.error('Error analyzing data with Gemini:', error)
    return createIntelligentFallbackAnalysis(data)
  }
}

function analyzeDataStructures(data: ConsolidatedData[]) {
  const allColumns = new Set<string>()
  const columnFrequency = new Map<string, number>()
  const relationships: { type: string; sheet1: string; sheet2: string; commonColumns: string[]; confidence: number }[] = []
  
  // Collect all columns and their frequency
  data.forEach(sheet => {
    if (sheet.data.length > 0) {
      Object.keys(sheet.data[0]).forEach(col => {
        allColumns.add(col)
        columnFrequency.set(col, (columnFrequency.get(col) || 0) + 1)
      })
    }
  })

  // Find common columns (appear in multiple sheets)
  const commonColumns = Array.from(columnFrequency.entries())
    .filter(([_, freq]) => freq > 1)
    .map(([col, _]) => col)

  // Find similar columns (fuzzy matching)
  const similarColumns = findSimilarColumns(Array.from(allColumns))
  
  // Find unique columns
  const uniqueColumns = Array.from(columnFrequency.entries())
    .filter(([_, freq]) => freq === 1)
    .map(([col, _]) => col)

  // Analyze potential relationships
  data.forEach((sheet, index) => {
    const otherSheets = data.filter((_, i) => i !== index)
    otherSheets.forEach(otherSheet => {
      const relationship = findDataRelationship(sheet, otherSheet)
      if (relationship) {
        relationships.push(relationship)
      }
    })
  })

  return {
    commonColumns,
    similarColumns,
    uniqueColumns,
    relationships,
    totalSheets: data.length,
    totalColumns: allColumns.size
  }
}

function findSimilarColumns(columns: string[]): Record<string, string[]> {
  const similarGroups: Record<string, string[]> = {}
  
  columns.forEach(col1 => {
    const similar = columns.filter(col2 => {
      if (col1 === col2) return false
      return calculateSimilarity(col1.toLowerCase(), col2.toLowerCase()) > 0.6
    })
    
    if (similar.length > 0) {
      similarGroups[col1] = similar
    }
  })
  
  return similarGroups
}

function calculateSimilarity(str1: string, str2: string): number {
  // Check for common business synonyms
  const synonyms = [
    ['name', 'title', 'label'],
    ['id', 'identifier', 'key', 'code'],
    ['customer', 'client', 'user'],
    ['amount', 'price', 'cost', 'value'],
    ['date', 'time', 'timestamp'],
    ['phone', 'mobile', 'telephone'],
    ['email', 'mail', 'e-mail'],
    ['address', 'location', 'addr']
  ]
  
  // Check if words are synonyms
  for (const group of synonyms) {
    if (group.includes(str1) && group.includes(str2)) {
      return 1.0
    }
  }
  
  // Fallback to Levenshtein distance
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

function findBestPrimaryKey(data: ConsolidatedData[]): string | null {
  if (data.length === 0) return null
  
  const candidateColumns = new Map<string, number>()
  const uniquenessScores = new Map<string, number>()
  
  // Analyze all sheets to find potential primary key columns
  data.forEach(sheet => {
    if (sheet.data.length === 0) return
    
    const headers = Object.keys(sheet.data[0])
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase()
      
      // Give higher scores to columns that look like primary keys
      let score = 0
      if (lowerHeader.includes('id')) score += 10
      if (lowerHeader.includes('key')) score += 8
      if (lowerHeader.includes('code')) score += 6
      if (lowerHeader.includes('number')) score += 4
      if (lowerHeader.includes('reference') || lowerHeader.includes('ref')) score += 5
      
      candidateColumns.set(header, (candidateColumns.get(header) || 0) + score)
      
      // Calculate uniqueness score
      const values = sheet.data.map(row => row[header])
      const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== ''))
      const uniquenessRatio = uniqueValues.size / values.length
      uniquenessScores.set(header, Math.max(uniquenessScores.get(header) || 0, uniquenessRatio))
    })
  })
  
  // Find the best primary key candidate
  let bestColumn = null
  let bestScore = 0
  
  candidateColumns.forEach((nameScore, column) => {
    const uniquenessScore = uniquenessScores.get(column) || 0
    const totalScore = nameScore + (uniquenessScore * 10) // Weight uniqueness heavily
    
    if (totalScore > bestScore && uniquenessScore > 0.8) { // Require high uniqueness
      bestScore = totalScore
      bestColumn = column
    }
  })
  
  return bestColumn
}

// Function moved to line 606

// Removed duplicate function implementation

function determineConsolidationStrategy(dataAnalysis: any): string {
  // Determine the best consolidation strategy based on data characteristics
  const { commonColumns, relationships, totalSheets } = dataAnalysis
  
  if (commonColumns.length > totalSheets * 0.5) {
    return 'merge' // High overlap, merge similar records
  } else if (relationships.length > 0 && relationships.some((r: any) => r.confidence > 0.7)) {
    return 'lookup' // Strong relationships, use lookup strategy
  } else if (commonColumns.length > 2) {
    return 'union' // Some common columns, union approach
  } else {
    return 'aggregate' // Different data types, aggregate approach
  }
}

function createIntelligentFallbackAnalysis(data: ConsolidatedData[]): GeminiAnalysis {
  const dataAnalysis = analyzeDataStructures(data)
  
  // Create horizontal merge - ONE ROW PER UNIQUE ENTITY
  const mergedData = createHorizontalMerge(data)
  
  return {
    masterWorkflow: [{
      consolidationStrategy: 'horizontal_merge',
      primaryKey: findBestPrimaryKey(data),
      mergeLogic: 'Entities merged horizontally by primary key, expanding columns instead of duplicating rows',
      columnExpansion: Array.from(new Set(mergedData.flatMap(row => Object.keys(row)))),
      conflictResolution: 'Most complete value selected for conflicting attributes'
    }],
    summary: `Successfully consolidated ${data.length} Excel sources using horizontal merge strategy. Created ${mergedData.length} unique entity records with expanded attribute columns instead of duplicate rows. Total columns: ${Object.keys(mergedData[0] || {}).length}`,
    insights: [
      `Identified ${mergedData.length} unique entities across all sources`,
      `Expanded to ${Object.keys(mergedData[0] || {}).length} total attributes per entity`,
      `Eliminated row duplication by merging attributes horizontally`,
      `Applied intelligent conflict resolution for overlapping attributes`
    ],
    recommendations: [
      'Establish consistent primary key standards across all data sources',
      'Use the consolidated view for comprehensive entity analysis',
      'Consider data validation rules to prevent attribute conflicts',
      'Implement regular data quality checks for entity consistency'
    ],
    consolidatedHeaders: Object.keys(mergedData[0] || {}),
    mergedData
  }
}

function createHorizontalMerge(data: ConsolidatedData[]): any[] {
  // Step 1: Find the best primary key across all data
  const primaryKey = detectSmartPrimaryKey(data)
  
  // Step 2: Create entity map for merging
  const entityMap = new Map<string, any>()
  
  // Step 3: Process each source and merge horizontally
  data.forEach(sheet => {
    sheet.data.forEach(row => {
      // Clean the row
      const cleanRow: any = {}
      Object.entries(row).forEach(([key, value]) => {
        const normalizedValue = normalizeBusinessValue(value, key)
        if (normalizedValue !== null && normalizedValue !== '' && normalizedValue !== undefined) {
          cleanRow[createBusinessColumnName(key)] = normalizedValue
        }
      })
      
      if (Object.keys(cleanRow).length === 0) return // Skip empty rows
      
      // Determine entity identifier
      let entityId: string
      if (primaryKey && cleanRow[primaryKey]) {
        entityId = String(cleanRow[primaryKey])
      } else {
        // Create composite key from available data
        entityId = createCompositeKey(cleanRow)
      }
      
      // Merge with existing entity or create new one
      if (entityMap.has(entityId)) {
        const existingEntity = entityMap.get(entityId)
        const mergedEntity = mergeEntityAttributes(existingEntity, cleanRow)
        entityMap.set(entityId, mergedEntity)
      } else {
        entityMap.set(entityId, cleanRow)
      }
    })
  })
  
  return Array.from(entityMap.values())
}

function detectSmartPrimaryKey(data: ConsolidatedData[]): string | null {
  const candidateKeys = new Map<string, { score: number, uniqueness: number }>()
  
  data.forEach(sheet => {
    if (sheet.data.length === 0) return
    
    const headers = Object.keys(sheet.data[0])
    headers.forEach(header => {
      const normalizedHeader = createBusinessColumnName(header)
      const lowerHeader = header.toLowerCase()
      
      // Score based on naming patterns
      let score = 0
      if (lowerHeader.includes('id')) score += 15
      if (lowerHeader.includes('key')) score += 12
      if (lowerHeader.includes('code')) score += 10
      if (lowerHeader.includes('name') && !lowerHeader.includes('filename')) score += 8
      if (lowerHeader.includes('reference') || lowerHeader.includes('ref')) score += 7
      if (lowerHeader.includes('number')) score += 5
      
      // Calculate uniqueness
      const values = sheet.data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '')
      const uniqueValues = new Set(values)
      const uniqueness = values.length > 0 ? uniqueValues.size / values.length : 0
      
      // Update candidate
      const existing = candidateKeys.get(normalizedHeader) || { score: 0, uniqueness: 0 }
      candidateKeys.set(normalizedHeader, {
        score: Math.max(existing.score, score),
        uniqueness: Math.max(existing.uniqueness, uniqueness)
      })
    })
  })
  
  // Find best primary key
  let bestKey = null
  let bestScore = 0
  
  candidateKeys.forEach(({ score, uniqueness }, key) => {
    const totalScore = score + (uniqueness * 20) // Weight uniqueness heavily
    if (totalScore > bestScore && uniqueness > 0.7) { // Require good uniqueness
      bestScore = totalScore
      bestKey = key
    }
  })
  
  return bestKey
}

function createCompositeKey(row: any): string {
  // Create a composite key from the most identifying fields
  const identifyingFields: string[] = []
  
  // Priority order for composite key
  const fieldPriority = ['Name', 'ID', 'Code', 'Title', 'Email', 'Phone']
  
  fieldPriority.forEach(field => {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      identifyingFields.push(String(row[field]))
    }
  })
  
  // If no priority fields, use first non-null values
  if (identifyingFields.length === 0) {
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && identifyingFields.length < 3) {
        identifyingFields.push(String(value))
      }
    })
  }
  
  return identifyingFields.join('|') || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function mergeEntityAttributes(existing: any, newRow: any): any {
  const merged = { ...existing }
  
  // Merge all attributes from newRow into existing
  Object.entries(newRow).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
        // Add new attribute
        merged[key] = value
      } else if (merged[key] !== value) {
        // Handle conflict - choose more complete value
        if (typeof value === 'string' && typeof merged[key] === 'string') {
          if (value.length > merged[key].length) {
            merged[key] = value
          }
        } else if (typeof value === 'number' && !isNaN(value)) {
          merged[key] = value // Prefer numbers over strings when possible
        }
        // For other conflicts, keep existing value (first-wins strategy)
      }
    }
  })
  
  return merged
}

function validateAndEnhanceAnalysis(analysis: any, data: ConsolidatedData[], dataAnalysis: any): GeminiAnalysis {
  const enhanced: GeminiAnalysis = {
    masterWorkflow: Array.isArray(analysis.masterWorkflow) ? analysis.masterWorkflow : [analysis.masterWorkflow || {}],
    summary: analysis.summary || 'Horizontal merge consolidation completed',
    insights: Array.isArray(analysis.insights) ? analysis.insights : [],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    consolidatedHeaders: Array.isArray(analysis.consolidatedHeaders) ? analysis.consolidatedHeaders : [],
    mergedData: Array.isArray(analysis.mergedData) && analysis.mergedData.length > 0 
      ? analysis.mergedData 
      : createHorizontalMerge(data)
  }
  
  // Ensure we have proper data structure
  if (!enhanced.mergedData || enhanced.mergedData.length === 0) {
    enhanced.mergedData = createHorizontalMerge(data)
  }
  
  // Update headers if they're missing
  if (!enhanced.consolidatedHeaders || enhanced.consolidatedHeaders.length === 0) {
    if (enhanced.mergedData.length > 0) {
      enhanced.consolidatedHeaders = Object.keys(enhanced.mergedData[0])
    }
  }
  
  return enhanced
}


function analyzeDataTypes(data: any[]): Record<string, string> {
  if (data.length === 0) return {}
  
  const types: Record<string, string> = {}
  const headers = Object.keys(data[0])
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined)
    types[header] = inferDataType(values)
  })
  
  return types
}

function inferDataType(values: any[]): string {
  if (values.length === 0) return 'unknown'
  
  const sample = values.slice(0, 10)
  
  if (sample.every(val => !isNaN(Number(val)) && val !== '')) return 'number'
  if (sample.some(val => !isNaN(Date.parse(val)))) return 'date'
  if (sample.every(val => ['true', 'false', '1', '0', 'yes', 'no'].includes(String(val).toLowerCase()))) {
    return 'boolean'
  }
  if (sample.some(val => /\S+@\S+\.\S+/.test(String(val)))) return 'email'
  if (sample.every(val => /^[A-Za-z0-9_-]+$/.test(String(val)))) return 'identifier'
  
  return 'text'
}

function findCommonPatterns(data: any[]): string[] {
  const patterns: string[] = []
  
  if (data.length === 0) return patterns
  
  const headers = Object.keys(data[0])
  
  const idColumns = headers.filter(h => 
    h.toLowerCase().includes('id') || 
    h.toLowerCase().includes('key') ||
    h.toLowerCase() === 'code'
  )
  if (idColumns.length > 0) patterns.push(`ID columns: ${idColumns.join(', ')}`)
  
  const nameColumns = headers.filter(h => 
    h.toLowerCase().includes('name') ||
    h.toLowerCase().includes('title')
  )
  if (nameColumns.length > 0) patterns.push(`Name columns: ${nameColumns.join(', ')}`)
  
  const dateColumns = headers.filter(h => 
    h.toLowerCase().includes('date') ||
    h.toLowerCase().includes('time') ||
    h.toLowerCase().includes('created') ||
    h.toLowerCase().includes('updated')
  )
  if (dateColumns.length > 0) patterns.push(`Date columns: ${dateColumns.join(', ')}`)
  
  return patterns
}

function findDataRelationship(sheet1: ConsolidatedData, sheet2: ConsolidatedData): any {
  if (sheet1.data.length === 0 || sheet2.data.length === 0) return null
  
  const headers1 = Object.keys(sheet1.data[0])
  const headers2 = Object.keys(sheet2.data[0])
  
  const commonCols = headers1.filter(h1 => 
    headers2.some(h2 => h1.toLowerCase() === h2.toLowerCase() || calculateSimilarity(h1, h2) > 0.8)
  )
  
  if (commonCols.length > 0) {
    return {
      type: 'potential_join',
      sheet1: sheet1.fileName,
      sheet2: sheet2.fileName,
      commonColumns: commonCols,
      confidence: commonCols.length / Math.min(headers1.length, headers2.length)
    }
  }
  
  return null
}


function createFallbackMergedData(data: ConsolidatedData[]): any[] {
  const mergedData: any[] = []
  
  data.forEach(sheet => {
    const sourceKey = `${sheet.fileName}_${sheet.sheetName}`.replace(/[^a-zA-Z0-9_]/g, '_')
    
    sheet.data.forEach(row => {
      const cleanRow: any = { Source: sourceKey }
      let hasValidData = false
      
      Object.entries(row).forEach(([key, value]) => {
        const normalizedValue = normalizeBusinessValue(value, key)
        if (normalizedValue !== null && normalizedValue !== '' && normalizedValue !== undefined) {
          cleanRow[createBusinessColumnName(key)] = normalizedValue
          hasValidData = true
        }
      })
      
      if (hasValidData) {
        mergedData.push(cleanRow)
      }
    })
  })
  
  return mergedData
}

function normalizeBusinessValue(value: any, columnName: string): any {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return null
  }
  
  const colLower = columnName.toLowerCase()
  
  // Normalize dates to standard format
  if (colLower.includes('date') || colLower.includes('time') || colLower.includes('created') || colLower.includes('updated')) {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    }
    return value
  }
  
  // Normalize currency/amounts
  if (colLower.includes('amount') || colLower.includes('price') || colLower.includes('cost') || colLower.includes('total')) {
    const numStr = String(value).replace(/[$,\s]/g, '')
    const num = parseFloat(numStr)
    if (!isNaN(num)) {
      return num
    }
    return value
  }
  
  // Normalize quantities
  if (colLower.includes('quantity') || colLower.includes('qty') || colLower.includes('count')) {
    const num = parseInt(String(value))
    if (!isNaN(num)) {
      return num
    }
    return value
  }
  
  // Normalize text fields
  if (typeof value === 'string') {
    return value.trim()
  }
  
  return value
}

function createBusinessColumnName(columnName: string): string {
  return columnName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase()) // Title case
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
