-- Run this in Supabase SQL Editor BEFORE applying migrations.
-- Confirms FK column types match referenced primary keys.

SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND (
    (c.table_name = 'students' AND c.column_name = 'id')
    OR (c.table_name = 'rooms' AND c.column_name IN ('id', 'teacher_id', 'class_id'))
    OR (c.table_name = 'classes' AND c.column_name = 'id')
    OR (c.table_name = 'game_sessions' AND c.column_name IN ('id', 'student_id', 'room_id', 'class_id'))
    OR (c.table_name = 'activity_instances' AND c.column_name IN ('id', 'teacher_id', 'room_id', 'class_id'))
    OR (c.table_name = 'poll_responses' AND c.column_name = 'student_id')
    OR (c.table_name = 'discussion_responses' AND c.column_name = 'student_id')
  )
ORDER BY c.table_name, c.column_name;

-- Expected for this project's migrations (typical existing Supabase schema):
--   students.id          -> text
--   rooms.id             -> uuid
--   classes.id           -> uuid
--   game_sessions.student_id -> text (pre-existing)
--
-- New columns referencing students(id) must use text.
-- New columns referencing rooms(id) / classes(id) use uuid.
