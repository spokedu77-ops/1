/**
 * 구독자용 주차별 스케줄·프로그램 조회 (읽기 전용)
 * GET /api/schedule/[weekKey] → { program_snapshot, challengePhases?, thinkPackByMonthAndWeek?, ... }
 * service_role 사용 시 RLS 없이 읽어 구독자(비로그인)도 저장된 챌린지 BPM·Think 이미지 반영
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/app/lib/supabase/client';

const THINK_PACK_ID = 'iiwarmup_think_default';
const BUCKET_NAME = 'iiwarmup-files';

type Think150PackState = {
  setA: Record<string, string>;
  setB: Record<string, string>;
};

function storagePathToPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
}

const EMPTY_SET = { red: '', green: '', yellow: '', blue: '' };

function pathsToUrls(p: Think150PackState | null | undefined): Think150PackState {
  if (!p?.setA || !p?.setB) return { setA: { ...EMPTY_SET }, setB: { ...EMPTY_SET } };
  return {
    setA: {
      red: p.setA.red ? storagePathToPublicUrl(p.setA.red) : '',
      green: p.setA.green ? storagePathToPublicUrl(p.setA.green) : '',
      yellow: p.setA.yellow ? storagePathToPublicUrl(p.setA.yellow) : '',
      blue: p.setA.blue ? storagePathToPublicUrl(p.setA.blue) : '',
    },
    setB: {
      red: p.setB.red ? storagePathToPublicUrl(p.setB.red) : '',
      green: p.setB.green ? storagePathToPublicUrl(p.setB.green) : '',
      yellow: p.setB.yellow ? storagePathToPublicUrl(p.setB.yellow) : '',
      blue: p.setB.blue ? storagePathToPublicUrl(p.setB.blue) : '',
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ weekKey: string }> }
) {
  const { weekKey } = await params;
  if (!weekKey || typeof weekKey !== 'string') {
    return NextResponse.json({ error: 'weekKey required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    url && serviceKey
      ? createClient(url, serviceKey)
      : getSupabaseClient();

  const BGM_SETTINGS_ID = 'iiwarmup_challenge_bgm_settings';

  // 1차: BGM 설정, Think pack, rotation_schedule 동시 조회 (체감 속도 개선)
  const [bgmResult, thinkPackResult, scheduleResult] = await Promise.all([
    supabase.from('think_asset_packs').select('assets_json').eq('id', BGM_SETTINGS_ID).single(),
    supabase.from('think_asset_packs').select('assets_json').eq('id', THINK_PACK_ID).single(),
    supabase.from('rotation_schedule').select('week_key, program_id, program_snapshot, is_published').eq('week_key', weekKey).single(),
  ]);

  const bgmRaw = bgmResult.data?.assets_json as { selectedBgm?: string; bgmStartOffsetMs?: number } | null;
  const challengeBgmPath = typeof bgmRaw?.selectedBgm === 'string' ? bgmRaw.selectedBgm : null;
  const challengeBgmStartOffsetMs = typeof bgmRaw?.bgmStartOffsetMs === 'number' ? bgmRaw.bgmStartOffsetMs : 0;

  let thinkPackByMonthAndWeek: Record<number, Record<string, Think150PackState>> | null = null;
  const byMonth = (thinkPackResult.data?.assets_json as { byMonth?: Record<number, Record<string, Think150PackState>> } | null)?.byMonth;
  if (byMonth && typeof byMonth === 'object') {
    thinkPackByMonthAndWeek = {};
    for (let m = 1; m <= 12; m++) {
      const monthData = byMonth[m];
      if (!monthData?.week2 && !monthData?.week3 && !monthData?.week4) continue;
      thinkPackByMonthAndWeek[m] = {
        week2: pathsToUrls(monthData.week2),
        week3: pathsToUrls(monthData.week3),
        week4: pathsToUrls(monthData.week4),
      };
    }
  }

  const { data: row, error: scheduleError } = scheduleResult;
  if (scheduleError && scheduleError.code !== 'PGRST116') {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({
      program_snapshot: null,
      phases: null,
      challengePhases: null,
      challengeBgmPath,
      challengeBgmStartOffsetMs,
      thinkPackByMonthAndWeek: thinkPackByMonthAndWeek ?? null,
    }, { status: 200 });
  }

  const programId = row.program_id as string | null;
  const challengeId = `challenge_${weekKey}`;

  // 2차: program_id용 phases / challenge_${weekKey} phases 동시 조회
  const [programResult, challengeResult] = await Promise.all([
    programId ? supabase.from('warmup_programs_composite').select('phases').eq('id', programId).single() : Promise.resolve({ data: null }),
    supabase.from('warmup_programs_composite').select('phases').eq('id', challengeId).single(),
  ]);

  let phases: unknown = programResult.data?.phases ?? null;
  let challengePhases: unknown =
    programId?.startsWith('challenge_') && phases != null
      ? phases
      : (challengeResult.data?.phases ?? null);

  return NextResponse.json({
    program_snapshot: row.program_snapshot ?? null,
    is_published: row.is_published ?? false,
    phases,
    challengePhases,
    challengeBgmPath,
    challengeBgmStartOffsetMs,
    thinkPackByMonthAndWeek: thinkPackByMonthAndWeek ?? null,
  });
}
