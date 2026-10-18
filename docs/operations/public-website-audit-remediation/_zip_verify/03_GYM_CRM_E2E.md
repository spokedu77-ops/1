# 03 Gym CRM E2E

## Architecture (implemented)

`ContactForm` → `POST /api/info/gym/leads` → `consultations` insert (`consult_type: center`, `lead_route: info_gym`) → optional `GYM_LEADS_GOOGLE_SCRIPT_URL` server sync.

- DB failure → HTTP 500, no success UI
- Sheet failure after DB success → customer submission still OK
- Honeypot field `website` (hidden)
- Google Script URL removed from public `config.ts`

## Evidence

- `app/api/info/gym/leads/route.test.ts` — insert success/fail contract
- **Live DB write E2E:** NOT RUN (no approved isolated write in this session)

## Privacy copy

Gym form consent text updated to CRM retention (no “상담 종료 후 즉시 파기”).
