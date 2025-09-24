-- Create master_workflows table
CREATE TABLE IF NOT EXISTS public.master_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL,
    created_by_user_id UUID NOT NULL,
    workflow_name CHARACTER VARYING(255) NOT NULL,
    consolidated_data JSONB,
    gemini_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_master_workflows_room_id 
        FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_master_workflows_created_by_user_id 
        FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_master_workflows_room_id ON public.master_workflows(room_id);
CREATE INDEX IF NOT EXISTS idx_master_workflows_created_by_user_id ON public.master_workflows(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_master_workflows_created_at ON public.master_workflows(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.master_workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view master workflows for rooms they belong to" ON public.master_workflows
    FOR SELECT USING (
        room_id IN (
            SELECT rm.room_id 
            FROM public.room_members rm 
            JOIN public.users u ON rm.user_id = u.id 
            WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Room members can create master workflows" ON public.master_workflows
    FOR INSERT WITH CHECK (
        room_id IN (
            SELECT rm.room_id 
            FROM public.room_members rm 
            JOIN public.users u ON rm.user_id = u.id 
            WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );
