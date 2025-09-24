import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { masterWorkflowService } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const masterWorkflow = await masterWorkflowService.createMasterWorkflow(
      params.roomId,
      user.id
    )

    return NextResponse.json({ 
      success: true, 
      masterWorkflow,
      message: 'Master workflow created successfully' 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating master workflow:', error)
    
    if (error.message.includes('No Excel data found')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create master workflow' 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const masterWorkflows = await masterWorkflowService.getMasterWorkflows(params.roomId)

    return NextResponse.json({ masterWorkflows }, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching master workflows:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch master workflows' 
    }, { status: 500 })
  }
}
     