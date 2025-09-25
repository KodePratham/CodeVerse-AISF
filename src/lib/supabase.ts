import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Don't throw during build - allow graceful degradation
const isConfigured = supabaseUrl && supabaseAnonKey

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

// For server-side operations
export const createServerSupabaseClient = () => {
  if (!isConfigured) {
    console.warn('Supabase not configured - environment variables missing')
    return null
  }
  
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing, using anon key')
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Database types
export interface User {
  id: string
  clerk_user_id: string
  email: string
  username: string | null
  profile_image_url: string | null
  subscription_tier: 'free' | 'pro'
  storage_used_mb: number
  storage_limit_mb: number
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  room_code: string
  name: string
  description: string | null
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface RoomWithMembers extends Room {
  room_members: (RoomMember & { users: User })[]
}

export interface ExcelSheet {
  id: string
  room_id: string
  uploaded_by_user_id: string
  file_name: string
  sheet_name: string
  sheet_data: any[]
  upload_date: string
  row_count: number
  column_count: number
  created_at: string
  updated_at: string
}

export interface MasterWorkflow {
  id: string
  room_id: string
  created_by_user_id: string
  workflow_name: string
  consolidated_data: any
  gemini_analysis: any
  created_at: string
  updated_at: string
}

// Add user service for better user management
export const userService = {
  async ensureUser(clerkUserId: string, email: string, username?: string, profileImageUrl?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    try {
      console.log('Ensuring user exists:', { clerkUserId, email, username })

      // First try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user:', fetchError)
        throw new Error(`Database query failed: ${fetchError.message}`)
      }

      if (existingUser) {
        console.log('User already exists:', existingUser.id)
        // Update user info if needed
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email,
            username: username || existingUser.username || 'User',
            profile_image_url: profileImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', clerkUserId)

        if (updateError) {
          console.warn('Failed to update user info:', updateError)
          // Don't throw - existing user is still valid
        }

        return existingUser.id
      }

      // If user doesn't exist, create them
      console.log('Creating new user...')
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          clerk_user_id: clerkUserId,
          email,
          username: username || 'User',
          profile_image_url: profileImageUrl,
          subscription_tier: 'free', // Default subscription tier
          storage_used_mb: 0, // Default storage used
          storage_limit_mb: 100, // Default storage limit (100MB)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        
        // Check if it's a unique constraint violation (user was created by another request)
        if (createError.code === '23505') {
          console.log('User was created by another request, fetching...')
          const { data: retryUser, error: retryError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', clerkUserId)
            .single()
          
          if (retryError) {
            throw new Error(`Failed to create or fetch user: ${createError.message}`)
          }
          
          return retryUser.id
        }
        
        throw new Error(`Failed to create user: ${createError.message}`)
      }

      console.log('User created successfully:', newUser.id)
      return newUser.id

    } catch (error: any) {
      console.error('Error in ensureUser:', error)
      throw error
    }
  },

  async getSupabaseUserId(clerkUserId: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()
      
      if (userError) {
        console.error('Error fetching user ID:', userError)
        throw new Error(`User not found in database: ${userError.message}`)
      }

      if (!userData) {
        throw new Error('User not found in database')
      }

      return userData.id
    } catch (error: any) {
      console.error('Error in getSupabaseUserId:', error)
      throw error
    }
  },

  async syncUserFromClerk(clerkUserId: string, email: string, username?: string, profileImageUrl?: string) {
    try {
      return await this.ensureUser(clerkUserId, email, username, profileImageUrl)
    } catch (error: any) {
      console.error('Failed to sync user from Clerk:', error)
      throw new Error(`User synchronization failed: ${error.message}`)
    }
  }
}

// Room-related functions
export const roomService = {
  async createRoom(name: string, description?: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    if (!clerkUserId) {
      throw new Error('User authentication required')
    }

    // Ensure user exists and get their Supabase ID
    const userId = await userService.getSupabaseUserId(clerkUserId)

    // Generate room code using the database function
    const { data: codeData, error: codeError } = await supabase.rpc('generate_room_code')
    if (codeError) {
      console.error('Error generating room code:', codeError)
      throw new Error('Failed to generate room code')
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert([{ 
        room_code: codeData,
        name, 
        description,
        created_by_user_id: userId,
      }])
      .select()
      .single()

    if (roomError) {
      console.error('Error creating room:', roomError)
      throw roomError
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('room_members')
      .insert([{
        room_id: room.id,
        user_id: userId,
        role: 'owner'
      }])

    if (memberError) {
      console.error('Error adding room member:', memberError)
      throw memberError
    }

    return room
  },

  async joinRoom(roomCode: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    if (!clerkUserId) {
      throw new Error('User authentication required')
    }

    // Ensure user exists and get their Supabase ID
    const userId = await userService.getSupabaseUserId(clerkUserId)

    // Find room by code (case insensitive)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode.toUpperCase())
      .single()

    if (roomError || !room) throw new Error('Room not found')

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      throw new Error('You are already a member of this room')
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert([{
        room_id: room.id,
        user_id: userId,
        role: 'member'
      }])

    if (memberError) {
      console.error('Error joining room:', memberError)
      throw memberError
    }

    return room
  },

  async getUserRooms(clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    if (!clerkUserId) {
      return []
    }

    try {
      // Get the user ID from Supabase users table
      const userId = await userService.getSupabaseUserId(clerkUserId)

      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_members!inner(role, joined_at)
        `)
        .eq('room_members.user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching user rooms:', error)
        return []
      }

      return data as RoomWithMembers[]
    } catch (error) {
      console.error('Error in getUserRooms:', error)
      return []
    }
  },

  async getRoomWithMembers(roomId: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_members(
          *,
          users(id, username, profile_image_url)
        )
      `)
      .eq('id', roomId)
      .single()

    if (error) {
      console.error('Error fetching room with members:', error)
      throw error
    }
    
    return data as RoomWithMembers
  }
}

// Excel-related functions
export const excelService = {
  async saveExcelData(roomId: string, fileName: string, sheetName: string, data: any[], clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    if (!clerkUserId) {
      throw new Error('User authentication required')
    }

    // Ensure user exists and get their Supabase ID
    const userId = await userService.getSupabaseUserId(clerkUserId)

    // Create excel_sheet record with all data in sheet_data column
    const { data: sheet, error: sheetError } = await supabase
      .from('excel_sheets')
      .insert([{
        room_id: roomId,
        uploaded_by_user_id: userId,
        file_name: fileName,
        sheet_name: sheetName,
        sheet_data: data,
        row_count: data.length,
        column_count: data.length > 0 ? Object.keys(data[0]).length : 0,
        upload_date: new Date().toISOString()
      }])
      .select()
      .single()

    if (sheetError) {
      console.error('Error creating excel sheet:', sheetError)
      throw sheetError
    }

    return sheet
  },

  async getRoomExcelSheets(roomId: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase
      .from('excel_sheets')
      .select(`
        *,
        users(username, profile_image_url)
      `)
      .eq('room_id', roomId)
      .order('upload_date', { ascending: false })

    if (error) {
      console.error('Error fetching excel sheets:', error)
      return []
    }

    return data
  },

  async getExcelSheetData(sheetId: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase
      .from('excel_sheets')
      .select('sheet_data')
      .eq('id', sheetId)
      .single()

    if (error) {
      console.error('Error fetching excel data:', error)
      throw error
    }

    return data.sheet_data || []
  },

  async deleteExcelSheet(sheetId: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')
    if (!clerkUserId) throw new Error('User authentication required')

    // Ensure user is uploader or room admin/owner
    // Fetch sheet and room membership
    const { data: sheet, error: sheetError } = await supabase
      .from('excel_sheets')
      .select('uploaded_by_user_id, room_id')
      .eq('id', sheetId)
      .single()
    if (sheetError || !sheet) throw new Error('Excel sheet not found')

    const userId = await userService.getSupabaseUserId(clerkUserId)
    if (sheet.uploaded_by_user_id !== userId) {
      // Check if user is admin/owner in the room
      const { data: member, error: memberError } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', sheet.room_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (
        memberError ||
        !member ||
        (member.role !== 'owner' && member.role !== 'admin')
      ) {
        throw new Error('You do not have permission to delete this file')
      }
    }

    const { error: deleteError } = await supabase
      .from('excel_sheets')
      .delete()
      .eq('id', sheetId)
    if (deleteError) throw new Error('Failed to delete Excel sheet')
    return true
  }
}

// Master Workflow Service
export const masterWorkflowService = {
  async createMasterWorkflow(roomId: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    if (!clerkUserId) {
      throw new Error('User authentication required')
    }

    // Ensure user exists and get their Supabase ID
    const userId = await userService.getSupabaseUserId(clerkUserId)

    // Check if user is a member of the room
    const { data: roomMember, error: memberError } = await supabase
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single()

    if (memberError || !roomMember) {
      throw new Error('You must be a member of this room to create master workflows')
    }

    // Get all Excel data from the room (now from sheet_data column)
    const { data: allExcelData, error: dataError } = await supabase
      .from('excel_sheets')
      .select(`
        id,
        file_name,
        sheet_name,
        row_count,
        column_count,
        sheet_data
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (dataError) {
      console.error('Error fetching Excel data:', dataError)
      throw new Error('Failed to fetch Excel data')
    }

    if (!allExcelData || allExcelData.length === 0) {
      throw new Error('No Excel data found in this room')
    }

    console.log(`Processing ${allExcelData.length} sheets for consolidation`)

    // Prepare data for analysis (now much simpler)
    const consolidatedData = allExcelData.map(sheet => ({
      fileName: sheet.file_name,
      sheetName: sheet.sheet_name,
      rowCount: sheet.row_count,
      columnCount: sheet.column_count,
      data: sheet.sheet_data || []
    }))

    console.log('Consolidated data prepared, calling Gemini analysis...')

    // Call Gemini API for analysis
    try {
      const { analyzeExcelData } = await import('./gemini')
      const geminiAnalysis = await analyzeExcelData(consolidatedData)

      console.log('Gemini analysis completed, saving to database...')

      // Save master workflow to database
      const { data: masterWorkflow, error: workflowError } = await supabase
        .from('master_workflows')
        .insert([{
          room_id: roomId,
          created_by_user_id: userId,
          workflow_name: `Master Workflow - ${new Date().toLocaleDateString()}`,
          consolidated_data: consolidatedData,
          gemini_analysis: geminiAnalysis,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (workflowError) {
        console.error('Error saving master workflow:', workflowError)
        throw new Error(`Failed to save master workflow: ${workflowError.message}`)
      }

      console.log('Master workflow saved successfully:', masterWorkflow.id)

      return {
        ...masterWorkflow,
        consolidated_data: consolidatedData,
        gemini_analysis: geminiAnalysis
      }

    } catch (error: any) {
      console.error('Error in master workflow creation:', error)
      throw new Error(`Master workflow creation failed: ${error.message}`)
    }
  },

  async getMasterWorkflows(roomId: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    try {
      const { data, error } = await supabase
        .from('master_workflows')
        .select(`
          *,
          users(username, profile_image_url)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching master workflows:', error)
        return []
      }

      // Parse JSON strings back to objects
      return (data || []).map(workflow => ({
        ...workflow,
        consolidated_data: typeof workflow.consolidated_data === 'string' 
          ? JSON.parse(workflow.consolidated_data) 
          : workflow.consolidated_data,
        gemini_analysis: typeof workflow.gemini_analysis === 'string' 
          ? JSON.parse(workflow.gemini_analysis) 
          : workflow.gemini_analysis
      }))

    } catch (error) {
      console.error('Error in getMasterWorkflows:', error)
      return []
    }
  },

  async downloadWorkflow(workflowId: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase
      .from('master_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (error || !data) {
      throw new Error('Master workflow not found')
    }

    // Parse JSON strings back to objects
    const workflow = {
      ...data,
      consolidated_data: typeof data.consolidated_data === 'string' 
        ? JSON.parse(data.consolidated_data) 
        : data.consolidated_data,
      gemini_analysis: typeof data.gemini_analysis === 'string' 
        ? JSON.parse(data.gemini_analysis) 
        : data.gemini_analysis
    }

    return workflow
  },

  async deleteMasterWorkflow(workflowId: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')
    if (!clerkUserId) throw new Error('User authentication required')

    // Fetch workflow and room membership
    const { data: workflow, error: workflowError } = await supabase
      .from('master_workflows')
      .select('created_by_user_id, room_id')
      .eq('id', workflowId)
      .single()
    if (workflowError || !workflow) throw new Error('Workflow not found')

    const userId = await userService.getSupabaseUserId(clerkUserId)
    if (workflow.created_by_user_id !== userId) {
      // Check if user is admin/owner in the room
      const { data: member, error: memberError } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', workflow.room_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (
        memberError ||
        !member ||
        (member.role !== 'owner' && member.role !== 'admin')
      ) {
        throw new Error('You do not have permission to delete this workflow')
      }
    }

    const { error: deleteError } = await supabase
      .from('master_workflows')
      .delete()
      .eq('id', workflowId)
    if (deleteError) throw new Error('Failed to delete workflow')
    return true
  }
}