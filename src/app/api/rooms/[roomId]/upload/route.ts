import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import * as XLSX from 'xlsx'
import { excelService, userService } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user is synced before proceeding
    try {
      await userService.ensureUser(
        user.id,
        user.emailAddresses[0]?.emailAddress || '',
        user.username || user.firstName || 'User',
        user.profileImageUrl
      )
    } catch (userError: any) {
      console.error('Error ensuring user exists during upload:', userError)
      return NextResponse.json({ error: 'User sync failed before upload' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const results = []

    // Process each sheet - simple cleaning only
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null })
      
      if (rawData.length > 0) {
        // Simple data cleaning - remove empty rows
        const cleanedData = rawData
          .map(row => {
            const cleanRow: any = {}
            let hasData = false
            
            Object.entries(row as Record<string, any>).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== '') {
                cleanRow[key] = typeof value === 'string' ? value.trim() : value
                hasData = true
              }
            })
            
            return hasData ? cleanRow : null
          })
          .filter(row => row !== null)
        
        if (cleanedData.length > 0) {
          // Save cleaned data to database
          const sheet = await excelService.saveExcelData(
            params.roomId,
            file.name,
            sheetName,
            cleanedData,
            user.id
          )
          
          results.push(sheet)
          console.log(`Saved ${cleanedData.length} rows from sheet "${sheetName}"`)
        } else {
          console.warn(`No valid data found in sheet "${sheetName}"`)
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        error: 'No valid data found in the uploaded file' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      sheets: results,
      message: `Successfully processed ${results.length} sheet(s)`,
      totalRowsProcessed: results.reduce((sum, sheet) => sum + sheet.row_count, 0)
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error uploading Excel file:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to upload Excel file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
