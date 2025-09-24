import { NextRequest, NextResponse } from 'next/server'
import { analyzeExcelData } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { roomId, data } = await request.json()

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided for analysis' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    console.log(`Analyzing data for room ${roomId} with ${data.length} sheets`)

    const analysis = await analyzeExcelData(data)

    return NextResponse.json(analysis, { status: 200 })

  } catch (error: any) {
    console.error('Error in Gemini analysis:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to analyze data with Gemini',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
