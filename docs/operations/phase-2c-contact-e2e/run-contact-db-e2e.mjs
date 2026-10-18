#!/usr/bin/env node
/**
 * Phase 2-C Closure — isolated DB E2E with pre-flight safety gate.
 * Requires CONTACT_E2E_ALLOW_DB_WRITES=1 and matching CONTACT_E2E_APPROVED_PROJECT_REF.
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { assertContactE2eDbSafety } from './lib/contact-e2e-db-safety.mjs';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const closureDir = path.join(docsDir, 'closure');
const repoRoot = path.resolve(docsDir, '../../..');
const { loadEnvConfig } = nextEnv;
loadEnvConfig(repoRoot);

const port = process.env.CONTACT_E2E_PORT ?? '3022';
const base = `http://127.0.0.1:${port}`;
const runId = `PHASE2C-${Date.now().toString(36).toUpperCase()}`;
const marker = `[${runId}]`;

const evidence = {
  runId,
  marker,
  port,
  base,
  safety: {},
  BUILD_ID: null,
  schema: {},
  cases: [],
  admin: {},
  cleanup: { deletes: [], verify: [] },
  trackedIds: { consultIds: [], dispatchIds: [] },
  overall: 'FAIL',
};

async function readLocalBuildId() {
  try {
    return (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  } catch {
    return null;
  }
}

async function assertServerBuild() {
  const localBuild = await readLocalBuildId();
  evidence.BUILD_ID = localBuild;
  if (process.env.CONTACT_E2E_NO_SPAWN === '1') {
    const expected = process.env.CONTACT_E2E_EXPECTED_BUILD_ID?.trim();
    if (!expected || !localBuild || expected !== localBuild) {
      throw new Error(
        'DB_ENVIRONMENT_BLOCKED: CONTACT_E2E_NO_SPAWN=1 requires CONTACT_E2E_EXPECTED_BUILD_ID matching .next/BUILD_ID',
      );
    }
  }
}

function fail(msg) {
  evidence.fatal = msg;
  throw new Error(msg);
}

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${base}/contact`, { method: 'HEAD' });
      if (r.status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  fail('server timeout');
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  return createClient(url, key, { auth: { persistSession: false } });
}

async function postJson(pathname, body) {
  const res = await fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function trackConsult(id) {
  if (id && !evidence.trackedIds.consultIds.includes(id)) evidence.trackedIds.consultIds.push(id);
}

function trackDispatch(id) {
  if (id && !evidence.trackedIds.dispatchIds.includes(id)) evidence.trackedIds.dispatchIds.push(id);
}

async function probeSchema(sb) {
  const tables = ['consultations', 'dispatch_leads'];
  const out = {};
  for (const table of tables) {
    const probe = await sb.from(table).select('*').limit(1);
    out[table] = {
      reachable: !probe.error || probe.error.code !== '42P01',
      error: probe.error?.message ?? null,
      code: probe.error?.code ?? null,
    };
  }
  const consultCols = ['lead_route', 'lead_context', 'curriculum_mode', 'source_lead_id'];
  const colProbe = await sb.from('consultations').select(consultCols.join(',')).limit(1);
  out.consultations_structured = { ok: !colProbe.error, error: colProbe.error?.message ?? null };
  const dispatchCols = ['mirror_consult_id', 'mirror_status'];
  const dProbe = await sb.from('dispatch_leads').select(dispatchCols.join(',')).limit(1);
  out.dispatch_leads_structured = { ok: !dProbe.error, error: dProbe.error?.message ?? null };
  return out;
}

async function cleanupAndVerify(sb) {
  const { consultIds, dispatchIds } = evidence.trackedIds;
  for (const id of dispatchIds) {
    const d = await sb.from('dispatch_leads').delete().eq('id', id);
    evidence.cleanup.deletes.push({ table: 'dispatch_leads', id, error: d.error?.message ?? null });
  }
  for (const id of consultIds) {
    const d = await sb.from('consultations').delete().eq('id', id);
    evidence.cleanup.deletes.push({ table: 'consultations', id, error: d.error?.message ?? null });
  }

  let verifyOk = true;
  for (const id of [...consultIds, ...dispatchIds]) {
    const table = consultIds.includes(id) ? 'consultations' : 'dispatch_leads';
    const row = await sb.from(table).select('id').eq('id', id).maybeSingle();
    const gone = !row.data?.id;
    evidence.cleanup.verify.push({ table, id, gone, error: row.error?.message ?? null });
    if (!gone || row.error) verifyOk = false;
  }
  return verifyOk;
}

function record(id, status, detail) {
  evidence.cases.push({ id, status, ...detail });
}

let srv;
let sb;
try {
  evidence.safety = assertContactE2eDbSafety();
  await assertServerBuild();
  await mkdir(closureDir, { recursive: true });

  sb = supabaseAdmin();
  evidence.schema = await probeSchema(sb);
  if (!evidence.schema.consultations?.reachable) fail('consultations table unreachable');

  if (process.env.CONTACT_E2E_NO_SPAWN !== '1') {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
  }
  await waitServer();
  if (!evidence.BUILD_ID) evidence.BUILD_ID = await readLocalBuildId();

  const phoneSuffix = String(Date.now()).slice(-4);
  const synthPhone = `0109999${phoneSuffix}`;

  // E06
  {
    const r = await postJson('/api/private/leads', { type: 'private', name: '', phone: '', content: '' });
    record('E06', r.status === 400 && r.json?.ok === false ? 'PASS' : 'FAIL', { http: r.status });
  }

  // C01
  {
    const content = `${marker} C01 private E2E`;
    const body = {
      type: 'private',
      name: `합성_${runId}`,
      phone: synthPhone,
      email: 'phase2c.synthetic@spokedu.test',
      content,
      preferred_format: 'undecided',
      cta_intent_id: 'private_fit_consult',
      acquisition: { entrySurface: 'direct' },
    };
    const r = await postJson('/api/private/leads', body);
    const leadId = r.json?.leadId;
    let dbOk = false;
    if (r.status === 200 && r.json?.ok && leadId) {
      const row = await sb.from('consultations').select('id, consult_type, phone, content').eq('id', leadId).maybeSingle();
      dbOk = !!row.data && row.data.consult_type === 'tutoring' && String(row.data.content).includes(marker);
      if (dbOk) trackConsult(leadId);
    }
    record('C01/E01', dbOk ? 'PASS' : 'FAIL', { leadId, dbVerified: dbOk, emailSent: r.json?.emailSent ?? null });
    const dup = await postJson('/api/private/leads', body);
    record('E11-private-dup', dup.json?.duplicate === true && dup.json?.leadId === leadId ? 'PASS' : 'FAIL', {});
  }

  // C02 / E02 strict
  {
    const org = `합성기관_${runId}`;
    const inquiry = `${marker} C02 dispatch E2E`;
    const body = {
      type: 'dispatch',
      organization: org,
      manager: `담당_${runId}`,
      phone: synthPhone,
      email: 'phase2c.synthetic@spokedu.test',
      location: '서울',
      headcount: '30',
      specialNeeds: inquiry,
      inquiry,
      programs: ['정규수업'],
      targetAge: ['초등'],
      source: 'phase2c-e2e',
      cta_intent_id: 'dispatch_proposal',
      acquisition: { entrySurface: 'direct' },
    };
    const r = await postJson('/api/dispatch/leads', body);
    const consultId = r.json?.consultId ?? r.json?.leadId;
    const detailId = r.json?.detailId;
    let pass = false;
    if (r.status === 200 && r.json?.ok && consultId && detailId && r.json?.detailStatus === 'synced') {
      const c = await sb
        .from('consultations')
        .select('id, consult_type, source_lead_id, content')
        .eq('id', consultId)
        .maybeSingle();
      const d = await sb
        .from('dispatch_leads')
        .select('id, organization_name, mirror_consult_id')
        .eq('id', detailId)
        .maybeSingle();
      pass =
        !!c.data &&
        !!d.data &&
        c.data.consult_type === 'center' &&
        c.data.source_lead_id === detailId &&
        d.data.organization_name === org &&
        d.data.mirror_consult_id === consultId &&
        String(c.data.content).includes(marker);
      if (pass) {
        trackConsult(consultId);
        trackDispatch(detailId);
      }
    }
    record('C02/E02', pass ? 'PASS' : 'FAIL', {
      consultId,
      detailId,
      detailStatus: r.json?.detailStatus,
      dbVerified: pass,
      path: 'happy-path-synced',
    });
  }

  // C03 SPOMOVE
  {
    const org = `SPOMOVE_${runId}`;
    const inquiry = `${marker} C03 SPOMOVE E2E`;
    const body = {
      type: 'dispatch',
      organization: org,
      manager: `담당_${runId}`,
      phone: `0108888${phoneSuffix}`,
      email: 'phase2c.spomove@spokedu.test',
      location: '경기',
      headcount: '25',
      specialNeeds: inquiry,
      inquiry,
      programs: ['SPOMOVE'],
      targetAge: ['초등'],
      source: 'spokedu-contact-spomove',
      cta_intent_id: 'dispatch_proposal',
      acquisition: { entrySurface: 'direct' },
    };
    const r = await postJson('/api/dispatch/leads', body);
    const consultId = r.json?.consultId;
    let dbOk = false;
    if (consultId && r.json?.detailId) {
      const c = await sb.from('consultations').select('id, content').eq('id', consultId).maybeSingle();
      dbOk = !!c.data && String(c.data.content).includes('SPOMOVE') && String(c.data.content).includes(marker);
      if (dbOk) {
        trackConsult(consultId);
        trackDispatch(r.json.detailId);
      }
    }
    record('C03/E03', dbOk ? 'PASS' : 'FAIL', { consultId, dbVerified: dbOk });
  }

  // C04 + curriculum dedupe scenarios
  const curriculumPhone = `0107777${phoneSuffix}`;
  const curriculumOrg = `구독_${runId}`;
  {
    const extra = `${marker} C04 curriculum E2E purpose-A`;
    const body = {
      type: 'curriculum',
      lead_mode: 'master',
      name_or_org: curriculumOrg,
      phone: curriculumPhone,
      content_type: '구독시스템',
      target_age: '초등',
      purpose: '기관 도입',
      teacher_training: '상담 후 결정',
      partnership_type: '구독·교육',
      extra,
      cta_intent_id: 'master_org_inquiry',
      acquisition: { entrySurface: 'direct' },
    };
    const r = await postJson('/api/curriculum/leads', body);
    const leadId = r.json?.leadId;
    let dbOk = false;
    if (leadId) {
      const c = await sb.from('consultations').select('id, content, curriculum_mode').eq('id', leadId).maybeSingle();
      dbOk = !!c.data && String(c.data.content).includes(marker);
      if (dbOk) trackConsult(leadId);
    }
    const dup = await postJson('/api/curriculum/leads', body);
    record('C04/E04', dbOk ? 'PASS' : 'FAIL', { leadId, dbVerified: dbOk });
    record('dedupe-curriculum-repeat', dup.json?.duplicate === true && dup.json?.leadId === leadId ? 'PASS' : 'FAIL', {});

    const bodyOtherPurpose = {
      ...body,
      purpose: '내부 운영',
      partnership_type: '내부 운영',
      extra: `${marker} C04 curriculum different purpose`,
    };
    const r2 = await postJson('/api/curriculum/leads', bodyOtherPurpose);
    const leadId2 = r2.json?.leadId;
    const separate =
      r2.json?.ok &&
      !r2.json?.duplicate &&
      leadId2 &&
      leadId2 !== leadId;
    if (separate) trackConsult(leadId2);
    record('dedupe-curriculum-different-purpose', separate ? 'PASS' : 'FAIL', { leadId2 });

    const bodyOtherExtra = {
      ...body,
      extra: `${marker} C04 curriculum different extra content`,
    };
    const r3 = await postJson('/api/curriculum/leads', bodyOtherExtra);
    const leadId3 = r3.json?.leadId;
    const separateExtra = r3.json?.ok && !r3.json?.duplicate && leadId3 && leadId3 !== leadId;
    if (separateExtra) trackConsult(leadId3);
    record('dedupe-curriculum-different-content', separateExtra ? 'PASS' : 'FAIL', { leadId3 });
  }

  // C05 license
  {
    const extra = `${marker} C05 license E2E`;
    const body = {
      type: 'curriculum',
      lead_mode: 'license',
      name_or_org: `협업_${runId}`,
      phone: `0106666${phoneSuffix}`,
      content_type: '라이선스',
      target_age: '',
      purpose: '협업 검토',
      teacher_training: '상담 후 결정',
      partnership_type: '협업 검토',
      extra,
      cta_intent_id: 'license_consult',
      acquisition: { entrySurface: 'direct' },
    };
    const r = await postJson('/api/curriculum/leads', body);
    const leadId = r.json?.leadId;
    let dbOk = false;
    if (leadId) {
      const c = await sb.from('consultations').select('id, content').eq('id', leadId).maybeSingle();
      dbOk = !!c.data && String(c.data.content).includes(marker);
      if (dbOk) trackConsult(leadId);
    }
    record('C05/E05', dbOk ? 'PASS' : 'FAIL', { leadId, dbVerified: dbOk });
  }

  record('E07', (await postJson('/api/dispatch/leads', { type: 'dispatch', organization: 'x', manager: 'y', phone: '', email: 'bad', inquiry: 'z' })).status === 400 ? 'PASS' : 'FAIL', {});

  const unauth = await fetch(`${base}/api/admin/consult?limit=5`);
  record('E14', unauth.status === 401 ? 'PASS' : 'FAIL', { http: unauth.status });

  evidence.overall = 'PASS';
} catch (e) {
  const msg = String(e.message ?? e);
  evidence.error = msg;
  if (msg.includes('DB_ENVIRONMENT_BLOCKED')) evidence.overall = 'DB_ENVIRONMENT_BLOCKED';
  else evidence.overall = 'FAIL';
} finally {
  if (sb && evidence.trackedIds.consultIds.length + evidence.trackedIds.dispatchIds.length > 0) {
    try {
      const cleanupOk = await cleanupAndVerify(sb);
      evidence.cleanup.ok = cleanupOk;
      if (!cleanupOk) {
        evidence.overall = 'FAIL';
        evidence.cleanupFailure = true;
      }
    } catch (ce) {
      evidence.cleanup.error = String(ce.message ?? ce);
      evidence.overall = 'FAIL';
    }
  }

  const coreFail = evidence.cases.some(
    (c) =>
      ['C01/E01', 'C02/E02', 'C03/E03', 'C04/E04', 'C05/E05', 'E06', 'E14'].includes(c.id) && c.status === 'FAIL',
  );
  const dedupeFail = evidence.cases.some((c) => c.id.startsWith('dedupe-') && c.status === 'FAIL');
  if (coreFail || dedupeFail || evidence.cleanupFailure) evidence.overall = 'FAIL';
  else if (evidence.overall === 'PASS') evidence.overall = 'PASS';

  await mkdir(closureDir, { recursive: true });
  await writeFile(path.join(closureDir, 'DB_E2E_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  await writeFile(path.join(docsDir, 'DB_E2E_EVIDENCE.json'), JSON.stringify(evidence, null, 2));

  console.log(JSON.stringify({ overall: evidence.overall, runId, safety: evidence.safety }, null, 2));
  if (srv) srv.kill('SIGTERM');
  if (evidence.overall === 'FAIL' || evidence.overall === 'DB_ENVIRONMENT_BLOCKED') process.exit(1);
}
