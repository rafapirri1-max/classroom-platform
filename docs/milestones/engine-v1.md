# Engine v1 — Activity registry

**Status:** Implemented  
**Depends on:** Phase 0 attribution

## Delivered

- `ActivityDefinition` schema (`id`, `type`, `version`, display, runtime, analytics, source)
- Filesystem registry over `public/games/*/game.json`
- `GET /api/activities` and `GET /api/activities/[id]`
- `GET /api/games` unchanged response via registry adapter
- Teacher room loads launch cards from `/api/activities`

## Identity strategy

See [engine-v1-activity-identity.md](./engine-v1-activity-identity.md).

## Not in v1

- DB schema changes, `game_sessions` rename
- Student page / `/api/track` changes
- Lessons, slides, presenter, AI
- Poll/wordcloud in registry

## Verification

1. `GET /api/activities` → `bias-detective`, `version: "1.0.0"`, `type: "game"`
2. `GET /api/games` → same card fields as before
3. Teacher room launches Bias Detective; student iframe and track unchanged
