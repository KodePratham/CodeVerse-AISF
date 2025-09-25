import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { userService, mapClerkPlanToTier } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { subscription_tier } = await request.json()
    const tier = mapClerkPlanToTier(subscription_tier)
    await userService.setSubscriptionTier(user.id, tier)
    return NextResponse.json({ success: true, tier })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to sync plan' }, { status: 500 })
  }
}
