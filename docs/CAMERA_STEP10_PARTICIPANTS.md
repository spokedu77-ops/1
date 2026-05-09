# Camera Step 10: Participants and Class Linking

Step 10 connects saved camera results to the people or teams who played.

## Simultaneous Play Limit

Current production policy:

- Recommended simultaneous players: 2
- Maximum tracked simultaneous players: 3
- More than 3 students should use team rotation, relay play, or group scoring instead of individual simultaneous tracking.

Reason:

- The player currently runs MediaPipe with `numPoses` set to `MAX_CAMERA_PARTICIPANTS`.
- HUD, scoring, colors, result screen, and saved participant rows are built around three tracked slots.
- In real classrooms, body overlap and camera distance make 4+ simultaneous individual tracking unreliable.

## Product Rule

The app should support simultaneous play, but accuracy beats crowd size.

Use modes like this:

- Solo: one child, clean individual record.
- Multi: two to three children at once, P1/P2/P3 score slots.
- Team: more than three children, but tracked as two or three team lanes.

## Step 10 Scope

First implementation target:

- Keep the player tracking limit at three.
- Show the max player count clearly in controller UI.
- Save participant slots consistently as P1, P2, P3.
- Next, add optional roster/team assignment on the controller so P1/P2/P3 can be linked to actual students or team names.

Implemented first pass:

- The controller has editable slot names for P1/P2/P3.
- Slot names are sent to the player through `updateSettings`.
- The player includes slot names in local results and backend save payloads.
- The result screen and controller result detail can show the saved display names.
- Team mode now stores deterministic `teamId` values (`team-1`, `team-2`, `team-3`) with the participant rows, while individual student linking remains separate.
- The controller can load SPOKEDU Pro tenant students and assign one to each P1/P2/P3 slot.
- Assigned tenant student ids are saved into `camera_activity_participants.student_id`; the slot display name is updated to the selected student name.
- The controller now supports class-group filtering before assigning students to P1/P2/P3.

## Not Yet

Do not expand individual simultaneous tracking beyond three until there is a camera calibration flow and classroom QA proving it works.

The next pass should improve the result review so class-group and student-linked records are easier to scan and export.
