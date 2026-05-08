# Camera Content Packs

This document captures Step 8 of the camera roadmap: add class-ready content packs by age band and class goal.

## Purpose

Content packs let the teacher start from a class intent instead of manually choosing every camera game setting.

The pack should decide:

- target age band
- class goal
- mode
- difficulty
- duration
- solo or multi participant setup
- coaching focus

## Implemented File

- `app/admin/camera/contentPacks.ts`

The mobile controller at `/admin/camera/control` now shows a content-pack section.

Selecting a pack updates:

- selected mode
- difficulty
- duration
- participant mode
- local settings storage
- remote player command, when connected

## Initial Packs

- Reaction warmup: lower elementary, speed mode, 20 seconds, easy, multi.
- Memory sequence: mixed age, sequence mode, 30 seconds, normal, solo.
- Shape attention: preschool, shape mode, 30 seconds, easy, multi.
- Moving agility: upper elementary, moving mode, 30 seconds, hard, multi.
- Balance focus: mixed age, balance mode, 30 seconds, normal, solo.
- Mirror coordination: lower elementary, mirror mode, 30 seconds, normal, multi.

## Command Protocol

The controller can send a single `applyContentPack` command:

```ts
{
  type: 'applyContentPack',
  packId: string,
  mode: CameraModeId,
  settings: Partial<CameraSettings>
}
```

This avoids sending separate mode and setting commands that could overwrite each other in the polling transport.

## Next Expansion

The next useful expansion is to connect packs to actual lesson templates:

- warmup
- main activity
- cooldown
- assessment
- group challenge

Each lesson template can contain 2-4 packs in sequence.
