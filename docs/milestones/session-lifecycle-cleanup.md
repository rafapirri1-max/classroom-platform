# Milestone: Session Lifecycle Cleanup

**Status:** Planned (not started)  
**Depends on:** Phase 0 (class–room–session attribution) — complete  
**Out of scope for Phase 0:** Session lifecycle, deduplication, analytics filtering

## Problem statement

`game_sessions` rows are created on every `start_session` (INSERT) and only finalized on `end_session` (UPDATE) when the game sends `GAME_SUBMIT`. That produces:

- Multiple incomplete rows (score 0, `completed` false/null) after relaunches, refreshes, or abandoned play
- No database distinction between *active*, *abandoned*, and *incomplete*
- Class analytics that include all rows in averages unless filtered in the UI

This is **accepted for Phase 0** and is not a blocker for attribution work.

## Goals

- Clearer teacher-facing analytics (completed work vs noise)
- Predictable attempt boundaries without breaking the plugin game flow
- Optional explicit status over time (if denormalized `completed` is insufficient)

## Non-goals (this milestone)

- Changing Phase 0 FKs (`rooms.class_id`, `game_sessions.room_id`, etc.)
- Lessons, activity registry, or new activity types
- Rewriting game iframes or `/api/track` contract without a migration path

## Option menu

Evaluate and implement **incrementally** (not all at once):

### 1. Hide incomplete sessions from analytics averages (default)

- **Idea:** Overview averages (score, accuracy, session counts) use `completed = true` only.
- **Pros:** Quick UI/query change; immediate cleaner dashboards.
- **Cons:** Hides in-progress play during live class unless labeled elsewhere.

### 2. Show incomplete sessions separately (“unfinished attempts”)

- **Idea:** Split UI into *Completed work* vs *Unfinished attempts* (or collapsible section).
- **Pros:** Transparent; teachers see both signal and noise.
- **Cons:** Slightly more UI complexity.

### 3. Abandoned status after timeout

- **Idea:** Background job or client hook: if `start_session` is older than N minutes with no `end_session`, mark abandoned (new column or status).
- **Pros:** Explicit lifecycle; enables filtering without guessing.
- **Cons:** Requires cron/edge function or teacher “end activity” signal; timezone/clock edge cases.

### 4. Prevent duplicate `start_session` rows (refresh / relaunch)

- **Idea:** Idempotency key per `(student_id, room_id, activity, attempt_generation)` or reuse open row if same room+activity within window.
- **Pros:** Fewer orphan rows; less DB noise.
- **Cons:** Must not break intentional teacher re-launch (waiting → game); needs clear rules.

### 5. Proper `session_status` field (later)

- **Idea:** Add `status` enum: `started` | `active` | `completed` | `abandoned` (and migrate from `completed` boolean).
- **Pros:** Single source of truth for reporting and AI features.
- **Cons:** Schema + backfill + all readers/writers updated.

## Recommended sequencing (suggestion only)

1. **(1) + (2)** — Analytics presentation (low risk, no schema).
2. **(4)** — Dedup rules with explicit re-launch behavior documented.
3. **(3)** — Timeout abandonment if still needed.
4. **(5)** — Status column when boolean `completed` is no longer enough.

## Acceptance criteria (when milestone is done)

- [ ] Teacher class analytics defaults reflect **completed** learning evidence.
- [ ] Unfinished attempts are visible or hidden **by choice**, not by accident.
- [ ] Teacher re-launch still starts a fresh student attempt when intended.
- [ ] Plugin games unchanged (`GAME_SUBMIT` → `end_session` path preserved).
- [ ] Phase 0 attribution (`room_id`, `class_id`) unchanged.

## References

- Tracking API: `app/api/track/route.ts` (`start_session`, `end_session`)
- Student attempt logic: `app/student/[roomId]/page.tsx` (`beginNewGameAttempt`)
- Class session queries: `lib/class-sessions.ts`
- Phase 0 migration: `supabase/migrations/20250605000000_phase0_room_class_attribution.sql`
