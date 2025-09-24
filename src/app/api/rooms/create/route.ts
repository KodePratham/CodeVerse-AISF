import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { roomService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 })
    }

    const room = await roomService.createRoom(name.trim(), description?.trim(), user.id)

    return NextResponse.json({ room }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating room:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create room' 
    }, { status: 500 })
  }
}
