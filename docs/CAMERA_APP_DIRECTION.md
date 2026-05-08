# Camera App Direction

## Goal

The camera app should become an AI physical-activity player for classes, not a general admin page with a camera attached.

The primary product experience is split by device role:

- Large screen web: activity stage for students.
- Mobile web: teacher controller and review tool.
- Tablet: supported middle layout, but not the product center.

## Device Roles

### Large Screen Player

Route today: `/admin/camera`

This screen is for students to watch and move with.

It should prioritize:

- Fullscreen camera/canvas stage.
- Large targets, timer, score, countdown, and feedback.
- Minimal text during gameplay.
- Fast start, pause, restart, and end flows.
- Stable viewport behavior on desktop browsers, TVs connected to laptops, and wide classroom displays.
- No layout dependency on admin sidebars or surrounding page chrome.

It should avoid:

- Dense settings during gameplay.
- Small touch-only controls.
- Admin navigation taking layout space.
- UI that requires close reading from a distance.

### Mobile Controller

Future route candidate: `/admin/camera/control`

This screen is for the teacher's hand.

It should prioritize:

- Mode selection.
- Difficulty, duration, and participant setup.
- Start, pause, resume, restart, and end controls.
- Result review after an activity.
- Save/share actions.
- Later: connecting to the large screen player through a session code.

It should avoid:

- Requiring the teacher to run the full camera game on the phone.
- Showing large-screen visual effects as the main experience.
- Mixing classroom display controls with student-facing gameplay UI.

### Tablet Support

Tablet should work as either:

- A portable player when no large display is available.
- A larger controller/review surface.

Tablet is a supported layout target, but decisions should not optimize for tablet at the expense of mobile control or large-screen player clarity.

## Current Page Position

`/admin/camera` is now treated as the Large Screen Player.

Current responsibilities:

- Own the viewport as a fullscreen fixed surface.
- Keep the raw `<video>` element as a hidden input source only.
- Render camera feed and game objects through the full-screen `<canvas>`.
- Show home, lobby, game HUD, result, and report screens inside the player shell.

Near-term responsibilities:

- Keep gameplay readable at desktop, large screen, mobile portrait, and mobile landscape sizes.
- Preserve safe-area spacing for phones.
- Keep the player recoverable during class with clear exit and restart controls.

Non-responsibilities:

- Long-term class/session management.
- Student roster selection.
- Parent-facing reporting.
- Remote-control pairing.

Those should move into the future controller and result/reporting layers.

## Step Roadmap

1. Define screen roles and lock `/admin/camera` as Player Mode.
2. Make Player Mode responsive and stable across large screen web and mobile.
3. Extract reusable settings/result types from the current app.
4. Design the result data model.
5. Build a mobile controller UI draft.
6. Choose the player-controller connection method.
7. Connect the mobile controller to the player.
8. Add content packs by class goal and age group.
9. Save results to backend storage.

## Current Step Status

- Step 1 complete: screen roles are defined.
- Step 2 complete: Player Mode responsive QA checklist and CSS hardening are in place.
- Step 3 complete: shared settings/result contracts exist.
- Step 4 complete: backend-ready result model is drafted.
- Step 5 complete: first mobile controller route exists at `/admin/camera/control`.
- Step 6 complete: player-controller connection method is decided as short-lived session row plus polling.
- Step 7 implementation complete in code: control-session migration, API, controller join/command flow, player code display, polling, and command application exist.
- Step 7 DB pending: `camera_control_sessions` must still be applied to Supabase before the connected flow can run against the real backend.
- Step 8 started: first controller-side content packs exist for age band, class goal, mode, duration, difficulty, and participant setup.
- Step 9 continued: activity result migration, save API, player auto-save, result save status display, and controller recent-results review exist in code.

## Responsive Targets

Player Mode should be checked against:

- 1920 x 1080 desktop/TV.
- 1366 x 768 laptop/classroom display.
- 844 x 390 mobile landscape.
- 430 x 932 mobile portrait.
- 390 x 844 mobile portrait.
- 360 x 740 compact mobile.

Tablet should be checked as a support target:

- 1024 x 768 landscape.
- 768 x 1024 portrait.

## Product Principle

Large screen is the stage. Mobile is the control desk. Data is the memory.
