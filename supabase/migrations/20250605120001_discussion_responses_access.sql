-- Ensure discussion_responses is writable by the anon/authenticated roles used by API routes.

GRANT SELECT, INSERT, UPDATE, DELETE ON discussion_responses TO anon, authenticated;

ALTER TABLE discussion_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discussion_responses_read" ON discussion_responses;
CREATE POLICY "discussion_responses_read"
  ON discussion_responses
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "discussion_responses_insert" ON discussion_responses;
CREATE POLICY "discussion_responses_insert"
  ON discussion_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
