/**
 * 강사 inventory / teacher_inventory / 대여·반납 원장·legacy import staging 일괄 삭제.
 * DB에 equipment_ops_purge_teacher_holdings() 가 있어야 합니다.
 * 사용: node scripts/purge-teacher-holdings.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.');
  process.exit(1);
}

const service = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await service.rpc('equipment_ops_purge_teacher_holdings');
if (error) {
  console.error(error);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, deleted: data }, null, 2));
