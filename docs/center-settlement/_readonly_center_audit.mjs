#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envText = readFileSync(resolve(root, '.env.local'), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i)] = v;
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { count: centersCount } = await sb.from('centers').select('*', { count: 'exact', head: true });
const { count: activeCount } = await sb.from('centers').select('*', { count: 'exact', head: true }).eq('status', 'active');
const { data: centersSample } = await sb.from('centers').select('id,name,status,session_fee').limit(5);

const { data: sheetCenters, count: sheetCount } = await sb.from('admin_settlement_sheet_centers').select('id,payload', { count: 'exact' });
const noName = (sheetCenters ?? []).filter((r) => !String(r.payload?.name ?? '').trim());
const withCenterId = (sheetCenters ?? []).filter((r) => r.payload?.center_id);
const emptyNameIds = noName.map((r) => ({ id: r.id, name: r.payload?.name, type: r.payload?.type, center_id: r.payload?.center_id }));

const { data: months } = await sb.from('admin_settlement_sheet_months').select('month_key,locked').order('month_key');
const { count: settlementsCount } = await sb.from('settlements').select('*', { count: 'exact', head: true });

const { count: tierFees } = await sb.from('teacher_tier_fees').select('*', { count: 'exact', head: true });
const { count: autoTier } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('fee_auto_from_tier', true);

const byType = {};
for (const r of sheetCenters ?? []) {
  const ty = r.payload?.type ?? 'unknown';
  byType[ty] = (byType[ty] || 0) + 1;
}

const { data: allCenters } = await sb.from('centers').select('id,name,status');
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const centerByName = new Map();
for (const c of allCenters ?? []) {
  const k = norm(c.name);
  if (!k) continue;
  if (!centerByName.has(k)) centerByName.set(k, []);
  centerByName.get(k).push(c);
}
let exactNameMatch = 0;
let ambiguousNameMatch = 0;
let noNameMatch = 0;
const unmatchedSamples = [];
for (const r of sheetCenters ?? []) {
  const n = norm(r.payload?.name);
  if (!n) { noNameMatch += 1; continue; }
  const hits = centerByName.get(n);
  if (!hits?.length) {
    noNameMatch += 1;
    if (unmatchedSamples.length < 8) unmatchedSamples.push({ settlementId: r.id, name: n, type: r.payload?.type });
  } else if (hits.length === 1) exactNameMatch += 1;
  else ambiguousNameMatch += 1;
}

console.log(JSON.stringify({
  settlementByType: byType,
  centersCount,
  activeCentersCount: activeCount,
  centersSample,
  settlementSheetCentersCount: sheetCount,
  settlementNoNameCount: noName.length,
  settlementWithOperationalCenterId: withCenterId.length,
  emptyNameSettlementRows: emptyNameIds,
  monthKeys: months,
  settlementsCount,
  teacher_tier_fees: tierFees,
  users_fee_auto_from_tier: autoTier,
  nameLinkHeuristic: { exactNameMatch, ambiguousNameMatch, noNameMatch, unmatchedSamples },
}, null, 2));
