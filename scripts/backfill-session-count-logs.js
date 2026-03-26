/* eslint-disable no-console */
/**
 * session_count_logs 누락 백필 스크립트
 *
 * - 대상: sessions.status IN ('finished','verified')
 * - 후보 teacher_id: sessions.created_by(주강사) + sessions.memo의 EXTRA_TEACHERS[](보조강사)
 * - 기준: (session_id, teacher_id) 조합으로 session_count_logs가 없으면 INSERT
 * - 실행: Node(CommonJS)로 즉시 실행 가능
 *
 * 주의: 이 스크립트는 "직접 실행" 전용 백필 도구입니다.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvValue(key) {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local not found: ${envPath}`);
  }
  const text = fs.readFileSync(envPath, 'utf8');
  // 이 스크립트는 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY처럼 "한 줄 문자열"만 필요합니다.
  // (FIREBASE_SERVICE_ACCOUNT_JSON 같이 멀티라인 값은 파싱하지 않습니다.)
  const lines = text.split(/\r?\n/);
  const prefix = `${key}=`;
  const line = lines.find((l) => l.startsWith(prefix));
  if (!line) return undefined;
  let value = line.slice(prefix.length).trim();
  // .env.local은 대체로 KEY="VALUE" 형태로 감싸져 있음
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  return value;
}

function isUuid(maybe) {
  if (!maybe || typeof maybe !== 'string') return false;
  const s = maybe.trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

function parseExtraTeachers(memo) {
  if (!memo || typeof memo !== 'string') return [];
  if (!memo.includes('EXTRA_TEACHERS:')) return [];

  // 예: "... EXTRA_TEACHERS:[{...},{...}]"
  // 메모가 줄바꿈을 포함할 수 있으므로 [\s\S]로 전체를 허용
  const match = memo.match(/EXTRA_TEACHERS:\s*(\[[\s\S]*?\])/);
  if (!match || !match[1]) return [];

  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => (x && typeof x === 'object' ? x : null))
      .filter(Boolean)
      .map((x) => ({
        id: x.id,
        price: x.price,
      }));
  } catch {
    return [];
  }
}

async function main() {
  const supabaseUrl = loadEnvValue('NEXT_PUBLIC_SUPABASE_URL') || loadEnvValue('SUPABASE_URL');
  const serviceRoleKey = loadEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl) throw new Error('Missing supabaseUrl in .env.local (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)');
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');

  // 보안상 키 원문은 출력하지 않고, 문자 범위/길이만 확인합니다.
  {
    let maxChar = 0;
    let minChar = 999999;
    for (let i = 0; i < serviceRoleKey.length; i++) {
      const c = serviceRoleKey.charCodeAt(i);
      if (c > maxChar) maxChar = c;
      if (c < minChar) minChar = c;
    }
    console.log('[backfill] supabaseUrl', supabaseUrl);
    console.log('[backfill] serviceRoleKey_len', serviceRoleKey.length, 'minChar', minChar, 'maxChar', maxChar);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const pageSize = 200;
  let offset = 0;
  let totalConsidered = 0;
  let totalInserted = 0;
  let totalMissingAfterInsert = 0;

  console.log('[backfill] start');

  // 1) 누락분 INSERT
  while (true) {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id,title,memo,created_by,start_at,status')
      .in('status', ['finished', 'verified'])
      .order('start_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!sessions || sessions.length === 0) break;

    const sessionIds = sessions.map((s) => s.id).filter(Boolean);
    const teacherIdCandidates = [];
    const pairsToConsider = []; // { sessionId, teacherId, sessionTitle }

    for (const s of sessions) {
      const sessionId = s.id;
      const sessionTitle = s.title ?? null;

      // 주강사
      if (isUuid(s.created_by)) {
        const teacherId = s.created_by.trim();
        teacherIdCandidates.push(teacherId);
        pairsToConsider.push({ sessionId, teacherId, sessionTitle });
      }

      // 보조강사
      const extraTeachers = parseExtraTeachers(s.memo);
      for (const ex of extraTeachers) {
        if (isUuid(ex.id)) {
          const teacherId = ex.id.trim();
          teacherIdCandidates.push(teacherId);
          pairsToConsider.push({ sessionId, teacherId, sessionTitle });
        }
      }
    }

    // 중복 후보 제거(세션 내 동일 보조강사 2번 등 방어)
    const uniquePairsMap = new Map();
    for (const p of pairsToConsider) {
      const key = `${p.sessionId}__${p.teacherId}`;
      if (!uniquePairsMap.has(key)) uniquePairsMap.set(key, p);
    }
    const uniquePairs = Array.from(uniquePairsMap.values());

    // 이미 존재하는 logs 조회(teacher_id가 여러 개라 teacher_id IN 조건 사용)
    const uniqueTeacherIds = Array.from(new Set(uniquePairs.map((p) => p.teacherId)));
    const existingSet = new Set();

    if (sessionIds.length > 0 && uniqueTeacherIds.length > 0) {
      const { data: existingLogs, error: e2 } = await supabase
        .from('session_count_logs')
        .select('session_id,teacher_id')
        .in('session_id', sessionIds)
        .in('teacher_id', uniqueTeacherIds);
      if (e2) throw e2;

      if (existingLogs) {
        for (const row of existingLogs) {
          if (!row?.session_id || !row?.teacher_id) continue;
          existingSet.add(`${row.session_id}__${row.teacher_id}`);
        }
      }
    }

    const missingPairs = uniquePairs.filter((p) => !existingSet.has(`${p.sessionId}__${p.teacherId}`));

    // INSERT
    if (missingPairs.length > 0) {
      const insertRows = missingPairs.map((p) => ({
        teacher_id: p.teacherId,
        session_id: p.sessionId,
        session_title: p.sessionTitle,
        count_change: 1,
        reason: '백필: 로그 누락 복구',
      }));

      const { error: insErr } = await supabase.from('session_count_logs').insert(insertRows);
      if (insErr) {
        console.error('[backfill] insert error', insErr);
        throw insErr;
      }

      totalInserted += insertRows.length;
      totalMissingAfterInsert += 0; // 아래 2)에서 검증
    }

    totalConsidered += sessions.length;
    console.log(`[backfill] page done offset=${offset} sessions=${sessions.length} missingInserted=${missingPairs.length}`);

    offset += pageSize;
  }

  console.log(`[backfill] insert phase finished. consideredSessions=${totalConsidered}, insertedLogs=${totalInserted}`);

  // 2) 검증(다시 누락 후보를 계산해서 남은 missing이 있는지 확인)
  offset = 0;
  let verifyConsidered = 0;
  while (true) {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id,title,memo,created_by,start_at,status')
      .in('status', ['finished', 'verified'])
      .order('start_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!sessions || sessions.length === 0) break;

    const sessionIds = sessions.map((s) => s.id).filter(Boolean);
    const teacherIdCandidates = [];
    const uniquePairsMap = new Map();

    for (const s of sessions) {
      const sessionId = s.id;
      const sessionTitle = s.title ?? null;

      if (isUuid(s.created_by)) {
        const teacherId = s.created_by.trim();
        teacherIdCandidates.push(teacherId);
        uniquePairsMap.set(`${sessionId}__${teacherId}`, { sessionId, teacherId, sessionTitle });
      }

      const extraTeachers = parseExtraTeachers(s.memo);
      for (const ex of extraTeachers) {
        if (isUuid(ex.id)) {
          const teacherId = ex.id.trim();
          teacherIdCandidates.push(teacherId);
          uniquePairsMap.set(`${sessionId}__${teacherId}`, { sessionId, teacherId, sessionTitle });
        }
      }
    }

    const uniquePairs = Array.from(uniquePairsMap.values());
    const uniqueTeacherIds = Array.from(new Set(uniquePairs.map((p) => p.teacherId)));
    const existingSet = new Set();

    if (sessionIds.length > 0 && uniqueTeacherIds.length > 0) {
      const { data: existingLogs, error: e2 } = await supabase
        .from('session_count_logs')
        .select('session_id,teacher_id')
        .in('session_id', sessionIds)
        .in('teacher_id', uniqueTeacherIds);
      if (e2) throw e2;

      if (existingLogs) {
        for (const row of existingLogs) {
          if (!row?.session_id || !row?.teacher_id) continue;
          existingSet.add(`${row.session_id}__${row.teacher_id}`);
        }
      }
    }

    const stillMissing = uniquePairs.filter((p) => !existingSet.has(`${p.sessionId}__${p.teacherId}`));
    totalMissingAfterInsert += stillMissing.length;
    verifyConsidered += sessions.length;

    console.log(`[backfill][verify] page done offset=${offset} sessions=${sessions.length} stillMissingPairs=${stillMissing.length}`);
    offset += pageSize;
  }

  console.log(`[backfill] verify finished. verifyConsidered=${verifyConsidered}, stillMissingPairs=${totalMissingAfterInsert}`);
  if (totalMissingAfterInsert !== 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('[backfill] fatal', e);
  process.exitCode = 1;
});

