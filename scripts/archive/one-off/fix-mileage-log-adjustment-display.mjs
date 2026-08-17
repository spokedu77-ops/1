#!/usr/bin/env node
/**
 * 수업 연동 마일리지 "차감 완화" 로그 보정
 *
 * 문제: -5000 → -2500 변경 시 amount가 +2500(포인트 diff)으로 저장되어 로그가 헷갈림
 * 조치: amount를 선택 차감 합(-2500)으로, reason의 원복 → 조정
 *       users.points는 변경하지 않음 (이미 diff로 정확히 반영됨)
 *
 * 사용:
 *   node scripts/fix-mileage-log-adjustment-display.mjs           # dry-run
 *   node scripts/fix-mileage-log-adjustment-display.mjs --apply   # DB 반영
 */

import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const MILEAGE_ACTIONS = [
  { label: '보고 지연', val: -2500 },
  { label: '피드백 누락', val: -2500 },
  { label: '수업 연기', val: 2500 },
  { label: '당일 연기', val: 5000 },
  { label: '수업 연기 요청', val: -5000 },
  { label: '수업 당일 연기', val: -15000 },
  { label: '주간 베스트 수업안', val: 4000 },
  { label: '주간 베스트 포토', val: 2000 },
  { label: '주간 베스트 피드백', val: 2000 },
];

const SESSION_MILEAGE_REASON_RE = /^\[수업연동(?:\/보조)?\]\s*(원복|차감|조정):\s*(.+)$/;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getMileageTotal(actionStr) {
  const list = actionStr ? actionStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return list.reduce((sum, label) => {
    const item = MILEAGE_ACTIONS.find((d) => d.label === label);
    return sum + (item?.val || 0);
  }, 0);
}

function parseSessionMileageReason(reason) {
  const match = reason?.match(SESSION_MILEAGE_REASON_RE);
  if (!match) return null;
  return {
    verb: match[1],
    actionStr: (match[2] ?? '').trim(),
    isAssist: reason.startsWith('[수업연동/보조]'),
  };
}

function buildFixedReason(isAssist, actionStr) {
  const base = isAssist ? '[수업연동/보조]' : '[수업연동]';
  return `${base} 조정: ${actionStr}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: logs, error } = await supabase
    .from('mileage_logs')
    .select('id, teacher_id, amount, reason, session_title, created_at')
    .or('reason.like.[수업연동]%,reason.like.[수업연동/보조]%')
    .gt('amount', 0)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const candidates = [];
  for (const log of logs || []) {
    const parsed = parseSessionMileageReason(log.reason);
    if (!parsed) continue;
    if (parsed.verb !== '원복') continue;
    if (!parsed.actionStr || parsed.actionStr === '해제') continue;
    const selectionTotal = getMileageTotal(parsed.actionStr);
    if (selectionTotal >= 0) continue;
    candidates.push({
      ...log,
      selectionTotal,
      newAmount: selectionTotal,
      newReason: buildFixedReason(parsed.isAssist, parsed.actionStr),
    });
  }

  console.log(`[fix-mileage-log] mode=${apply ? 'APPLY' : 'DRY-RUN'} candidates=${candidates.length}`);
  if (candidates.length === 0) {
    console.log('보정 대상 없음.');
    return;
  }

  for (const row of candidates) {
    console.log(
      `- ${row.id} | ${row.created_at?.slice(0, 10)} | amount ${row.amount} → ${row.newAmount} | ${row.reason} → ${row.newReason}`,
    );
  }

  if (!apply) {
    console.log('\n반영하려면: node scripts/fix-mileage-log-adjustment-display.mjs --apply');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const row of candidates) {
    const { error: uErr } = await supabase
      .from('mileage_logs')
      .update({ amount: row.newAmount, reason: row.newReason })
      .eq('id', row.id);
    if (uErr) {
      console.error(`FAIL ${row.id}:`, uErr.message);
      fail += 1;
    } else {
      ok += 1;
    }
  }

  console.log(`\n[fix-mileage-log] done ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error('[fix-mileage-log] fatal:', err.message || err);
  process.exit(1);
});
