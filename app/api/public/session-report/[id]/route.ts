/**
 * 학부모 공개 리포트용 세션 조회 (비로그인)
 * - 브라우저 anon + RLS에 의존하지 않고 service role로 안전한 필드만 반환
 * - 학부모 링크(/report/[id])가 모바일 인앱 브라우저 등에서도 동일하게 동작하도록 함
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 선생님 작성 완료 이후 또는 검수 완료 — 학부모에게 링크 공유 가능한 상태 */
const PUBLIC_REPORT_STATUSES = ['finished', 'verified'] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const svc = getServiceSupabase();
    const { data: row, error } = await svc
      .from('sessions')
      .select('id, start_at, status, students_text, feedback_fields, photo_url, created_by')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      devLogger.error('[public/session-report]', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const status = String((row as { status?: string }).status ?? '');
    if (!PUBLIC_REPORT_STATUSES.includes(status as (typeof PUBLIC_REPORT_STATUSES)[number])) {
      return NextResponse.json({ error: 'not_available' }, { status: 404 });
    }

    const createdBy = (row as { created_by?: string | null }).created_by;
    let coachName = '';
    if (createdBy) {
      const { data: u } = await svc.from('users').select('name').eq('id', createdBy).maybeSingle();
      coachName = String((u as { name?: string } | null)?.name ?? '').trim();
    }

    const session = {
      start_at: (row as { start_at: string }).start_at,
      students_text: (row as { students_text?: string | null }).students_text ?? '',
      feedback_fields: (row as { feedback_fields?: unknown }).feedback_fields ?? null,
      photo_url: (row as { photo_url?: unknown }).photo_url,
      users: coachName ? { name: coachName } : null,
    };

    return NextResponse.json({ session }, { status: 200 });
  } catch (err) {
    devLogger.error('[public/session-report]', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
