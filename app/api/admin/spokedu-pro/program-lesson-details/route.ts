/**
 * SPOKEDU PRO 고도화 수업안 — 관리자 전용 CRUD.
 * curriculum / spokedu_pro_programs는 수정하지 않음.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  mapLessonDetailRowToClient,
  lessonDetailFullToDbRow,
  type ProgramLessonDetail,
  type ProgramLessonDetailRow,
} from '@/app/lib/spokedu-pro/programLessonDetail';

function parseJsonArray(input: unknown, fallback: unknown[]): unknown[] {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string' && input.trim()) {
    try {
      const v = JSON.parse(input) as unknown;
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function bodyToPartialLesson(input: Record<string, unknown>): Partial<ProgramLessonDetail> {
  const out: Partial<ProgramLessonDetail> = {};
  if (input.status === 'draft' || input.status === 'reviewed') out.status = input.status;
  if (typeof input.isFeaturedLesson === 'boolean') out.isFeaturedLesson = input.isFeaturedLesson;
  if (typeof input.summary === 'string' || input.summary === null) out.summary = (input.summary as string | null) ?? null;
  if (typeof input.recommendedAge === 'string' || input.recommendedAge === null) {
    out.recommendedAge = (input.recommendedAge as string | null) ?? null;
  }
  if (typeof input.recommendedPlayers === 'string' || input.recommendedPlayers === null) {
    out.recommendedPlayers = (input.recommendedPlayers as string | null) ?? null;
  }
  if (typeof input.duration === 'string' || input.duration === null) out.duration = (input.duration as string | null) ?? null;
  if (typeof input.space === 'string' || input.space === null) out.space = (input.space as string | null) ?? null;
  if (typeof input.objective === 'string' || input.objective === null) out.objective = (input.objective as string | null) ?? null;
  if (typeof input.developmentFocus === 'string' || input.developmentFocus === null) {
    out.developmentFocus = (input.developmentFocus as string | null) ?? null;
  }
  if (typeof input.coachScript === 'string' || input.coachScript === null) out.coachScript = (input.coachScript as string | null) ?? null;
  if (typeof input.parentNote === 'string' || input.parentNote === null) out.parentNote = (input.parentNote as string | null) ?? null;
  if ('steps' in input) out.steps = parseJsonArray(input.steps, []);
  if ('fieldTips' in input) out.fieldTips = parseJsonArray(input.fieldTips, []);
  if ('variations' in input) out.variations = parseJsonArray(input.variations, []);
  if ('safetyNotes' in input) out.safetyNotes = parseJsonArray(input.safetyNotes, []);
  if ('relatedProgramIds' in input) out.relatedProgramIds = parseJsonArray(input.relatedProgramIds, []);
  if ('relatedSpomoveIds' in input) out.relatedSpomoveIds = parseJsonArray(input.relatedSpomoveIds, []);
  if ('packageKeys' in input) out.packageKeys = parseJsonArray(input.packageKeys, []);
  return out;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const idsRaw = (searchParams.get('curriculumIds') ?? '').trim();
    const featuredOnly = searchParams.get('featured') === '1';
    const limitRaw = Number(searchParams.get('limit') ?? '50');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const supabase = getServiceSupabase();

    if (idsRaw) {
      const ids = idsRaw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, lessonDetails: [] });
      }
      const { data, error } = await supabase
        .from('spokedu_pro_program_lesson_details')
        .select('*')
        .in('curriculum_id', ids);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      const lessonDetails = ((data ?? []) as ProgramLessonDetailRow[]).map(mapLessonDetailRowToClient);
      return NextResponse.json({ ok: true, lessonDetails });
    }

    let q = supabase.from('spokedu_pro_program_lesson_details').select('*').order('updated_at', { ascending: false }).limit(limit);
    if (featuredOnly) {
      q = q.eq('is_featured_lesson', true);
    }
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const lessonDetails = ((data ?? []) as ProgramLessonDetailRow[]).map(mapLessonDetailRowToClient);
    return NextResponse.json({ ok: true, lessonDetails });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const cidRaw = body.curriculumId ?? body.curriculum_id;
    const curriculumId = typeof cidRaw === 'number' ? cidRaw : Number(String(cidRaw ?? '').trim());
    if (!Number.isFinite(curriculumId) || curriculumId <= 0) {
      return NextResponse.json({ ok: false, error: 'curriculum_id required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: existing, error: exErr } = await supabase
      .from('spokedu_pro_program_lesson_details')
      .select('*')
      .eq('curriculum_id', curriculumId)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    }

    const prev = existing ? mapLessonDetailRowToClient(existing as ProgramLessonDetailRow) : null;
    const partial = bodyToPartialLesson(body);
    const merged: ProgramLessonDetail = {
      curriculumId,
      status:
        partial.status === 'draft' || partial.status === 'reviewed'
          ? partial.status
          : prev?.status ?? 'draft',
      isFeaturedLesson: partial.isFeaturedLesson ?? prev?.isFeaturedLesson ?? false,
      summary: partial.summary !== undefined ? partial.summary : prev?.summary ?? null,
      recommendedAge: partial.recommendedAge !== undefined ? partial.recommendedAge : prev?.recommendedAge ?? null,
      recommendedPlayers:
        partial.recommendedPlayers !== undefined ? partial.recommendedPlayers : prev?.recommendedPlayers ?? null,
      duration: partial.duration !== undefined ? partial.duration : prev?.duration ?? null,
      space: partial.space !== undefined ? partial.space : prev?.space ?? null,
      objective: partial.objective !== undefined ? partial.objective : prev?.objective ?? null,
      developmentFocus:
        partial.developmentFocus !== undefined ? partial.developmentFocus : prev?.developmentFocus ?? null,
      coachScript: partial.coachScript !== undefined ? partial.coachScript : prev?.coachScript ?? null,
      parentNote: partial.parentNote !== undefined ? partial.parentNote : prev?.parentNote ?? null,
      steps: partial.steps !== undefined ? partial.steps : prev?.steps ?? [],
      fieldTips: partial.fieldTips !== undefined ? partial.fieldTips : prev?.fieldTips ?? [],
      variations: partial.variations !== undefined ? partial.variations : prev?.variations ?? [],
      safetyNotes: partial.safetyNotes !== undefined ? partial.safetyNotes : prev?.safetyNotes ?? [],
      relatedProgramIds:
        partial.relatedProgramIds !== undefined ? partial.relatedProgramIds : prev?.relatedProgramIds ?? [],
      relatedSpomoveIds:
        partial.relatedSpomoveIds !== undefined ? partial.relatedSpomoveIds : prev?.relatedSpomoveIds ?? [],
      packageKeys: partial.packageKeys !== undefined ? partial.packageKeys : prev?.packageKeys ?? [],
    };

    const insertPayload = lessonDetailFullToDbRow(merged);

    const { data: upserted, error: upErr } = await supabase
      .from('spokedu_pro_program_lesson_details')
      .upsert(insertPayload, { onConflict: 'curriculum_id' })
      .select('*')
      .single();

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const lessonDetail = mapLessonDetailRowToClient(upserted as ProgramLessonDetailRow);
    return NextResponse.json({ ok: true, lessonDetail });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
