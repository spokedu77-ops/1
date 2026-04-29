/**
 * 센터 curriculum → spokedu_pro_programs 동기화.
 * - UPDATE: URL·체크리스트·교구·활동 단계·팁 + curriculum 행 연결만 반영 (제목·분류 등 Pro 독립 필드는 덮어쓰지 않음)
 * - INSERT: 신규 행은 제목·본문·기본 분류·발행까지 한 번에 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type CurriculumRow = {
  id: number;
  title: string | null;
  url: string | null;
  check_list: string[] | null;
  equipment: string[] | null;
  steps: string[] | null;
  expert_tip: string | null;
  month: number | null;
  week: number | null;
  /** true면 센터 UI의 SUB 탭 전용 — Pro 프로그램 뱅크에 넣지 않음 */
  is_sub?: boolean | null;
};

function toMultiline(value: string[] | null): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const lines = value.map((v) => String(v ?? '').trim()).filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : null;
}

/** 기존 Pro 행 UPDATE 전용 — 커리큘럼에서 동기화하는 본문 5종 + 행 연결 */
function buildCurriculumSyncBody(row: CurriculumRow, videoUrl: string) {
  return {
    video_url: videoUrl || null,
    checklist: toMultiline(row.check_list),
    equipment: toMultiline(row.equipment),
    activity_method: toMultiline(row.steps),
    activity_tip: row.expert_tip?.trim() || null,
    source_center_curriculum_id: row.id,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const hardDelete = searchParams.get('hardDelete') === '1';

  const { data: curriculumRows, error: curriculumError } = await supabase
    .from('curriculum')
    .select('id,title,url,check_list,equipment,steps,expert_tip,month,week,is_sub')
    .order('month', { ascending: true })
    .order('week', { ascending: true })
    .order('id', { ascending: true });

  if (curriculumError) {
    return NextResponse.json({ error: curriculumError.message }, { status: 500 });
  }

  const source = (curriculumRows ?? []) as CurriculumRow[];
  if (source.length === 0) {
    return NextResponse.json({ total: 0, inserted: 0, updated: 0, skipped: 0, message: '가져올 센터 커리큘럼이 없습니다.' });
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('spokedu_pro_programs')
    .select('id,title,video_url,is_published,source_center_curriculum_id');

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existing = (existingRows ?? []) as Array<{
    id: number;
    title: string | null;
    video_url: string | null;
    is_published?: boolean | null;
    source_center_curriculum_id?: number | null;
  }>;
  /** 커리큘럼 행 id → Pro 행 id (URL·제목이 바뀌어도 동일 프로그램으로 업데이트되게) */
  const byCenterCurriculumId = new Map<number, number>();
  const byTitleAndUrl = new Map<string, { id: number }>();
  const byVideoUrl = new Map<string, number[]>();
  for (const row of existing) {
    const cid = Number(row.source_center_curriculum_id);
    if (Number.isFinite(cid) && cid > 0 && !byCenterCurriculumId.has(cid)) {
      byCenterCurriculumId.set(cid, row.id);
    }
    const t = (row.title ?? '').trim();
    const v = (row.video_url ?? '').trim();
    const key = `${t}|${v}`;
    if (!byTitleAndUrl.has(key)) byTitleAndUrl.set(key, { id: row.id });
    if (v) {
      const list = byVideoUrl.get(v) ?? [];
      list.push(row.id);
      byVideoUrl.set(v, list);
    }
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ curriculumId: number; message: string }> = [];
  const keptIdByVideoUrl = new Map<string, number>();

  for (const row of source) {
    const title = (row.title ?? '').trim();
    const videoUrl = (row.url ?? '').trim();
    if (!title) {
      skipped += 1;
      continue;
    }

    // SUB 탭 전용 커리큘럼: Pro 뱅크에 넣지 않음. 과거 동기화로 들어간 동일 제목·URL 행은 비공개(+가능하면 SUB 플래그).
    if (row.is_sub === true) {
      const patchFull = { is_published: false, center_curriculum_is_sub: true };
      const patchMin = { is_published: false };
      const tryHide = async (patch: typeof patchFull | typeof patchMin) => {
        if (videoUrl) {
          return supabase.from('spokedu_pro_programs').update(patch).eq('title', title).eq('video_url', videoUrl);
        }
        const r0 = await supabase.from('spokedu_pro_programs').update(patch).eq('title', title).is('video_url', null);
        if (r0.error) return r0;
        return supabase.from('spokedu_pro_programs').update(patch).eq('title', title).eq('video_url', '');
      };
      let { error: hideErr } = await tryHide(patchFull);
      if (hideErr && /center_curriculum_is_sub|column/i.test(String(hideErr.message))) {
        ({ error: hideErr } = await tryHide(patchMin));
      }
      if (hideErr) errors.push({ curriculumId: row.id, message: hideErr.message });
      skipped += 1;
      continue;
    }

    const key = `${title}|${videoUrl}`;
    const updatePayload = buildCurriculumSyncBody(row, videoUrl);
    const insertPayload = {
      title,
      video_url: videoUrl || null,
      function_type: '협응력',
      main_theme: '협동형',
      group_size: '소그룹',
      checklist: updatePayload.checklist,
      equipment: updatePayload.equipment,
      activity_method: updatePayload.activity_method,
      activity_tip: updatePayload.activity_tip,
      is_published: true,
      source_center_curriculum_id: row.id,
    };

    // 매칭 우선순위:
    // 1) source_center_curriculum_id = curriculum.id — URL을 인스타→유튜브로 바꿔도 동일 Pro 행을 갱신
    // 2) video_url 동일(같은 영상 공유)
    // 3) title|video_url 키(레거시·최초 동기화 전 행)
    // 4) 제목이 Pro에서 딱 1건이고, 다른 커리큘럼에 이미 연결되지 않았으면 URL 교체·구마이그레이션 행으로 간주
    const matchByCurriculumId = byCenterCurriculumId.get(row.id) ?? null;
    const matchByUrl = videoUrl ? (byVideoUrl.get(videoUrl)?.[0] ?? null) : null;
    const matchByKey = byTitleAndUrl.get(key)?.id ?? null;
    let matchByLoneTitle: number | null = null;
    if (matchByCurriculumId == null && matchByUrl == null && matchByKey == null) {
      const hits = existing.filter((e) => (e.title ?? '').trim() === title);
      if (hits.length === 1) {
        const sid = hits[0].source_center_curriculum_id;
        if (sid == null || sid === row.id) {
          matchByLoneTitle = hits[0].id;
        }
      }
    }
    const matchId = matchByCurriculumId ?? matchByUrl ?? matchByKey ?? matchByLoneTitle;
    if (matchId) {
      let { error } = await supabase.from('spokedu_pro_programs').update(updatePayload).eq('id', matchId);
      if (error && /source_center_curriculum_id|42703|column/i.test(String(error.message))) {
        const { source_center_curriculum_id: _s, ...rest } = updatePayload;
        ({ error } = await supabase.from('spokedu_pro_programs').update(rest).eq('id', matchId));
      }
      if (error) errors.push({ curriculumId: row.id, message: error.message });
      else updated += 1;
      if (videoUrl) keptIdByVideoUrl.set(videoUrl, matchId);
    } else {
      let { data: ins, error } = await supabase.from('spokedu_pro_programs').insert(insertPayload).select('id,video_url').single();
      if (error && /source_center_curriculum_id|42703|column/i.test(String(error.message))) {
        const { source_center_curriculum_id: _s, ...rest } = insertPayload;
        ({ data: ins, error } = await supabase.from('spokedu_pro_programs').insert(rest).select('id,video_url').single());
      }
      if (error) {
        errors.push({ curriculumId: row.id, message: error.message });
      } else {
        inserted += 1;
        const v = (ins?.video_url ?? '').trim();
        if (v && ins) {
          keptIdByVideoUrl.set(v, ins.id as number);
          const list = byVideoUrl.get(v) ?? [];
          list.push(ins.id as number);
          byVideoUrl.set(v, list);
        }
      }
    }
  }

  // 같은 video_url을 여러 row가 공유하면, import에서 선택된(kept) row만 남기고 나머지는 비공개 처리(기본).
  // hardDelete=1이면 비공개 처리 대신 물리 삭제하여 찌꺼기(잔상) 자체를 제거한다.
  for (const [v, ids] of byVideoUrl) {
    if (!v) continue;
    if (ids.length <= 1) continue;
    const keep = keptIdByVideoUrl.get(v);
    if (!keep) continue;
    const others = ids.filter((id) => id !== keep);
    if (others.length === 0) continue;
    const { error } = hardDelete
      ? await supabase.from('spokedu_pro_programs').delete().in('id', others)
      : await supabase.from('spokedu_pro_programs').update({ is_published: false }).in('id', others);
    if (error) {
      errors.push({ curriculumId: -1, message: `dedupe(${v}) ${error.message}` });
    }
  }

  // SUB로 옮긴 curriculum 행을 가리키는 Pro 프로그램은 비공개(드래그로 SUB 전환 후에도 낚시 등이 남는 문제 방지)
  const subCurriculumIds = source.filter((r) => r.is_sub === true).map((r) => r.id);
  if (subCurriculumIds.length > 0) {
    const patchSub = { is_published: false, center_curriculum_is_sub: true };
    const { error: subLinkErr } = await supabase
      .from('spokedu_pro_programs')
      .update(patchSub)
      .in('source_center_curriculum_id', subCurriculumIds);
    if (subLinkErr && /source_center_curriculum_id|center_curriculum_is_sub|42703|column/i.test(String(subLinkErr.message))) {
      await supabase.from('spokedu_pro_programs').update({ is_published: false }).in('source_center_curriculum_id', subCurriculumIds);
    } else if (subLinkErr) {
      errors.push({ curriculumId: -1, message: `sub_curriculum_link: ${subLinkErr.message}` });
    }
  }

  return NextResponse.json({
    total: source.length,
    inserted,
    updated,
    skipped,
    dedupe_mode: hardDelete ? 'hard_delete' : 'unpublish',
    failed: errors.length,
    errors: errors.slice(0, 30),
  });
}

