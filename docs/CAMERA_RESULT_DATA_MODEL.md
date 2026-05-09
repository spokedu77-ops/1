# Camera Result Data Model

This document captures Step 4 of the camera roadmap: design a backend-ready result model for the camera activity player.

## Goal

Move from lightweight local records to class/session-aware activity results.

The model should support:

- Large screen player results.
- Future mobile controller sessions.
- Teacher review.
- Class/student linking.
- AI feedback and parent-facing summaries later.

## Design Direction

Use a camera-specific activity session model instead of overloading existing class session logs.

Reason:

- A camera activity can be run inside a class, before a class, after a class, or as a standalone demo.
- One activity can involve one child, multiple children, or teams.
- Metrics are more granular than normal attendance/session count logs.
- Later controller-player pairing needs its own session state.

## Proposed Tables

### `camera_activity_sessions`

One row per played activity.

Suggested columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | Primary key. |
| `center_id` | uuid nullable | Link to center when known. |
| `teacher_id` | uuid nullable | Teacher who ran the activity. |
| `class_id` | uuid nullable | Link to `spokedu_pro_classes` or future class table. |
| `lesson_session_id` | uuid nullable | Link to existing lesson/session record if used during a scheduled class. |
| `source` | text | `player`, `controller`, `demo`, `import`. |
| `mode` | text | Camera mode id: `speed`, `sequence`, `shape`, `moving`, `balance`, `mirror`. |
| `difficulty` | text | `easy`, `normal`, `hard`. |
| `duration_sec` | integer | Planned activity duration. |
| `participant_mode` | text | `solo`, `multi`, `team`, `unknown`. |
| `settings` | jsonb | Snapshot of settings used by the activity. |
| `metrics` | jsonb | Aggregated result metrics. |
| `device` | jsonb | Browser/device/display context. |
| `started_at` | timestamptz nullable | When countdown/game started. |
| `ended_at` | timestamptz nullable | When game ended. |
| `created_at` | timestamptz | Insert timestamp. |
| `updated_at` | timestamptz | Update timestamp. |

Recommended indexes:

- `(center_id, created_at desc)`
- `(teacher_id, created_at desc)`
- `(class_id, created_at desc)`
- `(mode, created_at desc)`

### `camera_activity_participants`

One row per participant or team slot inside an activity.

Suggested columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | Primary key. |
| `session_id` | uuid | FK to `camera_activity_sessions`. |
| `student_id` | uuid nullable | Link to `spokedu_pro_students` when a known student is selected. |
| `team_id` | text nullable | Lightweight team key if playing by team. |
| `slot_index` | integer | P1/P2/P3 or team slot. |
| `display_name` | text nullable | Display name captured at play time. |
| `score` | integer | Final score. |
| `avg_reaction_ms` | integer nullable | Average reaction speed. |
| `hit_count` | integer | Successful hits. |
| `miss_count` | integer nullable | Misses when tracked. |
| `metrics` | jsonb | Per-participant metric details. |
| `created_at` | timestamptz | Insert timestamp. |

Recommended indexes:

- `(session_id, slot_index)`
- `(student_id, created_at desc)`

### Optional Later: `camera_activity_events`

Only add this when detailed replay/analytics is needed.

Examples:

- target spawned
- hit
- miss
- pose detected
- pause/resume
- difficulty changed

For now, aggregate metrics are enough.

## Metrics Shape

`camera_activity_sessions.metrics` should be aggregate and query-friendly enough for reports.

Suggested JSON shape:

```json
{
  "totalScore": 120,
  "avgReactionMs": 640,
  "hitCount": 28,
  "missCount": 3,
  "comboMax": 7,
  "activeParticipants": 2,
  "lateGameScoreRate": 0.82,
  "leftRightBalance": {
    "leftHits": 13,
    "rightHits": 15,
    "differenceRate": 0.07
  },
  "modeSpecific": {}
}
```

Mode-specific examples:

- `sequence`: expected order count, wrong order count.
- `shape`: correct shape hits, wrong shape hits.
- `moving`: tracking hit streak, moving target success rate.
- `balance`: pose hold completions, average hold ms.
- `mirror`: matched poses, average matching time.

## Device Shape

`device` should help debug real classroom issues.

Suggested JSON shape:

```json
{
  "role": "player",
  "viewport": { "width": 1920, "height": 1080 },
  "screen": { "width": 1920, "height": 1080 },
  "userAgent": "browser user agent",
  "camera": {
    "facingMode": "user",
    "videoWidth": 1280,
    "videoHeight": 720
  },
  "pose": {
    "model": "pose_landmarker_lite",
    "delegate": "CPU"
  }
}
```

## Frontend Save Payload

The player/controller should eventually send a single payload:

```ts
type CameraActivitySavePayload = {
  session: CameraActivitySessionDraft;
  participants: CameraActivityParticipantDraft[];
};
```

The backend API can insert `camera_activity_sessions` first, then child participant rows.

## Current Local Record Limitation

The current local `CameraResultRecord` only stores:

- mode
- difficulty
- duration
- scores
- average reaction time
- total score

It does not yet store true hit count, miss count, max combo, left/right hits, per-target events, start timestamp, end timestamp, or participant identity.

`app/admin/camera/resultModel.ts` provides a temporary mapper from local records to the future save payload, but some metrics are approximations until the game engine emits richer result stats.

## RLS Direction

Initial backend policy should be conservative:

- Authenticated teachers can insert sessions for their own `teacher_id`.
- Center members can read sessions for their center.
- Admin/master can read and manage all sessions.
- Public/anon should not insert activity results.

Controller-player pairing may later need a short-lived session token, but that should be designed separately from result storage.

## Step 9 Implementation

Implemented files:

- `supabase/migrations/20260508113000_camera_activity_results.sql`
- `app/api/admin/camera/activity-results/route.ts`
- `app/admin/camera/resultModel.ts`
- `app/admin/camera/SpokeduCameraApp.tsx`
- `app/admin/camera/screens/ResultScreen.tsx`

Current behavior:

- Local result history still saves first, so the result screen remains resilient.
- After a game ends, the player builds a backend save payload from the local result.
- The API inserts `camera_activity_sessions` first, then `camera_activity_participants`.
- The result screen shows save status: saving, saved, or failed.
- The same API now supports `GET` for recent saved results.
- The mobile controller shows a recent-results panel with mode, time, difficulty, participant count, and top score.
- The API also supports `GET ?id=` for one activity result detail.
- Selecting a recent result in the mobile controller opens a detail panel with aggregate metrics and participant rows.

Migration status:

- `20260508113000_camera_activity_results.sql` has been applied to Supabase.
- Gameplay and local history still save first, so the result screen remains usable even if a backend upload fails.

Next expansion:

- Link results to class/session/student context once the controller has roster selection.
- Add coaching notes and class/student linking to the result detail panel.
