-- Discussion V1: one written response per student per discussion launch.

CREATE TABLE IF NOT EXISTS discussion_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_instance_id uuid NOT NULL
    REFERENCES activity_instances (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  class_id uuid NULL REFERENCES classes (id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discussion_responses_one_per_student
    UNIQUE (activity_instance_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_responses_activity_instance_id
  ON discussion_responses (activity_instance_id);

CREATE INDEX IF NOT EXISTS idx_discussion_responses_room_id
  ON discussion_responses (room_id);

CREATE INDEX IF NOT EXISTS idx_discussion_responses_class_id
  ON discussion_responses (class_id);

COMMENT ON TABLE discussion_responses IS 'One written response per student per discussion activity_instance';
