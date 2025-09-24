import { UserButton, currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { roomService } from '@/lib/supabase'

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  let supabaseStatus = 'Not configured'
  let userRooms: {
    id: string;
    name: string;
    description: string | null;
    room_code: string;
    room_members: Array<{ role: string }>;
  }[] = []

  // Save/update user in Supabase with error handling
  try {
    const supabase = createServerSupabaseClient()
    
    if (supabase) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single()

      if (!existingUser) {
        // Create new user
        await supabase
          .from('users')
          .insert([
            {
              clerk_user_id: user.id,
              email: user.emailAddresses[0]?.emailAddress || '',
              username: user.username || user.firstName || 'User',
              profile_image_url: user.profileImageUrl,
            }
          ])
      } else {
        // Update existing user
        await supabase
          .from('users')
          .update({
            email: user.emailAddresses[0]?.emailAddress || '',
            username: user.username || user.firstName || 'User',
            profile_image_url: user.profileImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', user.id)
      }
      
      // Get user's rooms
      try {
        userRooms = await roomService.getUserRooms(user.id)
      } catch (error) {
        console.error('Error fetching rooms:', error)
      }
      
      supabaseStatus = 'Connected and synced ✓'
    } else {
      supabaseStatus = 'Not configured (missing environment variables)'
    }
  } catch (error) {
    console.error('Error syncing user to Supabase:', error)
    supabaseStatus = 'Error occurred'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-semibold text-gray-900">
                Colony Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.username || user.firstName || 'User'}!</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Room Management Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Rooms</h2>
            
            <div className="flex gap-4 mb-6">
              <Link 
                href="/dashboard/rooms/create" 
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Create Room
              </Link>
              <Link 
                href="/dashboard/rooms/join" 
                className="border border-primary-500 text-primary-500 hover:bg-primary-50 font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Join Room
              </Link>
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userRooms.map((room) => (
                <Link key={room.id} href={`/dashboard/rooms/${room.id}`}>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{room.description || 'No description'}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Code: {room.room_code}</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {room.room_members[0]?.role}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              
              {userRooms.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 mb-4">You haven't joined any rooms yet.</p>
                  <Link 
                    href="/dashboard/rooms/create" 
                    className="text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Create your first room →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Automated Multi-Sheet Consolidation
            </h3>
            <p className="text-gray-600 mb-4">
              Your platform for automated reporting is ready to use.
            </p>
            <p className="text-sm text-gray-500">
              Supabase status: {supabaseStatus}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
