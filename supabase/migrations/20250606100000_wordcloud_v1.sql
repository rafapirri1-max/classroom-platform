-- Word Cloud V1: one short answer per student per word cloud launch.

CREATE TABLE IF NOT EXISTS wordcloud_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_instance_id uuid NOT NULL
    REFERENCES activity_instances (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  class_id uuid NULL REFERENCES classes (id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  normalized_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wordcloud_responses_one_per_student
    UNIQUE (activity_instance_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_wordcloud_responses_activity_instance_id
  ON wordcloud_responses (activity_instance_id);

CREATE INDEX IF NOT EXISTS idx_wordcloud_responses_room_id
  ON wordcloud_responses (room_id);

CREATE INDEX IF NOT EXISTS idx_wordcloud_responses_class_id
  ON wordcloud_responses (class_id);

COMMENT ON TABLE wordcloud_responses IS 'One short answer per student per word cloud activity_instance';
COMMENT ON COLUMN wordcloud_responses.normalized_text IS 'Lowercase trimmed answer used for future aggregation';
