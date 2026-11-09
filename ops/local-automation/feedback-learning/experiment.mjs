#!/usr/bin/env node
/**
 * SPOKEDU local, read-only A/B experiment. NO writes to Supabase or n8n.
 * All raw student feedback stays in process memory; LM Studio must be loopback.
 * Output contains aggregate metrics and opaque SHA-256 case ids only.
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optional: LM_STUDIO_BASE_URL (default http://127.0.0.1:1234), LM_STUDIO_MODEL,
 *           SPOKEDU_AB_LIMIT (default 30), SPOKEDU_AB_OUTPUT (local JSON path).
 */
import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const FIELDS = ['main_activity', 'strengths', 'improvements', 'next_goals', 'condition_notes'];
const baseUrl = (process.env.LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234').replace(/\/+$/, '');
const model = process.env.LM_STUDIO_MODEL || 'qwen3.5-9b';
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const requestedSamples = Number(process.env.SPOKEDU_AB_LIMIT || 30);
if (!Number.isInteger(requestedSamples) || requestedSamples < 5 || requestedSamples > 100) {
  throw Error('SPOKEDU_AB_LIMIT must be an integer from 5 to 100');
}
const maxSamples = requestedSamples;
const outputPath = resolve(process.env.SPOKEDU_AB_OUTPUT || 'ops/local-automation/feedback-learning/results/ab-latest.json');

function requireLoopback(url) {
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || u.protocol !== 'http:') {
    throw Error('LM Studio MUST be local loopback HTTP; refusing nonlocal inference destination');
  }
}
requireLoopback(baseUrl);

const digest = x => createHash('sha256').update(x).digest('hex').slice(0,16);
const withTimeout = async (url, opts = {}, ms = 120000) => {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(timeout); }
};
const sourceKeys = x => Object.fromEntries(FIELDS.map(k => [k, String(x?.[k] ?? '').trim()]));
const valid = x => FIELDS.every(k => typeof x?.[k] === 'string' && x[k].trim().length >= 1);
const tokenSet = s => new Set(String(s).match(/SPOMOVE[\w-]*|\b\d+(?:[.:]\d+)?(?:%|회|초|분|세트|m)?\b/g) || []);
const preserved = (src, dst) => FIELDS.every(k => [...tokenSet(src[k])].every(t => dst[k]?.includes(t)));
const unsupported = (src, dst) => FIELDS.some(k => String(dst[k] ?? '').length > String(src[k] ?? '').length * 1.45 + 120);
const words = s => new Set(String(s).match(/[가-힣A-Za-z]{2,}/g) || []);
const overlap = (src, dst) => {
  const a = words(src), b = words(dst);
  if (!a.size) return 1;
  return [...a].filter(x => b.has(x)).length / a.size;
};
const BASELINE = 'Correct Korean teacher feedback field-by-field. For EACH key in source_feedback, fix spelling/grammar only for THAT field. Do not swap or copy content between fields. Do not invent facts, scores, or behaviors. Keep SPOMOVE literals unchanged. Return JSON with EXACTLY keys: main_activity, strengths, improvements, next_goals, condition_notes (strings only). No nested objects or extra keys.';
const CANDIDATE = [
  '너는 SPOKEDU 아동·청소년 체육수업 피드백 편집자다. 이것은 원문의 사실을 보존하는 보수적 편집 작업이다.',
  '교정 목표: 오탈자, 비문, 중복, 과도한 단정, 낙인성 표현을 필요할 때만 수정한다.',
  '수업 활동명, 종목, 신체기능, 학생 수행, 기록·횟수·시간, 특이사항 등 관찰 사실은 바꾸지 않는다.',
  '사실에 없는 평가, 성취, 향상, 장애 특성, 학생 행동, 차기 계획을 추가하지 않는다. 근거 없는 인과관계와 보장형 표현을 피한다.',
  '강점은 원문에 있는 구체적 수행을 보존하고, 개선점은 비난이나 일반적 능력 판정 대신 관찰된 과제 수준에서 표현한다.',
  '다음 목표는 원문에 이미 언급된 계획만 더 명료하게 정리한다. 새로운 활동을 추가하지 않는다.',
  '특이사항의 시간, 부상·휴식 등 사실은 그대로 보존한다. SPOMOVE 표기와 프로그램·과제 이름을 유지한다.',
  '이미 자연스러운 문장은 그대로 반환한다. 원문을 억지로 바꾸거나 늘리지 않는다.',
  '각 항목은 해당 항목만 편집한다. 항목 사이의 정보 이동 금지.',
  '정확히 main_activity, strengths, improvements, next_goals, condition_notes 다섯 문자열 키를 가진 JSON 객체만 반환한다.',
].join('\n');

async function getPage(from, to) {
  const u = new URL(supabaseUrl + '/rest/v1/sessions');
  u.searchParams.set('select', 'id,session_type,status,feedback_fields');
  u.searchParams.set('order', 'id.asc');
  const res = await withTimeout(u, {
    headers: {
      apikey: secret,
      Authorization: 'Bearer ' + secret,
      Range: from + '-' + to,
      'Range-Unit': 'items',
    },
  }, 45000);
  if (!res.ok) throw Error('Supabase read failed: HTTP ' + res.status);
  return res.json();
}
async function getCorpus() {
  const all = [];
  for (let from = 0; ; from += 500) {
    const rows = await getPage(from, from + 499);
    all.push(...rows);
    if (rows.length < 500) break;
  }
  return all;
}
async function infer(system, fields) {
  const res = await withTimeout(baseUrl + '/v1/chat/completions', {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.1, messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify({ source_feedback: fields, required_keys: FIELDS }) },
    ] }),
  });
  if (!res.ok) throw Error('Local LM Studio HTTP ' + res.status);
  const json = await res.json();
  const c = String(json.choices?.[0]?.message?.content ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(c);
}
function metrics(src, dst) {
  if (!valid(dst) || Object.keys(dst).some(k => !FIELDS.includes(k))) return { valid: false, changed: 0, numericPreserved: false, lengthSafe: false, lexicalOverlap: 0 };
  return {
    valid: true,
    changed: FIELDS.filter(k => src[k] !== dst[k].trim()).length,
    numericPreserved: preserved(src, dst),
    lengthSafe: !unsupported(src, dst),
    lexicalOverlap: Number((FIELDS.reduce((s,k)=>s+overlap(src[k],dst[k]),0) / FIELDS.length).toFixed(3)),
  };
}
// Fast local test: exercises the gate without reading Supabase or calling Qwen.
if (process.argv.includes('--self-test')) {
  const sample = {
    main_activity: 'SPOMOVE 10회 점프를 실시했습니다.',
    strengths: '공을 5회 정확히 받았습니다.',
    improvements: '자세 유지가 어려웠습니다.',
    next_goals: '다음 회차 10회 반복하겠습니다.',
    condition_notes: '14:00 시작, 15:00 종료',
  };
  const unchanged = metrics(sample, sample);
  if (!unchanged.valid || unchanged.changed !== 0 || !unchanged.numericPreserved || !unchanged.lengthSafe) throw Error('unchanged case gate broken');
  const changed = { ...sample, improvements: '자세를 일정하게 유지하기는 어려웠습니다.' };
  const changeMetrics = metrics(sample, changed);
  if (!changeMetrics.valid || changeMetrics.changed !== 1 || !changeMetrics.numericPreserved) throw Error('single-field diff gate broken');
  const broken = { ...sample, strengths: '공을 8회 정확히 받았습니다.' };
  if (metrics(sample, broken).numericPreserved) throw Error('fabricated count was not flagged');
  const invalid = { ...sample, next_goals: '' };
  if (metrics(sample, invalid).valid) throw Error('empty field accepted');
  console.log('SELF_TEST_PASS: no DB read, no model call, no file output');
  process.exit(0);
}
if (!supabaseUrl.startsWith('https://') || !secret) throw Error('Missing Supabase HTTPS URL or service key (local env only)');

const rows = await getCorpus();
const eligible = rows.filter(r => r.status === 'verified' && r.session_type === 'regular_private' && valid(r.feedback_fields));
const groups = { total: rows.length, nonempty: rows.filter(r=>FIELDS.some(k=>String(r.feedback_fields?.[k]||'').trim())).length, verifiedPrivateFive: eligible.length };
/* Stable, repeatable 20% held-out split; never use evaluation cases as retrieval examples. */
const holdout = eligible.filter(r => parseInt(digest(String(r.id)).slice(0,4),16) % 5 === 0)
  .sort((a,b)=>digest(a.id).localeCompare(digest(b.id))).slice(0,maxSamples);
if (holdout.length < 5) throw Error('Not enough held-out verified examples');
const cases = [];
for (const row of holdout) {
  const src = sourceKeys(row.feedback_fields);
  const item = { caseId: digest(row.id), sessionType: row.session_type };
  for (const [name,prompt] of [['baseline',BASELINE],['candidate',CANDIDATE]]) {
    try { item[name] = metrics(src, await infer(prompt,src)); }
    catch (e) { item[name] = { valid:false, error: String(e?.message||e).slice(0,100) }; }
  }
  cases.push(item);
  // Do not print original text, prompts containing student data, or raw model outputs.
  process.stdout.write('Evaluated '+cases.length+'/'+holdout.length+'\r');
}
const summarize = name => {
  const x = cases.map(c=>c[name]); const good = x.filter(v=>v.valid);
  return { valid: good.length, invalid: x.length-good.length,
    changedCases: good.filter(v=>v.changed>0).length,
    unchangedCases: good.filter(v=>v.changed===0).length,
    safeNumberCases: good.filter(v=>v.numericPreserved).length,
    safeLengthCases: good.filter(v=>v.lengthSafe).length,
    meanOverlap: good.length ? Number((good.reduce((a,b)=>a+b.lexicalOverlap,0)/good.length).toFixed(3)) : null,
    };
};
const result = {
  generatedAt: new Date().toISOString(), model, dataScope: groups, heldOutCases: holdout.length,
  description: 'Automated safety/format checks only; editorial quality requires blinded human review.',
  baseline: summarize('baseline'), candidate: summarize('candidate'), cases,
  approvedForProduction: false,
};
await mkdir(dirname(outputPath), {recursive:true});
await writeFile(outputPath, JSON.stringify(result,null,2)+'\n', {mode:0o600});
process.stdout.write('\nSaved aggregate-only result to '+outputPath+'\n');
process.stdout.write(JSON.stringify({ baseline:result.baseline, candidate:result.candidate, heldOutCases:result.heldOutCases },null,2)+'\n');
