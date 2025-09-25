'use client'
import { UserButton, useUser } from '@clerk/nextjs'

export default function UserNav() {
  const { user } = useUser()
  return (
    <div className="flex items-center space-x-4">
      <span className="text-gray-700">Welcome, {user?.username || user?.firstName || 'User'}!</span>
      <UserButton afterSignOutUrl="/" />
    </div>
  )
}
