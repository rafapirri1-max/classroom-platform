-- Discussion V2: pairwise voting tournament.

CREATE TABLE IF NOT EXISTS discussion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_instance_id uuid NOT NULL
    REFERENCES activity_instances (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  left_response_id uuid NOT NULL REFERENCES discussion_responses (id) ON DELETE CASCADE,
  right_response_id uuid NOT NULL REFERENCES discussion_responses (id) ON DELETE CASCADE,
  selected_response_id uuid NOT NULL REFERENCES discussion_responses (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discussion_votes_left_right_distinct CHECK (left_response_id <> right_response_id),
  CONSTRAINT discussion_votes_one_per_pair
    UNIQUE (activity_instance_id, student_id, left_response_id, right_response_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_activity_instance_id
  ON discussion_votes (activity_instance_id);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_student_id
  ON discussion_votes (student_id);

COMMENT ON TABLE discussion_votes IS 'Pairwise comparison votes during discussion voting phase';
