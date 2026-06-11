GRANT SELECT, INSERT ON discussion_votes TO anon, authenticated;

ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discussion_votes_read" ON discussion_votes;
CREATE POLICY "discussion_votes_read"
  ON discussion_votes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "discussion_votes_insert" ON discussion_votes;
CREATE POLICY "discussion_votes_insert"
  ON discussion_votes FOR INSERT TO anon, authenticated WITH CHECK (true);
