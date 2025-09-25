import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { excelService } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; sheetId: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await excelService.deleteExcelSheet(params.sheetId, user.id)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete file' }, { status: 400 })
  }
}
