# Motion Gate image layout

Motion Gate uses one shared image pack. Do not create three Asset Hub packs or
duplicate files. The runtime groups the shared files by option metadata in
`colorGateGuides.ts`.

## Option pools

- `solo-easy`: `jump`, `kick`, `side-squat`, `lunge-reach`, `star`
- `solo-normal`: all 40 solo poses (easy + hard; legacy variant id retained)
- `together-easy`: 10 partner poses defined in `colorGateGuides.ts`

## File placement

Keep every PNG in `public/spomove/dive/color-gate/` and name it with the pose
key, for example `jump.png` or `partner-high-five.png`. This keeps preloading,
cache behavior, and replacement simple. If Asset Hub management is added later,
use a single `spomove_dive_motion_gate` pack with a `variant` field on each
asset; preserve these same three variant ids.

Images should use a transparent background, a centered full-body subject, and
consistent canvas ratio and subject scale. Together images must contain both
participants inside the same image.

## Timing contract

The existing signal-speed value is the gate approach time. A setting of 10
seconds means each gate takes 10 seconds to travel from its spawn position to
the pass line, and the next gate is spawned on the same 10-second cadence.
Motion Gate accepts 1–10 seconds in 0.5-second steps.
