import { UserButton, currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  let supabaseStatus = 'Not configured'

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
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl,
            }
          ])
      } else {
        // Update existing user
        await supabase
          .from('users')
          .update({
            email: user.emailAddresses[0]?.emailAddress || '',
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', user.id)
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
              <h1 className="text-2xl font-semibold text-gray-900">Colony Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.firstName}!</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-medium text-gray-900 mb-4">
                Welcome to Colony Dashboard
              </h2>
              <p className="text-gray-600 mb-4">
                Your automated multi-sheet consolidation and reporting platform is ready to use.
              </p>
              <p className="text-sm text-gray-500">
                Supabase status: {supabaseStatus}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
