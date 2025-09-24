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
    
    // Limit data size but include structure analysis
    const limitedData = data.map(sheet => ({
      fileName: sheet.fileName,
      sheetName: sheet.sheetName,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      sampleData: sheet.data.slice(0, 8), // Sample data for analysis
      headers: sheet.data.length > 0 ? Object.keys(sheet.data[0]) : [],
      dataTypes: analyzeDataTypes(sheet.data.slice(0, 10)),
      commonPatterns: findCommonPatterns(sheet.data.slice(0, 10))
    }))

    const prompt = `
    You are a senior data analyst specializing in business data consolidation. 
    
    I have multiple Excel sheets that represent business data that needs to be naturally merged into a single, clean dataset:

    SHEETS TO CONSOLIDATE:
    ${JSON.stringify(limitedData, null, 2)}

    DATA STRUCTURE ANALYSIS:
    - Common columns across sheets: ${JSON.stringify(dataAnalysis.commonColumns)}
    - Similar columns (different names, same meaning): ${JSON.stringify(dataAnalysis.similarColumns)}
    - Unique columns per sheet: ${JSON.stringify(dataAnalysis.uniqueColumns)}
    - Potential data relationships: ${JSON.stringify(dataAnalysis.relationships)}

    CONSOLIDATION GOALS:
    1. Create a single, clean business dataset (NO source tracking columns)
    2. Intelligently merge rows based on business logic (not just append)
    3. Resolve column name conflicts by choosing the best standard name
    4. Handle duplicate records by merging or choosing the most complete version
    5. Create a natural business view that makes sense for reporting

    IMPORTANT RULES:
    - DO NOT include "Source_File", "Source_Sheet", "Original_Row" or any tracking columns
    - DO merge similar columns into one (e.g., "Customer Name" + "Client Name" = "Customer Name")  
    - DO remove duplicate records intelligently
    - DO standardize data formats (dates, numbers, text)
    - DO create a clean, business-ready dataset

    Return a JSON response with this structure:

    {
      "masterWorkflow": {
        "consolidationStrategy": "merge|union|lookup|aggregate",
        "primaryKey": "main_identifier_column",
        "columnMappings": {
          "old_column_name": "new_standardized_name"
        },
        "deduplicationRules": ["rule1", "rule2"],
        "businessLogic": "explanation of how data was consolidated"
      },
      "summary": "Clear explanation of what was consolidated and how",
      "insights": [
        "Business insight about the merged data",
        "Pattern discovered across sheets",
        "Data quality observation"
      ],
      "recommendations": [
        "Business recommendation based on the data",
        "Data improvement suggestion"
      ],
      "consolidatedHeaders": ["clean_column_1", "clean_column_2", "clean_column_3"],
      "mergedData": [
        // Clean, business-ready merged dataset
        // NO source tracking columns
        // Natural business records
      ]
    }

    Focus on creating clean, business-ready data that tells a coherent story.
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
  
  // Create intelligent column mapping without source tracking
  const columnMapping = createCleanColumnMapping(data, dataAnalysis)
  
  // Apply intelligent merging without metadata columns
  const mergedData = createCleanMerge(data, columnMapping, dataAnalysis)
  
  return {
    masterWorkflow: [{
      consolidationStrategy: determineConsolidationStrategy(dataAnalysis),
      primaryKey: findBestPrimaryKey(data),
      mappingRules: columnMapping,
      dataTransformations: [
        "Standardized column names across all sheets",
        "Merged similar columns with different names", 
        "Removed duplicate records based on key fields",
        "Applied consistent data formatting"
      ]
    }],
    summary: `Successfully consolidated ${data.length} Excel sheets into a unified business dataset. Applied ${determineConsolidationStrategy(dataAnalysis)} strategy to merge ${dataAnalysis.totalColumns} unique columns into ${Object.keys(mergedData[0] || {}).length} standardized fields. Processed ${mergedData.length} unique business records.`,
    insights: [
      `Consolidated data from ${data.length} different sources into single view`,
      `Identified and merged ${Object.keys(dataAnalysis.similarColumns).length} groups of similar columns`,
      `Applied business logic to resolve ${dataAnalysis.relationships.length} data relationships`,
      `Final dataset contains ${mergedData.length} clean business records`
    ],
    recommendations: [
      'Establish standard column naming conventions for future data uploads',
      'Implement data validation to ensure consistent formats across sources',
      'Consider creating data templates to standardize input formats',
      'Set up regular data quality checks for ongoing consolidation',
      'Use unique identifiers consistently across all data sources'
    ],
    consolidatedHeaders: Object.keys(mergedData[0] || {}),
    mergedData
  }
}

function createCleanColumnMapping(data: ConsolidatedData[], analysis: any): Record<string, string> {
  const mapping: Record<string, string> = {}
  const usedStandardNames = new Set<string>()
  
  // First pass: Map similar columns to the same standard name
  Object.entries(analysis.similarColumns).forEach((entry) => {
    const [mainCol, similarCols] = entry as [string, string[]];
    const standardName = createBusinessColumnName(mainCol)
    
    // Ensure unique standard names
    let finalName = standardName
    let counter = 1
    while (usedStandardNames.has(finalName)) {
      finalName = `${standardName} ${counter}`
      counter++
    }
    usedStandardNames.add(finalName)
    
    mapping[mainCol] = finalName
    similarCols.forEach(col => {
      mapping[col] = finalName
    })
  })
  
  // Second pass: Map remaining columns
  data.forEach(sheet => {
    if (sheet.data.length > 0) {
      Object.keys(sheet.data[0]).forEach(col => {
        if (!mapping[col]) {
          const standardName = createBusinessColumnName(col)
          let finalName = standardName
          let counter = 1
          while (usedStandardNames.has(finalName)) {
            finalName = `${standardName} ${counter}`
            counter++
          }
          usedStandardNames.add(finalName)
          mapping[col] = finalName
        }
      })
    }
  })
  
  return mapping
}

function createBusinessColumnName(columnName: string): string {
  // Convert to proper business column name
  let cleaned = columnName
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()

  // Common business term mappings
  const businessMappings: Record<string, string> = {
    'id': 'ID',
    'name': 'Name',
    'email': 'Email',
    'phone': 'Phone',
    'address': 'Address',
    'date': 'Date',
    'amount': 'Amount',
    'price': 'Price',
    'quantity': 'Quantity',
    'status': 'Status',
    'type': 'Type',
    'category': 'Category',
    'description': 'Description',
    'total': 'Total',
    'customer': 'Customer',
    'client': 'Customer', // Map client to customer
    'user': 'User',
    'product': 'Product',
    'service': 'Service',
    'order': 'Order',
    'invoice': 'Invoice',
    'payment': 'Payment'
  }

  // Apply business mappings
  const words = cleaned.split(' ')
  const mappedWords = words.map(word => {
    const lowerWord = word.toLowerCase()
    return businessMappings[lowerWord] || 
           word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })

  return mappedWords.join(' ')
}

function createCleanMerge(data: ConsolidatedData[], columnMapping: Record<string, string>, analysis: any): any[] {
  const mergedData: any[] = []
  const recordHashes = new Map<string, any>() // For deduplication
  
  // Determine primary key for deduplication
  const primaryKey = findBestPrimaryKey(data)
  
  data.forEach(sheet => {
    sheet.data.forEach((row, index) => {
      // Create clean record (no source tracking)
      const cleanRecord: any = {}
      
      // Apply column mapping and data normalization
      Object.entries(row).forEach(([originalCol, value]) => {
        const mappedCol = columnMapping[originalCol] || createBusinessColumnName(originalCol)
        cleanRecord[mappedCol] = normalizeBusinessValue(value, originalCol)
      })
      
      // Handle deduplication
      if (primaryKey && cleanRecord[primaryKey]) {
        const keyValue = String(cleanRecord[primaryKey])
        
        if (recordHashes.has(keyValue)) {
          // Merge with existing record, keeping most complete data
          const existing = recordHashes.get(keyValue)
          const merged = mergeBestRecord(existing, cleanRecord)
          recordHashes.set(keyValue, merged)
        } else {
          recordHashes.set(keyValue, cleanRecord)
        }
      } else {
        // No primary key - just add the record
        mergedData.push(cleanRecord)
      }
    })
  })
  
  // Add deduplicated records
  if (primaryKey) {
    mergedData.push(...Array.from(recordHashes.values()))
  }
  
  return mergedData
}

function mergeBestRecord(existing: any, newRecord: any): any {
  const merged = { ...existing }
  
  // For each field, choose the most complete/recent value
  Object.entries(newRecord).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      // If existing value is empty or new value is more complete
      if (!merged[key] || merged[key] === '' || 
          (typeof value === 'string' && value.length > String(merged[key] || '').length)) {
        merged[key] = value
      }
    }
  })
  
  return merged
}

function normalizeBusinessValue(value: any, columnName: string): any {
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

function validateAndEnhanceAnalysis(analysis: any, data: ConsolidatedData[], dataAnalysis: any): GeminiAnalysis {
  const enhanced: GeminiAnalysis = {
    masterWorkflow: Array.isArray(analysis.masterWorkflow) ? analysis.masterWorkflow : [analysis.masterWorkflow || {}],
    summary: analysis.summary || 'Business data consolidation completed',
    insights: Array.isArray(analysis.insights) ? analysis.insights : [],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    consolidatedHeaders: Array.isArray(analysis.consolidatedHeaders) ? analysis.consolidatedHeaders : [],
    mergedData: Array.isArray(analysis.mergedData) && analysis.mergedData.length > 0 
      ? analysis.mergedData 
      : createCleanMerge(data, createCleanColumnMapping(data, dataAnalysis), dataAnalysis)
  }
  
  // Ensure merged data doesn't have source tracking columns
  if (enhanced.mergedData.length > 0) {
    enhanced.mergedData = enhanced.mergedData.map(record => {
      const cleaned = { ...record }
      delete cleaned['Source File']
      delete cleaned['Source_File'] 
      delete cleaned['Source Sheet']
      delete cleaned['Source_Sheet']
      delete cleaned['Original Row']
      delete cleaned['Original_Row']
      delete cleaned['Data Quality Score']
      delete cleaned['Duplicate Flag']
      return cleaned
    })
    
    // Update headers to match cleaned data
    if (enhanced.mergedData.length > 0) {
      enhanced.consolidatedHeaders = Object.keys(enhanced.mergedData[0])
    }
  }
  
  return enhanced
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
