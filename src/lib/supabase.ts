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

// Room-related functions
export const roomService = {
  async createRoom(name: string, description?: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    // Get the user ID from Supabase users table
    let userId = null
    if (clerkUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()
      
      if (userError || !userData) {
        throw new Error('User not found')
      }
      userId = userData.id
    }

    // Generate room code using the database function
    const { data: codeData, error: codeError } = await supabase.rpc('generate_room_code')
    if (codeError) throw codeError

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

    if (roomError) throw roomError

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('room_members')
      .insert([{
        room_id: room.id,
        user_id: userId,
        role: 'owner'
      }])

    if (memberError) throw memberError

    return room
  },

  async joinRoom(roomCode: string, clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    // Get the user ID from Supabase users table
    let userId = null
    if (clerkUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()
      
      if (userError || !userData) {
        throw new Error('User not found')
      }
      userId = userData.id
    }

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single()

    if (roomError || !room) throw new Error('Room not found')

    // Add user as member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert([{
        room_id: room.id,
        user_id: userId,
        role: 'member'
      }])

    if (memberError) throw memberError

    return room
  },

  async getUserRooms(clerkUserId?: string) {
    const supabase = createServerSupabaseClient()
    if (!supabase) throw new Error('Supabase not configured')

    // Get the user ID from Supabase users table
    let userId = null
    if (clerkUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()
      
      if (userError || !userData) {
        return []
      }
      userId = userData.id
    }

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