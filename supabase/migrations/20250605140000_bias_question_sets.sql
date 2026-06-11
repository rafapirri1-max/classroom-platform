-- Bias Detective question sets: teacher-owned reusable content libraries.

CREATE TABLE IF NOT EXISTS bias_question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  question_count integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bias_question_sets_teacher_id
  ON bias_question_sets (teacher_id);

CREATE INDEX IF NOT EXISTS idx_bias_question_sets_teacher_updated
  ON bias_question_sets (teacher_id, updated_at DESC);

COMMENT ON TABLE bias_question_sets IS 'Reusable Bias Detective question sets owned by a teacher';
COMMENT ON COLUMN bias_question_sets.content IS 'Full gameData JSON matching Bias Detective schema';
COMMENT ON COLUMN bias_question_sets.is_default IS 'Reserved for future school-wide defaults; teachers sets use false';

CREATE OR REPLACE FUNCTION bias_question_sets_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bias_question_sets_updated_at ON bias_question_sets;
CREATE TRIGGER bias_question_sets_updated_at
  BEFORE UPDATE ON bias_question_sets
  FOR EACH ROW
  EXECUTE FUNCTION bias_question_sets_set_updated_at();
