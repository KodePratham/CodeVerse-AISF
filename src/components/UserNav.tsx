'use client'
import { UserButton, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function UserNav() {
  const { user, isLoaded } = useUser()
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return

    // Clerk's subscription info is in user.publicMetadata or user.privateMetadata depending on your setup
    // For Clerk Billing, use user.subscription or user.publicMetadata.subscription_tier
    // We'll use publicMetadata.subscription_tier if available, else fallback to 'free_user'
    const clerkTier =
      (user.publicMetadata?.subscription_tier as string) ||
      (user.organizationMemberships?.[0]?.publicMetadata?.subscription_tier as string) ||
      'free_user'

    // Always lowercase for consistency
    const normalizedClerkTier =
      clerkTier === 'pro_user' ? 'pro_user' : 'free_user'

    // Call API to sync if needed
    setSyncing(true)
    fetch('/api/users/sync-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_tier: normalizedClerkTier }),
    }).finally(() => setSyncing(false))
  }, [isLoaded, user?.id])

  return (
    <div className="flex items-center space-x-4">
      <span className="text-gray-700">
        Welcome, {user?.username || user?.firstName || 'User'}!
        <span className="ml-2 text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 border border-primary-200">
          {user?.publicMetadata?.subscription_tier === 'pro_user' ? 'Pro' : 'Free'}
        </span>
      </span>
      <UserButton afterSignOutUrl="/" />
    </div>
  )
}
