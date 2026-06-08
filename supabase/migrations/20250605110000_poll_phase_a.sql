-- Poll Phase A: launch_config snapshot on instances + poll_responses table (votes in Phase B).

ALTER TABLE activity_instances
  ADD COLUMN IF NOT EXISTS launch_config jsonb NULL;

COMMENT ON COLUMN activity_instances.launch_config IS
  'Immutable snapshot at launch. Poll: { type, question, options[], allowMultiple }';

CREATE TABLE IF NOT EXISTS poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_instance_id uuid NOT NULL
    REFERENCES activity_instances (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  class_id uuid NULL REFERENCES classes (id) ON DELETE SET NULL,
  selected_option_ids text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poll_responses_one_vote_per_student
    UNIQUE (activity_instance_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_responses_activity_instance_id
  ON poll_responses (activity_instance_id);

CREATE INDEX IF NOT EXISTS idx_poll_responses_class_id
  ON poll_responses (class_id);

CREATE INDEX IF NOT EXISTS idx_poll_responses_room_id
  ON poll_responses (room_id);

COMMENT ON TABLE poll_responses IS 'One vote per student per poll launch (activity_instance)';
