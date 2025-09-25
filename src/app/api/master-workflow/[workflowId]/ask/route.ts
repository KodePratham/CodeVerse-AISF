import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { masterWorkflowService } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { question } = await request.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }
    if (!workflowId) {
      return NextResponse.json({ error: 'Missing workflowId param' }, { status: 400 })
    }
    const workflow = await masterWorkflowService.downloadWorkflow(workflowId)
    if (!workflow || !workflow.gemini_analysis) {
      return NextResponse.json({ error: 'Workflow not found or no analysis' }, { status: 404 })
    }

    // Use Gemini API to answer the question about the report
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const prompt = `
You are an AI assistant. Given the following report data and summary, answer the user's question concisely and helpfully.

Report Summary:
${workflow.gemini_analysis.summary}

Key Insights:
${(workflow.gemini_analysis.insights || []).join('\n')}

Merged Data (first 10 rows):
${JSON.stringify((workflow.gemini_analysis.mergedData || []).slice(0, 10), null, 2)}

User Question:
${question}

Answer:
`
    const result = await model.generateContent(prompt)
    const response = await result.response
    const answer = response.text().trim()
    return NextResponse.json({ answer })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to answer question' }, { status: 500 })
  }
}
