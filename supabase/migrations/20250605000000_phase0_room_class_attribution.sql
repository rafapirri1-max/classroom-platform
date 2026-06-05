-- Phase 0: Link live rooms and game sessions to teachers and classes.
-- All new columns are nullable so existing rows and ad-hoc rooms keep working.

-- Rooms: who owns the session and which class it is for (optional).
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES students (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_teacher_id ON rooms (teacher_id);
CREATE INDEX IF NOT EXISTS idx_rooms_class_id ON rooms (class_id);

COMMENT ON COLUMN rooms.teacher_id IS 'Teacher (students row) who created this room';
COMMENT ON COLUMN rooms.class_id IS 'Optional class this live session is attributed to';

-- Game sessions: which room/class produced this analytics row.
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions (room_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_class_id ON game_sessions (class_id);

COMMENT ON COLUMN game_sessions.room_id IS 'Live room where this session started';
COMMENT ON COLUMN game_sessions.class_id IS 'Class attribution; prefer over enrollment-only filtering when set';
