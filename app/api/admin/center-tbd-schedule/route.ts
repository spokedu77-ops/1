import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { CenterTbdClass, CenterTbdRound } from '@/app/admin/centers/lib/localTbdStorage';
import {
  normalizeCenterTbdClass,
  normalizeLegacyLocalClass,
} from '@/app/admin/centers/lib/localTbdStorage';

type DbRow = {
  id: string;
  title: string;
  main_teacher_id: string | null;
  extra_teacher_id: string | null;
  main_teacher_name: string;
  extra_teacher_name: string;
  round_total: number;
  rounds: unknown;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

const SELECT_FIELDS =
  'id, title, main_teacher_id, extra_teacher_id, main_teacher_name, extra_teacher_name, round_total, rounds, created_at, updated_at, updated_by';

function rowToClass(row: DbRow): CenterTbdClass {
  const rounds = Array.isArray(row.rounds) ? (row.rounds as CenterTbdRound[]) : [];
  return normalizeCenterTbdClass({
    id: row.id,
    title: row.title ?? '',
    mainTeacherId: row.main_teacher_id,
    extraTeacherId: row.extra_teacher_id,
    mainTeacherName: row.main_teacher_name ?? '',
    extraTeacherName: row.extra_teacher_name ?? '',
    roundTotal: row.round_total ?? 1,
    rounds,
  });
}

function classToRow(cls: CenterTbdClass, updatedBy: string) {
  const normalized = normalizeCenterTbdClass(cls);
  return {
    id: normalized.id,
    title: normalized.title,
    main_teacher_id: normalized.mainTeacherId,
    extra_teacher_id: normalized.extraTeacherId,
    main_teacher_name: normalized.mainTeacherName,
    extra_teacher_name: normalized.extraTeacherName,
    round_total: normalized.roundTotal,
    rounds: normalized.rounds,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
}

async function loadTeacherNameMap(supabase: ReturnType<typeof getServiceSupabase>) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .in('role', ['teacher', 'admin']);

  if (error) throw new Error(error.message);

  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const row of data ?? []) {
    if (!row.id) continue;
    const name = String(row.name ?? '').trim();
    byId.set(row.id, name);
    if (name && !byName.has(name)) byName.set(name, row.id);
  }
  return { byId, byName };
}

function resolveTeacherIds(
  cls: CenterTbdClass,
  byId: Map<string, string>,
  byName: Map<string, string>
): CenterTbdClass {
  let mainTeacherId = cls.mainTeacherId;
  let extraTeacherId = cls.extraTeacherId;
  let mainTeacherName = cls.mainTeacherName.trim();
  let extraTeacherName = cls.extraTeacherName.trim();

  if (mainTeacherId && byId.has(mainTeacherId)) {
    mainTeacherName = byId.get(mainTeacherId) ?? mainTeacherName;
  } else if (!mainTeacherId && mainTeacherName && byName.has(mainTeacherName)) {
    mainTeacherId = byName.get(mainTeacherName) ?? null;
  } else if (mainTeacherId && !mainTeacherName) {
    mainTeacherName = byId.get(mainTeacherId) ?? '';
  }

  if (extraTeacherId && byId.has(extraTeacherId)) {
    extraTeacherName = byId.get(extraTeacherId) ?? extraTeacherName;
  } else if (!extraTeacherId && extraTeacherName && byName.has(extraTeacherName)) {
    extraTeacherId = byName.get(extraTeacherName) ?? null;
  } else if (extraTeacherId && !extraTeacherName) {
    extraTeacherName = byId.get(extraTeacherId) ?? '';
  }

  return normalizeCenterTbdClass({
    ...cls,
    mainTeacherId,
    extraTeacherId,
    mainTeacherName,
    extraTeacherName,
  });
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('center_tbd_classes')
      .select(SELECT_FIELDS)
      .order('updated_at', { ascending: false });

    if (error) {
      devLogger.error('[center-tbd-schedule] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const classes = (data ?? []).map((row) => rowToClass(row as DbRow));
    return NextResponse.json({ classes });
  } catch (err) {
    devLogger.error('[center-tbd-schedule] GET exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { class?: CenterTbdClass };
    if (!body.class || typeof body.class !== 'object') {
      return NextResponse.json({ error: 'class 필드가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { byId, byName } = await loadTeacherNameMap(supabase);
    const resolved = resolveTeacherIds(body.class, byId, byName);
    const row = classToRow(resolved, auth.userId);

    const { data, error } = await supabase
      .from('center_tbd_classes')
      .upsert(row, { onConflict: 'id' })
      .select(SELECT_FIELDS)
      .single();

    if (error) {
      devLogger.error('[center-tbd-schedule] PUT error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ class: rowToClass(data as DbRow) });
  } catch (err) {
    devLogger.error('[center-tbd-schedule] PUT exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('center_tbd_classes').delete().eq('id', id);

    if (error) {
      devLogger.error('[center-tbd-schedule] DELETE error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[center-tbd-schedule] DELETE exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { action?: string; classes?: unknown[] };
    if (body.action !== 'import' || !Array.isArray(body.classes)) {
      return NextResponse.json({ error: 'action: import 와 classes 배열이 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { count, error: countError } = await supabase
      .from('center_tbd_classes')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      devLogger.error('[center-tbd-schedule] POST count error', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: '서버에 이미 데이터가 있습니다. import는 빈 서버에서만 가능합니다.' },
        { status: 409 }
      );
    }

    const { byId, byName } = await loadTeacherNameMap(supabase);
    const normalized = body.classes
      .map((item) => normalizeLegacyLocalClass(item))
      .filter(Boolean) as CenterTbdClass[];

    if (normalized.length === 0) {
      return NextResponse.json({ error: '가져올 유효한 수업이 없습니다.' }, { status: 400 });
    }

    const rows = normalized.map((cls) => {
      const resolved = resolveTeacherIds(cls, byId, byName);
      return classToRow(resolved, auth.userId);
    });

    const { data, error } = await supabase
      .from('center_tbd_classes')
      .insert(rows)
      .select(SELECT_FIELDS);

    if (error) {
      devLogger.error('[center-tbd-schedule] POST import error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const classes = (data ?? []).map((row) => rowToClass(row as DbRow));
    return NextResponse.json({ classes });
  } catch (err) {
    devLogger.error('[center-tbd-schedule] POST exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
