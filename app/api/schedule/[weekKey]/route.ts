/**
 * 구독자용 주차별 스케줄·프로그램 조회 (읽기 전용)
 * GET /api/schedule/[weekKey] → { program_snapshot, challengePhases?, ... }
 * service_role 사용 시 RLS 없이 읽어 구독자(비로그인)도 저장된 챌린지 BPM 반영
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/app/lib/supabase/client';

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

  // 챌린지(Play) BGM: 관리자 선택 전역 경로 (구독자 재생 시 사용)
  const BGM_SETTINGS_ID = 'iiwarmup_challenge_bgm_settings';
  let challengeBgmPath: string | null = null;
  const { data: bgmSettings } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', BGM_SETTINGS_ID)
    .single();
  const bgmRaw = bgmSettings?.assets_json as { selectedBgm?: string } | null;
  if (typeof bgmRaw?.selectedBgm === 'string') challengeBgmPath = bgmRaw.selectedBgm;

  const { data: row, error: scheduleError } = await supabase
    .from('rotation_schedule')
    .select('week_key, program_id, program_snapshot, is_published')
    .eq('week_key', weekKey)
    .single();

  if (scheduleError && scheduleError.code !== 'PGRST116') {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({
      program_snapshot: null,
      phases: null,
      challengePhases: null,
      challengeBgmPath,
    }, { status: 200 });
  }

  const programId = row.program_id as string | null;
  let phases: unknown = null;

  if (programId) {
    const { data: program } = await supabase
      .from('warmup_programs_composite')
      .select('phases')
      .eq('id', programId)
      .single();
    if (program?.phases) phases = program.phases;
  }

  // 무빙 챌린지(Play)는 주차별로 항상 challenge_${weekKey} 프로그램 사용 → BPM/grid 여기서 조회
  const challengeId = `challenge_${weekKey}`;
  let challengePhases: unknown = null;
  const { data: challengeProgram } = await supabase
    .from('warmup_programs_composite')
    .select('phases')
    .eq('id', challengeId)
    .single();
  if (challengeProgram?.phases) challengePhases = challengeProgram.phases;

  return NextResponse.json({
    program_snapshot: row.program_snapshot ?? null,
    is_published: row.is_published ?? false,
    phases,
    challengePhases,
    challengeBgmPath,
  });
}
