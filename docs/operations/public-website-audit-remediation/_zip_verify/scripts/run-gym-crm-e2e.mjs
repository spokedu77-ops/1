#!/usr/bin/env node
/**
 * Gym CRM isolated DB E2E — requires CONTACT_E2E_ALLOW_DB_WRITES=1 and approved project ref.
 * Does not call Google Sheets (server env unset).
 */
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { assertContactE2eDbSafety } from '../../phase-2c-contact-e2e/lib/contact-e2e-db-safety.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'qa-evidence');
const repoRoot = path.resolve(here, '../../../..');
nextEnv.loadEnvConfig(repoRoot);

const port = process.env.GYM_E2E_PORT ?? '3040';
const base = `http://127.0.0.1:${port}`;

const evidence = {
  overall: 'FAIL',
  safety: null,
  cases: [],
  cleanup: null,
};

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/info/gym`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('server timeout');
}

let srv;

async function main() {
  srv = spawn('npm run start', { cwd: repoRoot, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitServer();
  try {
    evidence.safety = assertContactE2eDbSafety();
  } catch (e) {
    evidence.safety = { blocked: true, message: String(e.message ?? e) };
    evidence.overall = 'BLOCKED_DB_SAFETY';
    await writeFile(path.join(outDir, 'GYM_CRM_E2E.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(2);
  }
  const marker = `[GYM-E2E-${Date.now().toString(36).toUpperCase()}]`;
  const payload = {
    name: `Gym E2E ${marker}`,
    phone: '01099990001',
    age: '초등 저학년 (1-3학년)',
    consent: true,
    center: 'SPOKEDU LAB',
    msg: marker,
    website: '',
  };

  const missingRes = await fetch(`${base}/api/info/gym/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, name: '', consent: false }),
  });
  evidence.cases.push({ id: 'validation-missing', status: missingRes.status === 400 ? 'PASS' : 'FAIL', http: missingRes.status });

  const okRes = await fetch(`${base}/api/info/gym/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const okBody = await okRes.json();
  const insertPass = okRes.status === 200 && okBody.ok && okBody.id;
  evidence.cases.push({ id: 'insert', status: insertPass ? 'PASS' : 'FAIL', http: okRes.status, id: okBody.id });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  let row = null;
  if (okBody.id) {
    const { data } = await supabase.from('consultations').select('id,lead_route,content,phone').eq('id', okBody.id).single();
    row = data;
    evidence.cases.push({
      id: 'reselect',
      status: data?.lead_route === 'info_gym' && String(data?.content).includes(marker) ? 'PASS' : 'FAIL',
      lead_route: data?.lead_route,
    });
  }

  const dupRes = await fetch(`${base}/api/info/gym/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const dupBody = await dupRes.json();
  evidence.cases.push({
    id: 'dedupe',
    status: dupRes.ok && dupBody.deduped ? 'PASS' : 'FAIL',
  });

  if (row?.id) {
    await supabase.from('consultations').delete().eq('id', row.id);
    const { data: after } = await supabase.from('consultations').select('id').eq('id', row.id).maybeSingle();
    evidence.cleanup = { deleted: true, stillExists: Boolean(after) };
  }

  evidence.overall = evidence.cases.every((c) => c.status === 'PASS') && evidence.cleanup?.stillExists === false ? 'PASS' : 'FAIL';
  await writeFile(path.join(outDir, 'GYM_CRM_E2E.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ overall: evidence.overall }, null, 2));
  process.exit(evidence.overall === 'PASS' ? 0 : 1);
}

main()
  .catch(async (e) => {
    evidence.error = String(e.message ?? e);
    await writeFile(path.join(outDir, 'GYM_CRM_E2E.json'), JSON.stringify(evidence, null, 2));
    process.exit(1);
  })
  .finally(() => {
    if (srv) srv.kill('SIGTERM');
  });
