# Database migrations

Apply SQL files in order via the [Supabase SQL Editor](https://supabase.com/dashboard) or the Supabase CLI (`supabase db push`).

## Phase 0 — `20250605000000_phase0_room_class_attribution.sql`

Adds optional links between live rooms, classes, and analytics:

- `rooms.teacher_id`, `rooms.class_id`
- `game_sessions.room_id`, `game_sessions.class_id`

Existing rows are unchanged (columns default to `NULL`).
