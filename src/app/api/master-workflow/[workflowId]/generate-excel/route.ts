import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { masterWorkflowService } from '@/lib/supabase'
import { createExcelBuffer } from '@/lib/gemini'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { instructions } = await request.json()
    if (!instructions || typeof instructions !== 'string') {
      return NextResponse.json({ error: 'No instructions provided' }, { status: 400 })
    }
    const workflow = await masterWorkflowService.downloadWorkflow(params.workflowId)
    if (!workflow || !workflow.gemini_analysis) {
      return NextResponse.json({ error: 'Workflow not found or no analysis' }, { status: 404 })
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    // Use Gemini to transform the data as per instructions
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const prompt = `
You are an expert data assistant. Given the following merged Excel data, perform the requested transformation and return ONLY valid JSON array of rows for Excel export.

Merged Data:
${JSON.stringify(workflow.gemini_analysis.mergedData?.slice(0, 100) || [], null, 2)}

User Instructions:
${instructions}

Respond ONLY with a JSON array of objects (rows) for Excel export.
`
    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text().trim()
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    let rows: any[] = []
    try {
      rows = JSON.parse(text)
      if (!Array.isArray(rows)) throw new Error('Not an array')
    } catch {
      return NextResponse.json({ error: 'AI response could not be parsed as Excel data.' }, { status: 500 })
    }

    // Use the headers from the first row, or fallback to original headers
    const headers = rows.length > 0 ? Object.keys(rows[0]) : (workflow.gemini_analysis.consolidatedHeaders || [])
    const buffer = createExcelBuffer(rows, headers)
    const headersObj = new Headers()
    headersObj.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headersObj.set('Content-Disposition', `attachment; filename="custom_report.xlsx"`)
    return new NextResponse(Buffer.from(buffer), { headers: headersObj })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate Excel file' }, { status: 500 })
  }
}
