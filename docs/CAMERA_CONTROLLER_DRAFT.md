# Camera Controller Draft

This document captures Step 5 of the camera roadmap: create the first mobile controller UI draft.

## Route

`/admin/camera/control`

This route is a controller draft, not a connected remote controller yet.

## Current Scope

The controller currently supports:

- Activity mode selection.
- Difficulty selection.
- Duration selection.
- Participant mode selection.
- Sound toggle.
- Draft run state: ready, running, paused, ended.
- Result preview placeholder.
- Link back to the large screen player.

The controller reuses:

- `CameraModeId`
- `CameraSettings`
- `Store.getSettings()`
- `Store.saveSettings()`

## Intent

Mobile should become the teacher's hand-held control desk.

The large screen remains the student-facing stage. The controller should eventually send commands to the player instead of running the camera game itself.

## Not Yet Implemented

- Player pairing.
- Session code validation.
- Realtime command transport.
- Live player status.
- Real score/results sync.
- Student/class selection.
- Backend save.

## Expected Future Command Shape

```ts
type CameraControllerCommand =
  | { type: 'selectMode'; mode: CameraModeId }
  | { type: 'updateSettings'; settings: Partial<CameraSettings> }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end' }
  | { type: 'reset' };
```

## Step 6 Decision

Decision: start with a short-lived session row plus polling.

Realtime can be added later if classroom latency feels too high, but the first connected version should stay easy to debug.
