# Word Cloud — Phase B Implementation Plan

## Product requirement

Teachers must review submitted words **before** revealing them on Presentation View. Students may submit inappropriate content; the teacher needs moderation visibility before the word cloud is shown publicly.

Phase B does **not** add delete/hide/edit/filter controls — preview + reveal only.

---

## Scope

### In scope

1. **Teacher reveal** — `Reveal Word Cloud` button in Teacher Room active panel; sets `launch_config.phase` from `collecting` → `revealed`; post-reveal message on teacher panel.
2. **Teacher moderation preview** — Live list/chips of submitted words + response count; teacher-only; names optional if easy from existing joins.
3. **Presentation word cloud** — Anonymous aggregated words only; case-insensitive grouping; larger font for higher counts; hidden until `phase === 'revealed'`.
4. **APIs** — `POST /api/wordcloud/reveal`, `GET /api/wordcloud/responses` (teacher), `GET /api/wordcloud/aggregate` (presentation, anonymous).

### Out of scope (Phase C+)

- Delete/hide/edit individual words
- Profanity filter
- Analytics
- Lesson builder / sequencing

---

## Architecture

| Layer | Responsibility |
|-------|----------------|
| `lib/wordcloud/` | Types, launch-config phase merge, teacher auth, responses fetch, aggregate |
| `activity_instances.launch_config` | `{ type, question, phase, maxAnswerLength }` |
| `wordcloud_responses` | Raw answers (unchanged from Phase A) |
| Teacher Room | Active panel: preview + reveal |
| Student Room | Submit while collecting; confirmation / closed message when revealed |
| Presentation | `WordCloudPresent` — aggregate only after reveal |

---

## APIs

### `GET /api/wordcloud/responses` (teacher moderation)

Query: `room_id`, `teacher_id`, `activity_instance_id`

Verifies: teacher owns room, instance belongs to room, activity is `wordcloud`.

Returns raw submissions for moderation (may include `display_label` with student name).

### `POST /api/wordcloud/reveal` (teacher)

Body: `room_id`, `teacher_id`, `activity_instance_id`

Verifies same as above. Requires `phase === 'collecting'`. Updates `launch_config.phase` to `revealed`.

### `GET /api/wordcloud/aggregate` (presentation)

Query: `activity_instance_id`

Returns `question`, `phase`, and `words: [{ text, count }]` **only when revealed**. Never includes student ids or names.

---

## Privacy rules

| Surface | Student names | Individual attribution |
|---------|---------------|------------------------|
| Teacher Room preview | Optional (V1) | Per-response list |
| Student Room | N/A | Own answer only |
| Presentation | Never | Never — words + counts only |

---

## UI flows

### Teacher

1. Launch word cloud (Phase A).
2. Panel polls `/api/wordcloud/responses` every ~3s.
3. Teacher reviews chips/list before reveal.
4. Click **Reveal Word Cloud** → phase `revealed`.
5. Panel shows: “Word cloud revealed on Presentation View”.

### Student

- `collecting`: submit one answer (Phase A).
- `revealed`: no new submissions; show submitted confirmation or “collection ended”.

### Presentation

- `collecting`: question + “Waiting for teacher to reveal”.
- `revealed`: anonymous word cloud from `/api/wordcloud/aggregate`.
