import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { userService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Syncing user:', {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      username: user.username || user.firstName
    })

    const supabaseUserId = await userService.syncUserFromClerk(
      user.id,
      user.emailAddresses[0]?.emailAddress || '',
      user.username || user.firstName || 'User',
      user.imageUrl
    )

    return NextResponse.json({ 
      success: true,
      supabaseUserId,
      message: 'User synchronized successfully'
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to sync user',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const supabaseUserId = await userService.getSupabaseUserId(user.id)
      return NextResponse.json({ 
        success: true,
        supabaseUserId,
        synced: true
      }, { status: 200 })
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        synced: false,
        message: 'User not found in database'
      }, { status: 404 })
    }

  } catch (error: any) {
    console.error('Error checking user sync:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to check user sync status'
    }, { status: 500 })
  }
}
