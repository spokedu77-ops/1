# 07 Dead code removal

## Removed

- `app/spokedu/components/subscription-v17/**` (runtime import eliminated from `curriculum-landing.tsx`)
- Typography contract test block referencing v17 CSS

## Retained (orphaned but not routed)

- `app/info/curriculum/*` client landing assets (no longer served)
- `app/info/private/*` client landing assets (no longer served)

Safe follow-up: delete orphaned folders after redirect soak period.

## Preserved

- B5 home, SPOMOVE catalog, contact E2E paths untouched
- MASTER payment/auth code paths untouched
