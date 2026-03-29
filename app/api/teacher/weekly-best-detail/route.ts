/**
 * Teacher 주간베스트 상세(지도안/피드백) 조회
 *
 * RLS로 클라이언트 직접 조회 시 빈 데이터 → 무한 로딩 이슈가 있어 Service Role로 조회.
 * 보안: 세션 ID는 요청 본문이 아니라 weekly_best 행에서만 읽어, 임의 UUID 열람(IDOR) 방지.
 * 모든 로그인 teacher는 동일 weekly_best 글의 연결 콘텐츠를 볼 수 있음.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export const runtime = 'nodejs';

type ReqBody = {
  weeklyBestId?: string | null;
};

type FeedbackRow = {
  feedback_fields: Record<string, unknown> | null;
  students_text: string | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const weeklyBestId =
      typeof body.weeklyBestId === 'string' ? body.weeklyBestId.trim() : '';

    if (!weeklyBestId) {
      return NextResponse.json({ error: 'weeklyBestId가 필요합니다.' }, { status: 400 });
    }

    const svc = getServiceSupabase();
    const { data: wb, error: wbErr } = await svc
      .from('weekly_best')
      .select('lesson_plan_session_id, feedback_session_id')
      .eq('id', weeklyBestId)
      .maybeSingle();

    if (wbErr) {
      devLogger.error('[teacher/weekly-best-detail] weekly_best', wbErr);
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 });
    }
    if (!wb) {
      return NextResponse.json({ error: '주간베스트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const lessonPlanSessionId = wb.lesson_plan_session_id as string | null;
    const feedbackSessionId = wb.feedback_session_id as string | null;

    if (!lessonPlanSessionId && !feedbackSessionId) {
      return NextResponse.json({ lessonPlanContent: null, feedback: null }, { status: 200 });
    }

    const [lpRes, fbRes] = await Promise.all([
      lessonPlanSessionId
        ? svc.from('lesson_plans').select('content').eq('session_id', lessonPlanSessionId).maybeSingle()
        : Promise.resolve({ data: null, error: null as { message: string } | null }),
      feedbackSessionId
        ? svc
            .from('sessions')
            .select('feedback_fields, students_text')
            .eq('id', feedbackSessionId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null as { message: string } | null }),
    ]);

    if ('error' in lpRes && lpRes.error) {
      devLogger.error('[teacher/weekly-best-detail] lesson_plans', lpRes.error);
    }
    if ('error' in fbRes && fbRes.error) {
      devLogger.error('[teacher/weekly-best-detail] sessions', fbRes.error);
    }

    const lpData = lpRes && 'data' in lpRes ? lpRes.data : null;
    const fbData = fbRes && 'data' in fbRes ? (fbRes.data as FeedbackRow | null) : null;

    return NextResponse.json(
      {
        lessonPlanContent: lpData && typeof lpData === 'object' && 'content' in lpData
          ? (lpData as { content: string | null }).content ?? null
          : null,
        feedback: fbData ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    devLogger.error('[teacher/weekly-best-detail]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
