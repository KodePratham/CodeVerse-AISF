import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { roomService, userService } from '@/lib/supabase'

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

    // Ensure user exists in Supabase first
    try {
      await userService.ensureUser(
        user.id,
        user.emailAddresses[0]?.emailAddress || '',
        user.username || user.firstName || 'User',
        user.imageUrl
      )
    } catch (userError) {
      console.error('Error ensuring user exists:', userError)
      return NextResponse.json({ error: 'User sync failed' }, { status: 500 })
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
