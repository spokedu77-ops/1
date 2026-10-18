# 05 Public API security

Routes guarded: `/api/consult`, `/api/private/leads`, `/api/dispatch/leads`, `/api/curriculum/leads`, `/api/info/gym/leads`.

Shared module: `app/lib/server/publicLeadSpamGuard.ts`

- Honeypot `website` → silent 200
- Rate limit: Supabase RPC `public_lead_rate_limit_check` when migration applied; memory fallback if RPC missing (documented)
- Production-only rate enforcement; 429 on exceed
- Trusted IP: `x-forwarded-for` / `x-real-ip`

Migration: `supabase/migrations/20261018120000_public_lead_rate_limit.sql` (apply on staging before relying on shared limiter).

Tests: `publicLeadSpamGuard.test.ts`
