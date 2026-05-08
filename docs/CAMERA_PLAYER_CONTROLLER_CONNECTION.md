# Camera Player-Controller Connection

This document captures Step 6 of the camera roadmap: choose how the mobile controller will talk to the large screen player.

## Decision

Use a short-lived session row plus polling for the first connected version.

Do not start with Supabase Realtime.

## Why Polling First

Polling is the better first implementation because:

- It is easier to debug in classroom networks.
- It works with normal route handlers and existing Supabase patterns.
- It avoids realtime subscription lifecycle issues on mobile browsers.
- It is enough for start, pause, resume, end, and settings changes.
- It can be upgraded later without changing the user-facing controller flow.

Expected polling interval:

- Player polls every 700-1000 ms while paired.
- Controller writes commands immediately.
- Player acknowledges commands after applying them.

If classroom latency feels too high, upgrade only the command transport to Supabase Realtime while keeping the same command protocol.

## Pairing Flow

1. Large screen player opens `/admin/camera`.
2. Player creates a short-lived connection session.
3. Player shows a 4-6 character code.
4. Teacher opens `/admin/camera/control`.
5. Teacher enters the code.
6. Controller fetches the session and starts writing commands.
7. Player polls and applies the latest unacknowledged command.

## Proposed Table

Future migration candidate: `camera_control_sessions`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | Primary key. |
| `code` | text | Short pairing code, unique while active. |
| `status` | text | `waiting`, `paired`, `active`, `ended`, `expired`. |
| `player_state` | jsonb | Player status snapshot. |
| `controller_state` | jsonb | Controller status snapshot. |
| `last_command` | jsonb nullable | Latest command written by controller. |
| `last_command_id` | text nullable | Client-generated id for idempotency. |
| `last_ack_command_id` | text nullable | Last command applied by player. |
| `expires_at` | timestamptz | Pairing/session expiry. |
| `created_by` | uuid nullable | Teacher/admin creating the session. |
| `created_at` | timestamptz | Insert timestamp. |
| `updated_at` | timestamptz | Update timestamp. |

Recommended indexes:

- unique partial index on active `code`
- `(created_by, created_at desc)`
- `(expires_at)`

## Command Protocol

Commands should be idempotent and replaceable.

The controller writes a command with a unique `commandId`. The player applies it once and writes that id into `last_ack_command_id`.

Command types:

- `selectMode`
- `updateSettings`
- `start`
- `pause`
- `resume`
- `end`
- `reset`

## Failure Behavior

Player:

- If polling fails, keep the current game state.
- If session expires, show disconnected state.
- If command is already acknowledged, ignore it.

Controller:

- If polling/fetch fails, show disconnected state.
- If player has not acknowledged for several seconds, show pending state.
- If session expires, ask teacher to reconnect.

## Security Direction

Initial version should require authenticated admin/teacher routes.

Avoid anonymous writes. The code is for pairing convenience, not for public authorization.

## Step 7 Handoff

Step 7 should implement the backend storage/API:

- migration for `camera_control_sessions`
- API route to create a player session
- API route to join by code
- API route to write controller command
- API route or polling read endpoint for player state

## Step 7 Implementation

Implemented files:

- `supabase/migrations/20260508100000_camera_control_sessions.sql`
- `app/api/admin/camera/control-session/route.ts`
- `app/admin/camera/control/page.tsx`
- `app/admin/camera/SpokeduCameraApp.tsx`

Implemented API actions:

- `create`: player creates a short-lived session and receives a code.
- `join`: controller joins an active session by code.
- `command`: controller writes the latest command envelope.
- `ack`: player acknowledges the applied command.
- `state`: player updates its current state.
- `end`: marks the control session ended.

The controller draft now calls `join` and sends command actions when connected.
The player can create/show a pairing code, poll the session, apply commands, and acknowledge the latest command id.

Still pending:

- Applying `supabase/migrations/20260508100000_camera_control_sessions.sql` to the actual Supabase database.
- Expired-session cleanup job.
