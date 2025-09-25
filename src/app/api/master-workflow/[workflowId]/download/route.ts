import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { masterWorkflowService } from '@/lib/supabase'
import { createExcelBuffer } from '@/lib/gemini'

export async function GET(
  request: NextRequest,
  context: { params: { workflowId: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workflow = await masterWorkflowService.downloadWorkflow(context.params.workflowId)
    
    if (!workflow.gemini_analysis?.mergedData || !workflow.gemini_analysis?.consolidatedHeaders) {
      return NextResponse.json({ error: 'Workflow data is incomplete' }, { status: 400 })
    }

    const buffer = createExcelBuffer(
      workflow.gemini_analysis.mergedData,
      workflow.gemini_analysis.consolidatedHeaders
    )

    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="${workflow.workflow_name}.xlsx"`)

    return new NextResponse(Buffer.from(buffer), { headers })

  } catch (error: any) {
    console.error('Error downloading master workflow:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to download master workflow' 
    }, { status: 500 })
  }
}
