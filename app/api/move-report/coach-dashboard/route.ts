import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { P } from '@/app/move-report/data/profiles';
import { isValidCoachSlugFormat, normalizeCoachSlugInput } from '@/app/move-report/lib/coachSlug';
import { getLessonDesignHint } from '@/app/move-report/lib/coachDashboardHints';

type Row = {
  profile_key: string;
  profile_title: string;
  age_group: string;
  created_at: string;
  coach_slug?: string | null;
};

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function toCsv(rows: Row[], slug: string): string {
  const header = 'submitted_at,age_group,profile_key,profile_title,coach_slug';
  const lines = rows.map((r) => {
    const t = r.created_at?.replace(/,/g, ' ') ?? '';
    const coachCol = (r.coach_slug && String(r.coach_slug).trim()) || slug;
    return [
      escapeCsvCell(t),
      escapeCsvCell(r.age_group),
      escapeCsvCell(r.profile_key),
      escapeCsvCell(r.profile_title || ''),
      escapeCsvCell(coachCol),
    ].join(',');
  });
  return `\uFEFF${[header, ...lines].join('\n')}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const slug = normalizeCoachSlugInput(searchParams.get('slug') ?? '');
    if (!slug || !isValidCoachSlugFormat(slug)) {
      return NextResponse.json({ ok: false, error: '유효한 링크 주소가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: linkRow } = await supabase
      .from('move_report_coach_links')
      .select('org_name, slug, is_active, disabled_reason')
      .eq('slug', slug)
      .maybeSingle();

    if (!linkRow) {
      return NextResponse.json({ ok: false, error: '등록되지 않은 전용 링크예요.' }, { status: 404 });
    }
    if (linkRow.is_active === false) {
      return NextResponse.json(
        {
          ok: false,
          error: '비활성화된 링크예요. 기관에 문의하거나 새 링크를 발급받아 주세요.',
          inactive: true,
          disabledReason: linkRow.disabled_reason ?? null,
        },
        { status: 403 },
      );
    }

    const { data: rows, error } = await supabase
      .from('move_report_submissions')
      .select('profile_key, profile_title, age_group, created_at, coach_slug')
      .eq('coach_slug', slug)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('[move-report/coach-dashboard]', error);
      return NextResponse.json({ ok: false, error: '데이터를 불러오지 못했어요.' }, { status: 500 });
    }

    const list = (rows ?? []) as Row[];

    if (format === 'csv') {
      const csv = toCsv(list, slug);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="move-report-coach-${slug}.csv"`,
        },
      });
    }

    const byProfile: Record<string, { count: number; profileTitle: string }> = {};
    for (const r of list) {
      const k = r.profile_key;
      if (!byProfile[k]) byProfile[k] = { count: 0, profileTitle: r.profile_title || k };
      byProfile[k].count += 1;
    }

    const distribution: Record<string, number> = {};
    for (const k of Object.keys(P)) {
      distribution[k] = byProfile[k]?.count ?? 0;
    }

    const sorted = Object.entries(byProfile)
      .map(([key, v]) => ({ key, count: v.count, profileTitle: v.profileTitle }))
      .sort((a, b) => b.count - a.count);

    const topThree = sorted.slice(0, 3).map((s) => ({ key: s.key, count: s.count, profileTitle: s.profileTitle }));
    const hint = getLessonDesignHint(topThree.map((t) => t.key));

    return NextResponse.json({
      ok: true,
      slug,
      orgName: linkRow.org_name ?? null,
      total: list.length,
      distribution,
      byProfile: sorted,
      topThree,
      hint,
    });
  } catch (e) {
    console.error('[move-report/coach-dashboard] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
