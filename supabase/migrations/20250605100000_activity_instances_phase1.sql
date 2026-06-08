-- Phase 1: Activity Instances — runtime layer linking teacher launches to student sessions.
-- All new columns are nullable; existing game_sessions rows are unchanged.

CREATE TABLE IF NOT EXISTS activity_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  class_id uuid NULL REFERENCES classes (id) ON DELETE SET NULL,
  teacher_id uuid NULL REFERENCES students (id) ON DELETE SET NULL,
  activity_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  end_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_instances_room_id ON activity_instances (room_id);
CREATE INDEX IF NOT EXISTS idx_activity_instances_class_id ON activity_instances (class_id);
CREATE INDEX IF NOT EXISTS idx_activity_instances_room_active
  ON activity_instances (room_id) WHERE status = 'active';

COMMENT ON TABLE activity_instances IS 'One teacher launch of an activity in a room';
COMMENT ON COLUMN activity_instances.end_reason IS 'activity_ended | activity_switched | room_closed | superseded';

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS active_activity_instance_id uuid NULL
    REFERENCES activity_instances (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_active_activity_instance_id
  ON rooms (active_activity_instance_id);

COMMENT ON COLUMN rooms.active_activity_instance_id IS 'Currently live activity instance for this room';

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS activity_instance_id uuid NULL
    REFERENCES activity_instances (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_game_sessions_activity_instance_id
  ON game_sessions (activity_instance_id);

COMMENT ON COLUMN game_sessions.activity_instance_id IS 'Teacher launch this student attempt belongs to';
