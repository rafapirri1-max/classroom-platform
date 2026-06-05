import type { SupabaseClient } from '@supabase/supabase-js'

export type CreateRoomInput = {
  teacherId: string
  classId?: string | null
}

function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/** Creates an active room with optional class attribution. */
export async function createTeacherRoom(
  supabase: SupabaseClient,
  { teacherId, classId }: CreateRoomInput
) {
  return supabase
    .from('rooms')
    .insert({
      code: generateRoomCode(),
      status: 'active',
      teacher_id: teacherId,
      class_id: classId || null,
    })
    .select()
    .single()
}
