import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs'
import { roomService, userService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomCode } = await request.json()

    if (!roomCode?.trim() || roomCode.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit room code is required' }, { status: 400 })
    }

    // Ensure user exists in Supabase first
    try {
      await userService.ensureUser(
        user.id,
        user.emailAddresses[0]?.emailAddress || '',
        user.username || user.firstName || 'User',
        user.profileImageUrl
      )
    } catch (userError) {
      console.error('Error ensuring user exists:', userError)
      return NextResponse.json({ error: 'User sync failed' }, { status: 500 })
    }

    const room = await roomService.joinRoom(roomCode.trim(), user.id)

    return NextResponse.json({ room }, { status: 200 })
  } catch (error: any) {
    console.error('Error joining room:', error)
    
    if (error.message === 'Room not found') {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 404 })
    }
    
    if (error.message.includes('already a member')) {
      return NextResponse.json({ error: 'You are already a member of this room' }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to join room' 
    }, { status: 500 })
  }
}
