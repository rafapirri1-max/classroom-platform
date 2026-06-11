export type PresentRoom = {
  id: string
  code: string
  status: string
  current_activity?: string | null
  active_activity_instance_id?: string | null
  class_id?: string | null
}

export type PresentInstanceMeta = {
  id: string
  activity_id: string
  started_at?: string
  status: string
}
