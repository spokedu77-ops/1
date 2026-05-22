/**
 * RC Contact 테스트 리드 삭제
 * 이름: 테스트 문의입니다 - 삭제 가능
 *
 * Usage: node scripts/delete-rc-test-leads.mjs
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEST_NAME = '테스트 문의입니다 - 삭제 가능';
const TEST_ORG = 'RC 테스트 기관';
const TEST_ORG_CURR = 'RC 테스트 소속';

function loadEnv() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (.env.local)');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const consultTable = env.PRIVATE_LEADS_TABLE?.trim() || 'consultations';

  const report = { consultations: [], dispatch_leads: [] };

  const consultPatterns = [
    { col: 'parent_name', val: TEST_NAME },
    { col: 'parent_name', val: TEST_ORG_CURR },
    { col: 'parent_name', val: `${TEST_ORG} / ${TEST_NAME}` },
    { col: 'content', val: `%${TEST_NAME}%`, like: true },
    { col: 'content', val: `%RC QA 테스트%`, like: true },
    { col: 'content', val: `%RC 테스트%`, like: true },
  ];

  const seenConsult = new Set();
  for (const p of consultPatterns) {
    let q = supabase.from(consultTable).select('id, parent_name, phone, created_at');
    if (p.like) q = q.ilike(p.col, p.val);
    else q = q.eq(p.col, p.val);
    const { data, error } = await q;
    if (error) {
      console.error('consultations select error', p, error.message);
      continue;
    }
    for (const row of data || []) {
      if (!seenConsult.has(row.id)) {
        seenConsult.add(row.id);
        report.consultations.push(row);
      }
    }
  }

  const { data: dispatchRows, error: dErr } = await supabase
    .from('dispatch_leads')
    .select('id, organization_name, manager_name, phone, created_at')
    .or(
      `manager_name.eq.${TEST_NAME},organization_name.eq.${TEST_ORG},inquiry.ilike.%${TEST_NAME}%,inquiry.ilike.%RC QA%`,
    );
  if (dErr) console.error('dispatch_leads select error', dErr.message);
  else report.dispatch_leads = dispatchRows || [];

  console.log('Found consultations:', report.consultations.length);
  report.consultations.forEach((r) => console.log('  -', r.id, r.parent_name, r.phone, r.created_at));
  console.log('Found dispatch_leads:', report.dispatch_leads.length);
  report.dispatch_leads.forEach((r) => console.log('  -', r.id, r.organization_name, r.manager_name));

  if (process.argv.includes('--dry-run')) {
    console.log('Dry run — no deletes.');
    return;
  }

  if (report.consultations.length) {
    const ids = report.consultations.map((r) => r.id);
    const { error } = await supabase.from(consultTable).delete().in('id', ids);
    if (error) console.error('consultations delete error', error.message);
    else console.log('Deleted consultations:', ids.length);
  }

  if (report.dispatch_leads.length) {
    const ids = report.dispatch_leads.map((r) => r.id);
    const { error } = await supabase.from('dispatch_leads').delete().in('id', ids);
    if (error) console.error('dispatch_leads delete error', error.message);
    else console.log('Deleted dispatch_leads:', ids.length);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
