# Database migrations

Apply SQL files in order via the [Supabase SQL Editor](https://supabase.com/dashboard) or the Supabase CLI (`supabase db push`).

## Phase 0 — `20250605000000_phase0_room_class_attribution.sql`

Adds optional links between live rooms, classes, and analytics:

- `rooms.teacher_id`, `rooms.class_id`
- `game_sessions.room_id`, `game_sessions.class_id`

Existing rows are unchanged (columns default to `NULL`).

## Phase 1 — `20250605100000_activity_instances_phase1.sql`

Adds the runtime layer linking teacher launches to student sessions:

- `activity_instances` table
- `rooms.active_activity_instance_id`
- `game_sessions.activity_instance_id`

Existing `game_sessions` rows keep `activity_instance_id = NULL` and remain visible in analytics.

## Poll Phase A — `20250605110000_poll_phase_a.sql`

Poll launch support (votes in a later phase):

- `activity_instances.launch_config` — poll question/options snapshot at launch
- `poll_responses` table — empty until Phase B voting
