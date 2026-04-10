import { NextResponse } from 'next/server';
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
};

function toMultiline(value: string[] | null): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const lines = value.map((v) => String(v ?? '').trim()).filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : null;
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();

  const { data: curriculumRows, error: curriculumError } = await supabase
    .from('curriculum')
    .select('id,title,url,check_list,equipment,steps,expert_tip,month,week')
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
    .select('id,title,video_url');

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existing = (existingRows ?? []) as Array<{ id: number; title: string | null; video_url: string | null }>;
  const existingMap = new Map<string, { id: number }>();
  for (const row of existing) {
    const key = `${(row.title ?? '').trim()}|${(row.video_url ?? '').trim()}`;
    if (!existingMap.has(key)) existingMap.set(key, { id: row.id });
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ curriculumId: number; message: string }> = [];

  for (const row of source) {
    const title = (row.title ?? '').trim();
    const videoUrl = (row.url ?? '').trim();
    if (!title) {
      skipped += 1;
      continue;
    }

    const key = `${title}|${videoUrl}`;
    const payload = {
      title: row.month && row.week ? `[${row.month}월 ${row.week}주] ${title}` : title,
      video_url: videoUrl || null,
      // 센터 커리큘럼 기본 매핑(펑셔널 무브 기준)
      function_type: '협응력',
      main_theme: '협동형',
      group_size: '소그룹',
      checklist: toMultiline(row.check_list),
      equipment: toMultiline(row.equipment),
      activity_method: toMultiline(row.steps),
      activity_tip: row.expert_tip?.trim() || null,
      is_published: true,
    };

    const match = existingMap.get(key);
    if (match) {
      const { error } = await supabase.from('spokedu_pro_programs').update(payload).eq('id', match.id);
      if (error) errors.push({ curriculumId: row.id, message: error.message });
      else updated += 1;
    } else {
      const { error } = await supabase.from('spokedu_pro_programs').insert(payload);
      if (error) errors.push({ curriculumId: row.id, message: error.message });
      else inserted += 1;
    }
  }

  return NextResponse.json({
    total: source.length,
    inserted,
    updated,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 30),
  });
}

