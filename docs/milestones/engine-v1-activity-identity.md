# Activity identity: `activity_id`, `activity_type`, `activity_version`

**Status:** Design note (Engine v1)  
**Scope:** Naming and evolution strategy only — no versioning implementation in v1.

## Why three fields

| Field | Role | Stability |
|-------|------|-----------|
| **`activity_id`** | Stable identity of a *definition* in the registry (“which activity is this?”) | Changes only when retiring/renaming a product; prefer never |
| **`activity_type`** | Handler + analytics profile family (“how does the platform run and score it?”) | Rarely added (new enum value = new handler) |
| **`activity_version`** | Content revision of that definition (“which revision was launched?”) | Changes when questions, slides, or config change |

Engine v1 exposes all three on **`ActivityDefinition`** in memory. Runtime and DB mostly still use **`activity_id`** alone today (as `game.json` `id`, `rooms.current_activity`, `game_sessions.game_type`).

## Long-term strategy

### `activity_id`

- **Canonical string** used everywhere we *refer* to an activity: registry lookup, room launch, track payloads (today: `game_type` column stores this value).
- **Rules:** lowercase slug; unique in registry; folder name under `public/games/{id}` for built-ins.
- **Engine v1:** `activity_id` === `game.json` `id` === Bias Detective’s `bias-detective`. No second ID system.
- **Later:** Teacher-authored content gets DB-backed ids (e.g. UUID) but the same field name; built-ins keep slug ids.
- **Do not** overload `activity_id` with version (no `bias-detective-v2` as id unless we permanently fork the product).

### `activity_type`

- **Platform category:** drives student shell handler, teacher launch card grouping, and analytics profile selection (`game`, `quiz`, `poll`, …).
- **Engine v1:** Disk games map to `type: 'game'` only; poll/wordcloud remain hardcoded outside registry until v1b.
- **Later:** New types add handlers, not new tables per type. `activity_type` is stored on analytics runs when we extend schema (optional column `activity_type` alongside existing `game_type` / id).
- **Distinction from id:** `bias-detective` is an id; `game` is its type. Many ids share one type.

### `activity_version`

- **Content semver or opaque hash** (e.g. `1.0.0`, or hash of quiz JSON) — *not* implemented in v1 beyond default `1.0.0` on every built-in.
- **Engine v1 default:** Always `1.0.0` for filesystem games so API shape is stable; ignored by track, room, and analytics.
- **Later:**
  - Lesson steps may **pin** `activity_id` + `activity_version`.
  - Runs record `activity_version` at `start_session` time for “which quiz version was played.”
  - Registry may serve `GET /api/activities/:id?version=` or “latest.”
- **Do not** encode version in `activity_id`; use the dedicated field when versioning ships.

## Mapping today → future (no corner-painting)

| Today (v1) | Future | Notes |
|------------|--------|--------|
| `game.json` `id` | `activity_id` | Same value |
| (implicit) game | `activity_type: 'game'` | Set in mapper |
| (none) | `activity_version: '1.0.0'` | Default only in v1 |
| `game_sessions.game_type` | Still stores **activity_id** until renamed | Column rename is a later migration; alias in API only |
| `rooms.current_activity` | Still **activity_id** | Room broadcast unchanged |

## Engine v1 guarantees

1. **Registry and `/api/activities`** return `id`, `type`, and `version` on every definition.
2. **No DB migrations** for identity fields in v1.
3. **Bias Detective path unchanged:** launch `bias-detective`, iframe `/games/bias-detective/`, track `game_type: 'bias-detective'`.
4. **Phase 0** `room_id` / `class_id` on sessions untouched.

## When we implement versioning (later milestone)

- Add optional `activity_version` on `game_sessions` (nullable; default null = legacy).
- Lesson steps store pinned version.
- Registry loader reads version from `game.json` or content DB row.
- Analytics can group by `(activity_id, activity_version)` or roll up to latest.

Until then, treating all built-ins as `1.0.0` is explicit and forward-compatible.
