import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type DbRow = {
  year: number;
  month: number;
  note: string;
  updated_at: string;
};

function parseYearMonth(searchParams: URLSearchParams) {
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const ym = parseYearMonth(new URL(request.url).searchParams);
    if (!ym) {
      return NextResponse.json({ error: 'year, month가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('center_tbd_month_notes')
      .select('year, month, note, updated_at')
      .eq('year', ym.year)
      .eq('month', ym.month)
      .maybeSingle();

    if (error) {
      devLogger.error('[center-tbd-schedule/note] GET error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as DbRow | null;
    return NextResponse.json({
      note: row?.note ?? '',
      updatedAt: row?.updated_at ?? null,
    });
  } catch (err) {
    devLogger.error('[center-tbd-schedule/note] GET exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { year?: number; month?: number; note?: string };
    const year = Number(body.year);
    const month = Number(body.month);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'year가 올바르지 않습니다.' }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'month가 올바르지 않습니다.' }, { status: 400 });
    }
    const note = typeof body.note === 'string' ? body.note : '';

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('center_tbd_month_notes')
      .upsert(
        {
          year,
          month,
          note,
          updated_at: new Date().toISOString(),
          updated_by: auth.userId,
        },
        { onConflict: 'year,month' }
      )
      .select('year, month, note, updated_at')
      .single();

    if (error) {
      devLogger.error('[center-tbd-schedule/note] PUT error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as DbRow;
    return NextResponse.json({ note: row.note, updatedAt: row.updated_at });
  } catch (err) {
    devLogger.error('[center-tbd-schedule/note] PUT exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
