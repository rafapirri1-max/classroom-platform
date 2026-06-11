-- API routes use anon key; grant access with permissive RLS (auth enforced in routes).

GRANT SELECT, INSERT ON wordcloud_responses TO anon, authenticated;

ALTER TABLE wordcloud_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wordcloud_responses_read" ON wordcloud_responses;
CREATE POLICY "wordcloud_responses_read"
  ON wordcloud_responses
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "wordcloud_responses_insert" ON wordcloud_responses;
CREATE POLICY "wordcloud_responses_insert"
  ON wordcloud_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
