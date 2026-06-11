-- Phase C: teacher moderation delete via API route (auth enforced in route).

GRANT DELETE ON wordcloud_responses TO anon, authenticated;

DROP POLICY IF EXISTS "wordcloud_responses_delete" ON wordcloud_responses;
CREATE POLICY "wordcloud_responses_delete"
  ON wordcloud_responses
  FOR DELETE
  TO anon, authenticated
  USING (true);
