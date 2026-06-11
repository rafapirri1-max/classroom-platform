-- API routes use anon key; grant access with permissive RLS (teacher auth enforced in routes).

GRANT SELECT, INSERT, UPDATE, DELETE ON bias_question_sets TO anon, authenticated;

ALTER TABLE bias_question_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bias_question_sets_read" ON bias_question_sets;
CREATE POLICY "bias_question_sets_read"
  ON bias_question_sets
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "bias_question_sets_insert" ON bias_question_sets;
CREATE POLICY "bias_question_sets_insert"
  ON bias_question_sets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "bias_question_sets_update" ON bias_question_sets;
CREATE POLICY "bias_question_sets_update"
  ON bias_question_sets
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "bias_question_sets_delete" ON bias_question_sets;
CREATE POLICY "bias_question_sets_delete"
  ON bias_question_sets
  FOR DELETE
  TO anon, authenticated
  USING (true);
