# Classroom Platform — Project Handoff (June 2026)

**Repository:** `classroom-platform`  
**Version:** 1.0.0  
**Last updated:** June 2026  
**Purpose:** Single-source handoff for new developers, Cursor sessions, or ChatGPT conversations.

---

## Table of Contents

1. [What This Project Is](#what-this-project-is)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Environment & Setup](#environment--setup)
5. [Application Surfaces](#application-surfaces)
6. [Database Structure Overview](#database-structure-overview)
7. [Database Migrations](#database-migrations)
8. [Activity System Overview](#activity-system-overview)
9. [Bias Detective Status](#bias-detective-status)
10. [Discussion Activity Status](#discussion-activity-status)
11. [Poll Activity Status](#poll-activity-status)
12. [Presentation View Status](#presentation-view-status)
13. [Analytics Status](#analytics-status)
14. [API Reference](#api-reference)
15. [Key Library Modules](#key-library-modules)
16. [Recently Completed Features](#recently-completed-features)
17. [Important Design Decisions](#important-design-decisions)
18. [Current Known Issues](#current-known-issues)
19. [Outstanding TODOs](#outstanding-todos)
20. [Future Roadmap](#future-roadmap)
21. [Quick Start for New Maintainers](#quick-start-for-new-maintainers)

---

## What This Project Is

An interactive **live classroom platform** where teachers create rooms, launch activities, and students join on tablets/laptops. Teachers project a **Presentation View** while students interact on their devices.

**Core user flows:**

1. Teacher signs in → creates a class → creates a room (4-digit code)
2. Students join via `/?room=CODE` (name entry; optional auth for tracked activities)
3. Teacher launches an activity from the Teacher Room page
4. Students see the activity on `/student/[roomId]`
5. Teacher opens `/present/[roomId]` on a projector
6. Game results flow into class analytics (Bias Detective today)

**Activity types today:**

| Activity | Student UI | Tracked in `game_sessions` | Has `launch_config` |
|----------|-----------|---------------------------|---------------------|
| `waiting` | Standby screen | No | No |
| `bias-detective` | iframe game | Yes | Yes (question sets) |
| `poll` | In-app poll UI | No | Yes |
| `discussion` | In-app discussion UI | No | Yes |
| `wordcloud` | Reserved | No | — |

**Legacy parallel feature:** The **Unfair** team game (`/teacher/sets`, `/teacher/launch-unfair`, `/teacher/unfair-host`) uses separate tables (`game_sets`, `unfair_game_sessions`) and Supabase Realtime — **not** integrated with `activity_instances`.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js 14 App Router                           │
├──────────────┬──────────────┬──────────────┬────────────────────────────┤
│   Teacher    │   Student    │ Presentation │        API Routes          │
│   surfaces   │   surfaces   │   /present   │   (Supabase anon key)      │
└──────┬───────┴──────┬───────┴──────┬───────┴────────────┬─────────────┘
       │              │              │                      │
       └──────────────┴──────────────┴──────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Supabase (Postgres) │
                    │  + Realtime (rooms)  │
                    │  + Auth              │
                    └─────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
  activity_instances    game_sessions      poll_responses
  launch_config         question_attempts  discussion_responses
  rooms / participants                       discussion_votes
                                           bias_question_sets
```

### Architectural layers

| Layer | Location | Role |
|-------|----------|------|
| **Static game plugins** | `public/games/{id}/` | Self-contained HTML games loaded in student iframes |
| **Activity registry (Engine v1)** | `lib/activity-engine/` | Discovers `game.json` files; exposes `ActivityDefinition` |
| **Platform activities** | `lib/poll/`, `lib/discussion/` | Hardcoded activities outside the registry |
| **Instance lifecycle** | `lib/activity-instances.ts` | Teacher launch → `activity_instances` row → room pointer |
| **Student session lifecycle** | `lib/session-lifecycle/` | Deduped `start_session`, localStorage run keys, analytics partitioning |
| **Presentation layer** | `lib/present/` | Projector-optimized views per activity |
| **API routes** | `app/api/` | Server endpoints using Supabase client + app-level auth checks |

### Realtime

- **Presentation View** subscribes to `rooms` UPDATE via Supabase Realtime channel
- **Student room** polls/refreshes room state on activity changes
- **Unfair game** uses dedicated Realtime channels (legacy)

### Auth model

- Supabase Auth for sign-in
- Profile row in `students` table linked by `auth_id`
- Roles: `student` | `teacher` on `students.role`
- **API security:** Teacher authorization is **application-level** — routes compare `teacher_id` in request body/query to `rooms.teacher_id`. RLS on new tables is permissive (`USING (true)`); route handlers enforce access.
- Students can join rooms by display name without auth (`participants` table); signed-in students use `students.id` for poll, discussion, and tracked games.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | **Next.js 14.2.5** (App Router) |
| UI | **React 18.3**, **Tailwind CSS 3.4** |
| Language | **TypeScript 5.5** (strict) |
| Database / Auth | **Supabase** (`@supabase/supabase-js` 2.47) |
| QR codes | `qrcode` (teacher room join + presentation) |
| Path alias | `@/*` → repo root |

**Scripts:**

```bash
npm run dev      # Local development (localhost:3000)
npm run build    # Production build
npm run start    # Production server
```

**No test runner or ESLint script** is configured in `package.json`. Type-checking happens during `next build`.

---

## Environment & Setup

Copy `.env.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

No service role key is used in the app. All API routes use the anon key.

**First-time setup:**

```bash
npm install
cp .env.example .env.local
# Fill in Supabase credentials
npm run dev
```

**Database:** Apply migrations in order (see [Database Migrations](#database-migrations)). Run `supabase/migrations/schema_type_check.sql` first to verify `students.id` column type.

---

## Application Surfaces

### Student

| Route | Purpose |
|-------|---------|
| `/` | Join room by code, join class, auth links |
| `/login` | Student login/signup |
| `/student/[roomId]` | **Live room** — games (iframe), poll, discussion voting |
| `/student/profile` | Profile, recent sessions, badges |
| `/student/[roomId]/unfair` | Legacy Unfair game student view |

### Teacher

| Route | Purpose |
|-------|---------|
| `/teacher` | Dashboard — classes, rooms |
| `/teacher/login` | Teacher login/signup |
| `/teacher/classes/create` | Create class |
| `/teacher/classes/[id]` | Class detail — Students / Sessions / **Analytics** tabs |
| `/teacher/room/[id]` | **Live room host** — launch activities, QR, presentation link, live panels |
| `/teacher/sets` | Unfair game question sets (legacy) |
| `/teacher/launch-unfair` | Launch Unfair session (legacy) |
| `/teacher/unfair-host` | Host Unfair game (legacy) |

### Presentation

| Route | Purpose |
|-------|---------|
| `/present/[roomId]` | Full-screen projector view — poll results, discussion spotlight/voting, Bias Detective hub progress, join QR |

---

## Database Structure Overview

### Pre-existing tables (created outside this repo's migrations)

| Table | Purpose |
|-------|---------|
| `students` | User profiles (`id`, `auth_id`, `email`, `name`, `role`) |
| `classes` | Teacher classes |
| `class_enrollments` | Student ↔ class links |
| `rooms` | Live session rooms (`code`, `status`, `current_activity`, …) |
| `participants` | Who is in each room (may be anonymous name-only) |
| `game_sessions` | Every tracked game play |
| `question_attempts` | Per-answer records |
| `badges` | Achievement definitions |
| `student_badges` | Earned achievements |

### Legacy tables (used in code, no migration in repo)

| Table | Purpose |
|-------|---------|
| `game_sets` | Unfair game question sets |
| `unfair_game_sessions` | Unfair live sessions |

### Tables added by repo migrations

#### `activity_instances` (Phase 1)

One row per teacher launch of an activity in a room.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `room_id` | uuid FK → `rooms` | |
| `class_id` | uuid nullable | Denormalized from room |
| `teacher_id` | uuid nullable FK → `students` | |
| `activity_id` | text | e.g. `poll`, `discussion`, `bias-detective` |
| `status` | text | `active` \| `ended` |
| `started_at`, `ended_at` | timestamptz | |
| `end_reason` | text | `activity_ended`, `activity_switched`, `room_closed`, `superseded` |
| `launch_config` | jsonb | Immutable snapshot at launch (poll/discussion/bias) |

#### `poll_responses` (Poll Phase A)

| Column | Notes |
|--------|-------|
| `activity_instance_id` | FK |
| `student_id` | FK → `students` |
| `selected_option_ids` | text[] |
| Unique | `(activity_instance_id, student_id)` — one vote per student per launch |

#### `discussion_responses` (Discussion V1)

| Column | Notes |
|--------|-------|
| `activity_instance_id`, `room_id`, `class_id` | Attribution |
| `student_id` | FK |
| `response_text` | Max 2000 chars (validated in API) |
| Unique | `(activity_instance_id, student_id)` |

#### `discussion_votes` (Discussion V2)

Pairwise tournament votes.

| Column | Notes |
|--------|-------|
| `left_response_id`, `right_response_id` | Canonical pair ordering |
| `selected_response_id` | Student's pick |
| Unique | `(activity_instance_id, student_id, left_response_id, right_response_id)` |

#### `bias_question_sets` (Bias Detective Question Set Manager)

| Column | Notes |
|--------|-------|
| `teacher_id` | uuid FK → `students(id)` — **must match actual `students.id` type in Supabase** |
| `title`, `description` | |
| `question_count` | Denormalized count |
| `content` | jsonb — full `BiasDetectiveGameData` |
| `is_default` | Reserved for future school-wide library |

### Room runtime fields (Phase 0 + Phase 1)

| Column | Purpose |
|--------|---------|
| `current_activity` | Activity id string (`waiting`, `poll`, …) |
| `active_activity_instance_id` | FK to current launch |
| `teacher_id` | Teacher who created room |
| `class_id` | Optional class attribution |
| `code` | 4-digit join code |
| `status` | `active` \| `closed` |

### `game_sessions` extensions (Phase 0 + Phase 1)

| Column | Purpose |
|--------|---------|
| `room_id`, `class_id` | Attribution for analytics |
| `activity_instance_id` | Links attempt to specific teacher launch |
| `game_type` | Activity id (future rename to `activity_id` planned) |
| `raw_data` | Hub progress, mini-game completion (Bias Detective) |

---

## Database Migrations

**Always run `schema_type_check.sql` first** in Supabase SQL Editor.

Apply migrations **in filename order**:

| # | File | What it adds |
|---|------|--------------|
| — | `schema_type_check.sql` | Pre-flight: verify `students.id` and FK column types |
| — | `20250604999999_repair_wrong_student_fk_types.sql` | Optional repair hints if `42804` type mismatch |
| 1 | `20250605000000_phase0_room_class_attribution.sql` | `rooms.teacher_id`, `rooms.class_id`; `game_sessions.room_id`, `game_sessions.class_id` |
| 2 | `20250605100000_activity_instances_phase1.sql` | `activity_instances`; `rooms.active_activity_instance_id`; `game_sessions.activity_instance_id` |
| 3 | `20250605110000_poll_phase_a.sql` | `activity_instances.launch_config`; `poll_responses` |
| 4 | `20250605120000_discussion_v1.sql` | `discussion_responses` |
| 5 | `20250605120001_discussion_responses_access.sql` | GRANT + RLS on `discussion_responses` |
| 6 | `20250605130000_discussion_v2_voting.sql` | `discussion_votes` |
| 7 | `20250605130001_discussion_votes_access.sql` | GRANT + RLS on `discussion_votes` |
| 8 | `20250605140000_bias_question_sets.sql` | `bias_question_sets` table + `updated_at` trigger |
| 9 | `20250605140001_bias_question_sets_access.sql` | GRANT + RLS on `bias_question_sets` |

**Critical note on `students.id` type:**

- Migration SQL declares `uuid REFERENCES students(id)` for `teacher_id` / `student_id` columns.
- `schema_type_check.sql` documents `students.id` as **text** for some deployments.
- **Production Supabase project (June 2026):** `students.id` is **uuid**. `bias_question_sets.teacher_id` was corrected to `uuid` after initial `text` migration failed with error `42804`.
- Application code treats all IDs as **strings** in TypeScript regardless of Postgres type.

If inserts fail with `42501` or `42P01`, verify migrations and RLS grant files were applied.

---

## Activity System Overview

### The launch lifecycle (`lib/activity-instances.ts`)

Every teacher launch follows this pattern:

```
1. endActiveRoomInstance()     — end prior instance if any
2. (optional) waiting hop      — set current_activity = 'waiting' briefly on re-launch
3. createAndActivateInstance() — INSERT activity_instances, SET rooms.active_activity_instance_id
4. UPDATE rooms.current_activity = activity_id
```

**Functions:**

| Function | Activity | `launch_config` |
|----------|----------|-----------------|
| `launchRoomActivity()` | Generic games (`bias-detective` without custom set) | `null` |
| `launchPollActivity()` | Poll | Poll snapshot |
| `launchDiscussionActivity()` | Discussion | Discussion snapshot |
| `launchBiasDetectiveActivity()` | Bias Detective with question set | Bias snapshot |
| `closeRoomWithInstances()` | Close room | Ends active instance |

### `launch_config` pattern

Immutable JSON snapshot stored on `activity_instances` at launch time. Phase transitions (discussion voting) **update** `launch_config` in place via merge helpers.

**Why snapshots?** Students and presentation view read config from the instance row — not live teacher UI state. Relaunching creates a new instance with fresh config.

### Activity registry (Engine v1)

- Scans `public/games/*/game.json` at runtime
- `GET /api/activities` → full `ActivityDefinition[]`
- `GET /api/games` → legacy launch card shape (backward compatible)
- **Only registered game:** `bias-detective` (`type: 'game'`, `version: '1.0.0'`)
- Poll and discussion are **not** in the registry (platform activities)

See `docs/milestones/engine-v1.md` and `docs/milestones/engine-v1-activity-identity.md`.

### Student session lifecycle (`lib/session-lifecycle/`)

| Module | Role |
|--------|------|
| `run-client.ts` | `beginOrRestoreRun`, `handleRoomActivityUpdate` — deduped `start_session` |
| `trackable.ts` | `isTrackableActivity()` — excludes `waiting`, `poll`, `wordcloud`, `discussion` |
| `student-storage.ts` | localStorage run keys per room/activity |
| `server-reuse.ts` | `findReusableOpenSession` in `/api/track` |
| `partition.ts` / `completed.ts` | Split completed vs unfinished sessions |
| `analytics.ts` | `buildClassAnalyticsMetrics` — averages use completed sessions only |

**Trackable games** create `game_sessions` via `POST /api/track` (`start_session` → `record_answer` → `update_progress` → `end_session`). Bias Detective iframe sends `postMessage` → student page → `/api/track`.

---

## Bias Detective Status

### Game plugin

- **Location:** `public/games/bias-detective/`
- **Files:** `game.json` (metadata), `index.html` (full game), `default-set.json` (extracted built-in content)
- **Student load:** iframe at `/games/bias-detective/index.html?activity_instance_id={id}` when custom set launched
- **Tracking:** Hub with 6 mini-games — `learn`, `quiz`, `scenarios`, `matching`, `detective`, `speed`
- **Communication:** `window.parent.postMessage({ type: 'GAME_SUBMIT', data: {...} })`

### Question Set Manager V1 (June 2026)

Teachers manage custom question sets from the **Bias Detective card** on the Teacher Room page.

**Features:**

- Dropdown: Built-in default + saved teacher sets
- **Launch with selected set** — snapshots content into `launch_config`
- **Upload JSON set** — validated against schema, saved to `bias_question_sets`
- **Copy AI prompt** — clipboard prompt for generating new sets
- **Export selected set** — download JSON

**Key files:**

| Path | Role |
|------|------|
| `lib/bias-detective/types.ts` | `BiasDetectiveGameData` schema (6 sections) |
| `lib/bias-detective/validate-set.ts` | Upload validation |
| `lib/bias-detective/launch-config.ts` | `launch_config` builder/parser |
| `lib/bias-detective/ai-prompt.ts` | AI generation prompt |
| `lib/bias-detective/default-set.ts` | Built-in default content |
| `lib/bias-detective/teacher-panel.tsx` | Teacher UI |
| `app/api/bias-detective/*` | Launch, game-data, question-sets APIs |

**`launch_config` shape:**

```json
{
  "type": "bias-detective",
  "questionSetId": "default",
  "title": "Built-in Default Set"
}
```

Custom sets embed full `content` at launch for immutable snapshot.

**Future-proofed but not built:** duplicate set, edit title, delete set, share with teachers, school-wide library.

### Presentation

`BiasDetectivePresent` — room code, join QR, hub progress summary during live play.

---

## Discussion Activity Status

### Phases

```
collecting → voting → results
```

Stored in `activity_instances.launch_config.phase`.

### `launch_config` shape

```typescript
{
  type: 'discussion',
  question: string,
  anonymous: boolean,
  selectedResponseId: string | null,  // teacher spotlight
  phase: 'collecting' | 'voting' | 'results'
}
```

### Teacher flow (Teacher Room page)

1. **Launch discussion** — modal with question + anonymous toggle → `POST /api/discussion/launch`
2. **Collecting phase** — live response list, spotlight individual response on presentation
3. **Start voting** — requires ≥2 responses → `POST /api/discussion/start-voting`
4. **End voting** → `POST /api/discussion/end-voting` → results phase
5. **Clear spotlight** — `PATCH /api/discussion/select-response`

### Student flow

| Phase | UI |
|-------|-----|
| `collecting` | Textarea + submit response |
| `voting` | `DiscussionVotingPanel` — 30/70 two-column layout, pairwise card voting |
| `results` | "Voting has ended" — see presentation for rankings |

### Voting system (V2)

- **Pairwise tournament** — not likes/upvotes
- `lib/discussion/pair-selection.ts` — canonical pair ordering, random unseen pair, cycles when all pairs seen
- Anonymous mode: labels like `Response #3` (`lib/discussion/display.ts`)
- Student taps entire card to vote — no separate buttons
- 280ms selection feedback before submit

### Presentation

- **Collecting:** spotlight selected response full-screen
- **Voting / Results:** `DiscussionVoteResultsPresent` — live leaderboard with medals, proportional bars, vote counts
- Waiting state when `totalVotesCast === 0` during voting phase

### Key files

`lib/discussion/` — `types.ts`, `launch-config.ts`, `pair-selection.ts`, `vote-context.ts`, `vote-results.ts`, `responses.ts`, `teacher-auth.ts`, `discussion-voting-panel.tsx`

`lib/present/discussion-present.tsx`, `discussion-vote-results.tsx`

---

## Poll Activity Status

### Features

- Teacher launches via modal on Teacher Room page
- 2–6 options with ids `a`–`f`
- One vote per student per launch (`poll_responses` unique constraint)
- Live results on Presentation View (`PollPresent` + `ResultsLadder`)

### `launch_config` shape

```typescript
{
  type: 'poll',
  question: string,
  options: [{ id: 'a'|'b'|..., label: string }],
  allowMultiple: false
}
```

### Key files

`lib/poll/` — `types.ts`, `launch-config.ts`, `fetch-active.ts`, `vote-context.ts`, `results.ts`  
`lib/present/poll-present.tsx`, `horizontal-result-bars.tsx`, `results-ladder.tsx`

### Not tracked

Poll does not create `game_sessions` rows. Votes live only in `poll_responses`.

---

## Presentation View Status

**Route:** `/present/[roomId]`  
**Page:** `app/present/[roomId]/page.tsx`

### Behavior

- Subscribes to Supabase Realtime on `rooms` UPDATE
- Routes by `room.current_activity`:

| Activity | Component | Notes |
|----------|-----------|-------|
| `closed` | `ClosedPresent` | |
| `waiting` | `WaitingPresent` | Join QR code |
| `poll` | `PollPresent` | Live bar chart / results ladder |
| `discussion` | `DiscussionPresent` | Spotlight, voting leaderboard, results |
| `bias-detective` | `BiasDetectivePresent` | Join QR + hub progress |
| Other games | Generic message | "Participate on your device" |

### QR visibility

`lib/present/should-show-presentation-qr.ts` — shows join QR when room is active and activity is `waiting`, `bias-detective`, or `discussion`.

### Shell

`PresentShell` — room code header, live indicator. Discussion uses custom dark layout (header hidden during discussion).

---

## Analytics Status

**Location:** `app/teacher/classes/[id]/analytics.tsx` (Analytics tab)

### Scope

- **Currently filtered to:** `gameType: 'bias-detective'` only
- Poll and discussion data are **not** in class analytics yet

### Data sources

- `fetchClassGameSessions()` — Phase 0 attribution by `class_id` + enrollment fallback for legacy null `class_id`
- `question_attempts` — per-answer detail
- `game_sessions.raw_data` — hub mini-game progress
- `activity_instances` — launch snapshots for room/launch scope filters

### Features

| Feature | Status |
|---------|--------|
| Overview stats (completed sessions only for averages) | ✅ |
| Unfinished attempts section (toggle) | ✅ |
| Per-student grid | ✅ |
| Per-student timeline | ✅ |
| Hub mini-game progress (live in-progress) | ✅ |
| Scope filters: all / room / launch | ✅ |
| Date filter | ✅ |
| CSV exports (scores, answers, timeline) | ✅ |
| Poll/discussion analytics | ❌ Not built |

### Key files

`lib/session-lifecycle/analytics.ts`, `lib/class-sessions.ts`, `lib/analytics-scope.ts`, `lib/room-session-display.ts`, `lib/mini-game-progress.ts`

---

## API Reference

All routes use `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Activity registry

| Route | Methods |
|-------|---------|
| `/api/activities` | GET |
| `/api/activities/[id]` | GET |
| `/api/games` | GET (legacy shape) |

### Tracking

| Route | Methods | Actions |
|-------|---------|---------|
| `/api/track` | POST | `start_session`, `record_answer`, `update_progress`, `end_session` |

### Poll

| Route | Methods |
|-------|---------|
| `/api/poll/launch` | POST |
| `/api/poll/vote` | POST |
| `/api/poll/my-vote` | GET |
| `/api/poll/results` | GET |

### Discussion

| Route | Methods | Auth |
|-------|---------|------|
| `/api/discussion/launch` | POST | Teacher |
| `/api/discussion/respond` | POST | Student |
| `/api/discussion/my-response` | GET | Student |
| `/api/discussion/responses` | GET | Teacher/Present |
| `/api/discussion/start-voting` | POST | Teacher |
| `/api/discussion/end-voting` | POST | Teacher |
| `/api/discussion/select-response` | PATCH | Teacher |
| `/api/discussion/vote-pair` | GET | Student |
| `/api/discussion/vote` | POST | Student |
| `/api/discussion/vote-results` | GET | Teacher/Present |

### Bias Detective

| Route | Methods |
|-------|---------|
| `/api/bias-detective/launch` | POST |
| `/api/bias-detective/game-data` | GET |
| `/api/bias-detective/question-sets` | GET, POST |
| `/api/bias-detective/question-sets/[id]` | GET |

---

## Key Library Modules

```
lib/
├── supabase.ts                 # Client, getUserProfile, ensureStudentProfile
├── rooms.ts                    # createTeacherRoom (4-digit code)
├── activity-instances.ts       # Launch/end/close instance lifecycle
├── activity-engine/            # Registry, schema, game-json adapter
├── game-registry.ts            # Legacy wrapper → activity engine
├── session-lifecycle/          # Student run dedup, analytics partitioning
├── class-sessions.ts             # Class-scoped game_sessions queries
├── analytics-scope.ts          # Room/launch filtering
├── room-session-display.ts     # Room/instance snapshots for analytics
├── mini-game-progress.ts       # Bias Detective hub progress in raw_data
├── poll/                       # Poll launch, vote, results
├── discussion/                 # Discussion + voting
├── bias-detective/             # Question sets, validation, teacher panel
└── present/                    # Presentation components
```

---

## Recently Completed Features

### June 2026 (conversation work)

1. **Activity Instances (Phase 1)** — `activity_instances` table linking teacher launches to student sessions
2. **Phase 0 attribution** — `rooms.teacher_id`, `rooms.class_id`, `game_sessions.room_id/class_id`
3. **Poll Phase A** — launch + vote + live presentation results
4. **Discussion V1** — written response collection + teacher spotlight on presentation
5. **Discussion V2 — Pairwise Voting Tournament** — `discussion_votes`, vote-pair API, student voting panel, presentation leaderboard
6. **Discussion voting UX iterations** — two-column 30/70 layout, card-as-vote-target, tablet-first polish, vertical centering, header shows "Discussion Voting"
7. **Presentation improvements** — `ResultsLadder`, `DiscussionVoteResultsPresent`, waiting state for zero votes, vote count spacing fix
8. **Session lifecycle cleanup** — completed vs unfinished partitioning, analytics averages on completed only
9. **Bias Detective Question Set Manager V1** — `bias_question_sets`, upload/validate/export/AI prompt, launch with custom set, iframe loader via `activity_instance_id`
10. **Engine v1 activity registry** — `GET /api/activities`, filesystem discovery of `game.json`

---

## Important Design Decisions

### 1. `launch_config` snapshots

Poll, discussion, and Bias Detective store immutable config on `activity_instances` at launch. Presentation and students read from the instance — not live teacher UI. Discussion phase changes merge into the same row.

### 2. Platform activities vs game plugins

Poll and discussion are **hardcoded** in the Next.js app. Games are **static iframe plugins** in `public/games/`. Only games are in the activity registry.

### 3. Permissive RLS + app-level auth

New tables use `USING (true)` RLS policies. Teacher authorization is enforced in API route handlers by comparing `teacher_id` to `rooms.teacher_id`. This matches the anon-key-only architecture but is **not** defense-in-depth at the database layer.

### 4. `students.id` as canonical app identifier

All teacher/student IDs in application code come from `students.id` (via `getUserProfile()`), not Supabase Auth `user.id`. Exception: legacy Unfair game pages may still reference `user.id` — potential bug.

### 5. Trackable vs non-trackable activities

Only iframe games create `game_sessions`. Poll votes → `poll_responses`. Discussion → `discussion_responses` + `discussion_votes`. This split is intentional for now.

### 6. Waiting hop on re-launch

When teacher re-launches the same game, room briefly sets `current_activity = 'waiting'` so students detect a new attempt and increment `gameAttemptKey` (new iframe load).

### 7. Bias Detective question set snapshot

Custom sets embed full `content` in `launch_config` at launch so the game works even if the teacher later deletes the set from the library.

### 8. Discussion voting is pairwise, not cumulative likes

Students compare two responses at a time. Results aggregate wins across pairs into a leaderboard — not a simple upvote count per response in isolation.

---

## Current Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| **`students.id` type mismatch in docs vs production** | Medium | `schema_type_check.sql` says text; production uses uuid. Migration files mix declarations. Always verify before applying. |
| **Unfair game uses `auth user.id` not `students.id`** | Medium | `teacher/sets`, `launch-unfair` may not align with `students` table FK pattern |
| **No server-side JWT auth on API routes** | Medium | Teacher auth is body/query `teacher_id` comparison — spoofable if anon key is public (expected for Supabase client apps, but worth hardening) |
| **Permissive RLS** | Medium | Any anon client can read/write discussion votes, poll responses, etc. if they know IDs |
| **`/api/discussion/my-response` static generation warning** | Low | Build logs dynamic server usage warning — route works at runtime |
| **Analytics limited to Bias Detective** | Low | Poll/discussion have no class analytics |
| **Migration README incomplete** | Low | Stops at Poll Phase A; discussion/bias migrations not documented in README |
| **No automated tests** | Low | No test runner configured |
| **Wordcloud activity id reserved** | Low | In `trackable.ts` but no implementation |

---

## Outstanding TODOs

### Bias Detective Question Sets (future V2)

- [ ] Duplicate question set
- [ ] Edit set title
- [ ] Delete set
- [ ] Share set with other teachers
- [ ] School-wide question library (`is_default` column reserved)

### Discussion

- [ ] Analytics integration (response quality, vote participation)
- [ ] Optional: horizontal card layout on large tablets (landscape)

### Poll

- [ ] `allowMultiple: true` support (type exists, not implemented in UI)
- [ ] Poll analytics in class dashboard

### Platform

- [ ] Register poll/discussion in activity engine (Engine v2)
- [ ] Rename `game_sessions.game_type` → `activity_id` (see identity doc)
- [ ] Integrate or deprecate Unfair game legacy stack
- [ ] Harden API auth (service role server routes or RLS with auth.uid())
- [ ] Wordcloud activity implementation
- [ ] Automated test suite
- [ ] Update `supabase/migrations/README.md` with discussion + bias migrations

### Session lifecycle

- [ ] Abandoned session timeout (see `session-lifecycle-cleanup.md` option 3)
- [ ] Explicit `session_status` enum (option 5 in milestone doc)

---

## Future Roadmap

### Near term

1. **Bias Question Set Manager V2** — edit, delete, duplicate, share
2. **Poll + Discussion analytics** — class dashboard tabs for non-game activities
3. **Migration doc cleanup** — align README with all 9 migration files; resolve `students.id` type documentation

### Medium term

4. **Activity Engine v2** — unified registry for games + platform activities
5. **Activity identity migration** — `game_type` → `activity_id`, versioned definitions
6. **Server-side auth hardening** — move sensitive writes off permissive RLS
7. **Unfair game integration** — migrate to `activity_instances` or deprecate

### Long term

8. **Lessons / slides** — multi-activity sequences
9. **School-wide content library** — shared bias question sets, org-level defaults
10. **AI-assisted activity authoring** — beyond copy-prompt for Bias Detective
11. **Presenter controls** — remote advance, lock student screens

---

## Quick Start for New Maintainers

### 1. Verify database

```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/schema_type_check.sql
```

Confirm `students.id` type. Apply migrations 1–9 in order if not already applied.

### 2. Local dev

```bash
npm install
cp .env.example .env.local
npm run dev
```

### 3. Test the happy path

1. Sign in as teacher → `/teacher`
2. Create class → create room
3. Open `/teacher/room/[id]`
4. Launch Bias Detective (or Poll / Discussion)
5. Open student view: `/?room=CODE`
6. Open presentation: `/present/[roomId]`
7. Check analytics: `/teacher/classes/[id]` → Analytics tab

### 4. Key debugging tips

| Symptom | Likely cause |
|---------|--------------|
| Discussion voting fails silently | `discussion_votes` table or RLS not applied — check API error in network tab |
| Bias set upload fails | `bias_question_sets` migration not applied |
| FK error `42804` on migration | `students.id` type doesn't match migration column type |
| Student sees old game after re-launch | Waiting hop / `gameAttemptKey` — check room `current_activity` transitions |
| Analytics missing sessions | `class_id` null on room or session — Phase 0 attribution |
| Custom Bias set not loading | Check `activity_instance_id` query param on iframe; verify `launch_config.content` |

### 5. Build verification

```bash
npx tsc --noEmit
npm run build
```

### 6. Read next

| Doc | Topic |
|-----|-------|
| `README.md` | Setup, plugin architecture |
| `supabase/migrations/README.md` | Migration phases (partial) |
| `docs/milestones/engine-v1.md` | Activity registry |
| `docs/milestones/engine-v1-activity-identity.md` | Identity strategy |
| `docs/milestones/session-lifecycle-cleanup.md` | Session dedup milestone |

---

## File Structure Reference

```
classroom-platform/
├── app/
│   ├── page.tsx                    # Student home
│   ├── login/
│   ├── student/[roomId]/           # Student live room
│   ├── teacher/                    # Teacher dashboard + room + classes
│   ├── present/[roomId]/           # Presentation view
│   └── api/                        # All API routes
├── lib/
│   ├── activity-instances.ts         # Launch lifecycle
│   ├── activity-engine/            # Game registry
│   ├── session-lifecycle/            # Student run tracking
│   ├── poll/                       # Poll activity
│   ├── discussion/                 # Discussion + voting
│   ├── bias-detective/               # Question set manager
│   └── present/                    # Presentation components
├── public/games/
│   └── bias-detective/               # Game plugin + default-set.json
├── supabase/migrations/              # SQL migrations (apply in order)
├── docs/milestones/                  # Architecture milestone docs
├── .env.example
├── package.json
└── PROJECT_HANDOFF_JUNE_2026.md      # This file
```

---

*End of handoff document.*
