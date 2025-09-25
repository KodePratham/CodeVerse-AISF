import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { roomService, excelService, masterWorkflowService } from '@/lib/supabase'
import ExcelUpload from '@/components/ExcelUpload'
import MasterWorkflow from '@/components/MasterWorkflow'
import ExcelSheetList from '@/components/ExcelSheetList'

export default async function RoomPage({ params }: { params: { id: string } }) {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  let room = null
  let error = ''
  let excelSheets = []
  let masterWorkflows = []
  let isOwner = false

  try {
    room = await roomService.getRoomWithMembers(params.id)
    excelSheets = await excelService.getRoomExcelSheets(params.id)
    masterWorkflows = await masterWorkflowService.getMasterWorkflows(params.id)
    
    // Check if current user is the owner
    const currentMember = room.room_members?.find(member => 
      member.users?.clerk_user_id === user.id
    )
    isOwner = currentMember?.role === 'owner'
    
  } catch (err) {
    error = 'Room not found or access denied'
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Room Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/dashboard" className="text-primary-500 hover:text-primary-600">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-semibold text-gray-900">
                Colony Dashboard
              </Link>
              <span className="mx-4 text-gray-400">/</span>
              <span className="text-gray-600">{room.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Room Code: <span className="font-mono font-medium text-lg bg-gray-100 px-2 py-1 rounded">{room.room_code}</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{room.name}</h1>
            {room.description && (
              <p className="text-gray-600">{room.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Members Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Members ({room.room_members?.length || 0})
              </h2>
              <div className="space-y-3">
                {room.room_members?.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <img
                      src={member.users?.profile_image_url || `https://ui-avatars.com/api/?name=${member.users?.username || 'User'}&background=f3f4f6&color=374151`}
                      alt={member.users?.username || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {member.users?.username || 'Anonymous User'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                )) || (
                  <p className="text-gray-500 text-sm">No members found</p>
                )}
              </div>
            </div>

            {/* Dashboard Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Master Workflow Section */}
              <MasterWorkflow 
                roomId={params.id} 
                existingWorkflows={masterWorkflows}
              />

              {/* Excel Data Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Excel Data</h2>
                  <ExcelUpload roomId={params.id} />
                </div>
                <ExcelSheetList roomId={params.id} excelSheets={excelSheets} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
