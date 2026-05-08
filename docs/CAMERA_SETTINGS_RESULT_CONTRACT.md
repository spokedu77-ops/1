# Camera Settings And Result Contract

This document captures Step 3 of the camera roadmap: extract the shared settings and result contracts that the player, future mobile controller, and storage layer can all use.

## Shared Mode Ids

Source: `app/admin/camera/constants.ts`

`CameraModeId` is the shared activity mode id.

Current modes:

- `speed`
- `sequence`
- `shape`
- `moving`
- `balance`
- `mirror`

These ids should be treated as stable product identifiers. Display labels, emoji, and descriptions can change, but stored records and controller commands should use these ids.

## Shared Settings

Source: `app/admin/camera/types.ts`

`CameraSettings`:

```ts
interface CameraSettings {
  diff: DiffKey;
  dur: number;
  multiOn: boolean;
  soundOn: boolean;
}
```

Current duration options are `20`, `30`, and `60` seconds.

Use this contract for:

- Player lobby settings.
- Future mobile controller settings.
- Local storage.
- Future backend session defaults.

## Shared Result Record

Source: `app/admin/camera/types.ts`

`CameraResultRecord`:

```ts
interface CameraResultRecord {
  date: string;
  mode: CameraModeId;
  diff: DiffKey;
  dur: number;
  scores: number[];
  avgRt: number | null;
  total: number;
}
```

This is still a lightweight local result record. Step 4 should expand this into a backend-ready data model with session, class, teacher, participant, and metric fields.

## Storage Normalization

Source: `app/admin/camera/store.ts`

The local store now normalizes loaded settings and history before the app uses them.

This matters because older localStorage data may contain:

- Unknown difficulty values.
- Invalid durations.
- Missing boolean settings.
- Old or malformed history rows.

The player should receive clean settings every time through `Store.getSettings()`.

## Next Contract Work

Step 4 should define the backend-ready result model:

- `sessionId`
- `teacherId`
- `centerId`
- `classId`
- `participantMode`
- `participants`
- `startedAt`
- `endedAt`
- `metrics`
- `device`
- `notes`

