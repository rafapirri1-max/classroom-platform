# Word Cloud — Phase C Implementation Plan

## Status

Phase A+B complete: launch, submit, teacher preview, reveal, anonymous aggregate on presentation.

Phase C adds:
1. **Teacher moderation delete** (collecting only)
2. **Classroom-friendly presentation word cloud** (revealed only)

---

## 1. Teacher moderation delete

### API

`POST /api/wordcloud/delete-response`

**Body:** `room_id`, `teacher_id`, `activity_instance_id`, `response_id`

**Logic:** `lib/wordcloud/delete-response.ts`
- Reuse `authorizeTeacherWordCloudAction`
- Require `launch_config.phase === 'collecting'` → else 409
- Verify row belongs to `activity_instance_id`
- `DELETE` from `wordcloud_responses`

### Authorization

Same as Phase B teacher routes: teacher owns room, instance is active wordcloud.

### SQL / RLS

**Required migration** — current policy allows SELECT + INSERT only.

```sql
GRANT DELETE ON wordcloud_responses TO anon, authenticated;

CREATE POLICY "wordcloud_responses_delete"
  ON wordcloud_responses FOR DELETE TO anon, authenticated USING (true);
```

Authorization enforced in API route (same pattern as Phase A/B).

### Teacher UI

`app/teacher/room/[id]/page.tsx` — per-response **Remove** button in active panel chips, only when `phase === 'collecting'`. Simple `confirm()` before delete. Hidden after reveal (V1).

### Student resubmission

- DB `UNIQUE (activity_instance_id, student_id)` allows re-insert after delete.
- **Required:** poll `/api/wordcloud/my-response` every 3s while collecting so deleted students see submit form again without refresh.

### Downstream

Deleted rows automatically excluded from teacher preview, response count, and aggregate (no API changes needed).

---

## 2. Presentation word cloud — visual goal

### What we are building

A **classroom-friendly word cloud** like Mentimeter / Slido / Poll Everywhere.

### What we are NOT building

- Radial graph / scatter plot
- Solar-system or spiral layout
- Radar chart
- Words in obvious rows or columns
- Perfect circular or mathematical patterns

### Visual principles

| Principle | Rule |
|-----------|------|
| Centre priority | Highest-frequency word at centre; important words stay central |
| Outward growth | Subsequent words expand outward from centre |
| Organic feel | Clustered, not geometric |
| Frequency → size | Larger words naturally occupy central area |
| Rarity → edge | Smaller words gradually spread outward |
| Stability | Same words → same layout on every refresh/poll |
| Anonymity | No student names or attribution |
| Projector | Limited palette, high contrast on dark background |

---

## 3. Presentation layout approach (revised)

**Extract to:** `lib/wordcloud/presentation-layout.ts`  
**Consume in:** `lib/present/wordcloud-present.tsx`

### Input

`WordCloudAggregateWord[]` — `{ text, count }`, sorted by count desc then text asc (from existing aggregate).

### Output

`WordCloudPlacedWord[]` — `{ text, count, fontSize, color, left, top, rotation }` in % or px relative to centred container.

### Algorithm (deterministic clustered placement)

#### Step 1 — Centre anchor

Place the **highest-frequency word** at container centre (`50%`, `50%`), largest font size, no rotation (or 0°).

If tie on count, first by sort order (text asc) wins centre.

#### Step 2 — Place remaining words in frequency order

For each subsequent word (index `i` from 1):

1. **Deterministic seed** from word text (string hash → 32-bit integer). Same word always same seed.

2. **Base font size** from frequency:
   - Map `count / maxCount` → ~18–72px
   - Add small seed-based jitter (±0–4px) so equal-count words differ slightly

3. **Target distance from centre** (outward bias):
   - Lower frequency → larger base distance
   - Formula sketch: `baseDistance = minDistance + (1 - count/maxCount) * maxSpread + (i * stepOutward)`
   - Higher-index (lower priority) words pushed further out
   - Add seed-based jitter to distance (±small %), not enough to invert order

4. **Position via controlled offset** (NOT polar spiral):
   - From seed, derive `offsetX` and `offsetY` in range e.g. `-1..1`
   - Normalize so placement is in a **soft blob** around centre, not on a ring
   - Scale offset by `baseDistance`
   - Centre position + offset = candidate `(left, top)`

5. **Slight rotation:** seed → `-15°` to `+15°` max

6. **Colour:** seed → index into fixed palette:
   - cyan, sky, emerald, amber, violet, rose, lime
   - Tailwind-equivalent hex values with sufficient contrast on `#0b0a12` / dark indigo background

#### Step 3 — Collision / bounds pass

For each placed word (after centre):

1. **Bounding box estimate** from `fontSize` and `text.length` (approximate width = `fontSize * 0.6 * charCount`)
2. **Collision nudge:** if overlaps prior word bbox, try up to N deterministic alternative offsets (seed + attempt index) — small shifts, not spiral
3. **Clamp to visible area:** keep bbox inside container padding (e.g. 5–8% inset from edges); shrink font slightly if word is too long for bounds

#### Step 4 — Stability

- `useMemo` in `WordCloudPresent` keyed on `words.map(w => text + ':' + count).join('|')`
- No `Math.random()` — all variation from `hash(text)` and word index
- Polling aggregate every 3s does not change layout if word set unchanged

### Rendering

- Centred `relative` container, `min-h-[55vh]`, full width
- Each word: `position: absolute`, `transform: translate(-50%, -50%) rotate(...)`, `white-space: nowrap`
- `font-weight: bold`, `line-height: 1`
- Optional subtle `text-shadow` for projector legibility

### Collecting / empty states

Unchanged from Phase B:
- Collecting: question + waiting message, no words
- Revealed empty: "No responses yet."

---

## 4. Files to create / modify

### Create

| File | Purpose |
|------|---------|
| `supabase/migrations/20250609100000_wordcloud_responses_delete.sql` | DELETE grant + RLS |
| `app/api/wordcloud/delete-response/route.ts` | Delete endpoint |
| `lib/wordcloud/delete-response.ts` | Delete helper |
| `lib/wordcloud/presentation-layout.ts` | Deterministic clustered layout |
| `docs/wordcloud-phase-c.md` | This plan |

### Modify

| File | Changes |
|------|---------|
| `lib/wordcloud/types.ts` | `WordCloudPlacedWord` type |
| `lib/present/wordcloud-present.tsx` | Clustered layout rendering |
| `app/teacher/room/[id]/page.tsx` | Remove buttons |
| `app/student/[roomId]/page.tsx` | Poll `my-response` while collecting |

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| DELETE without migration | Clear API error; document SQL |
| Student stuck after delete | 3s `my-response` poll |
| Overlap in dense clouds | Collision nudge pass; accept minor overlap in V1 |
| Layout looks too regular | Offset jitter + rotation; avoid polar angles |
| Long words clip | Font cap + bbox clamp |
| Flicker on poll | Memoize layout on stable words key |

---

## 6. Manual test checklist

### Delete
- [ ] Remove visible only while collecting
- [ ] Delete updates teacher count/list within ~3s
- [ ] Student can resubmit after delete
- [ ] Post-reveal delete blocked (409)

### Presentation cloud
- [ ] Highest-frequency word at centre
- [ ] Cloud grows outward organically
- [ ] No obvious spiral, ring, or grid
- [ ] Stable layout across refreshes
- [ ] Varied colours from palette; readable on dark bg
- [ ] Rotation ≤ 15°
- [ ] No names; duplicates merge and scale by count
- [ ] Words stay in visible area

### Regression
- [ ] Phase A+B flows intact
- [ ] `tsc` + `build` pass

---

## Implementation order

1. Migration
2. Delete API + teacher UI
3. Student `my-response` polling
4. `presentation-layout.ts` + `WordCloudPresent` upgrade
5. Manual verification
