#!/usr/bin/env node
import { createServerClient } from '@supabase/ssr';

const BASE = process.env.STAGE2_LEGACY_BASE_URL || 'http://localhost:3001';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const cookies = [];
const ssr = createServerClient(url, anon, {
  cookies: { getAll: () => cookies, setAll: (n) => cookies.splice(0, cookies.length, ...n) },
});
await ssr.auth.signInWithPassword({
  email: process.env.STAGE29_ADMIN_EMAIL || 'equip-admin@test.local',
  password: process.env.STAGE29_TEST_PASSWORD || 'stage2-equip-test-9',
});
const cookieHeader = cookies.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
const stock = await fetch(`${BASE}/api/admin/equipment/stock`, { headers: { Cookie: cookieHeader } });
const body = await stock.json();
const catalogId = body.items?.[0]?.catalog_id;
const dup = await fetch(`${BASE}/api/admin/equipment/opening`, {
  method: 'POST',
  headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
  body: JSON.stringify({ catalog_id: catalogId, qty_on_hand_total: 10, qty_quarantine: 0, request_key: 'stage2-dup-open-' + Date.now() }),
});
console.log(JSON.stringify({ catalogId, status: dup.status, body: await dup.json() }, null, 2));
