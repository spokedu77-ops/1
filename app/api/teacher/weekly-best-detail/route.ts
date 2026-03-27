/**
 * Teacher 주간베스트 상세(지도안/피드백) 조회
 *
 * 문제: teacher 클라이언트에서 `lesson_plans`, `sessions`를 직접 조회하면
 * RLS에 의해 200 + empty(data null)로 내려와 "로딩 중"이 지속될 수 있음.
 * 해결: 서버에서 로그인만 확인하고, Service Role로 필요한 데이터만 조회해 반환.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export const runtime = 'nodejs';

type ReqBody = {
  lessonPlanSessionId?: string | null;
  feedbackSessionId?: string | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const lessonPlanSessionId = typeof body.lessonPlanSessionId === 'string' ? body.lessonPlanSessionId : null;
    const feedbackSessionId = typeof body.feedbackSessionId === 'string' ? body.feedbackSessionId : null;

    if (!lessonPlanSessionId && !feedbackSessionId) {
      return NextResponse.json({ lessonPlanContent: null, feedback: null }, { status: 200 });
    }

    const svc = getServiceSupabase();
    const [lpRes, fbRes] = await Promise.all([
      lessonPlanSessionId
        ? svc.from('lesson_plans').select('content').eq('session_id', lessonPlanSessionId).maybeSingle()
        : Promise.resolve({ data: null }),
      feedbackSessionId
        ? svc.from('sessions').select('feedback_fields, students_text').eq('id', feedbackSessionId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json(
      {
        lessonPlanContent: (lpRes as any)?.data?.content ?? null,
        feedback: (fbRes as any)?.data ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    devLogger.error('[teacher/weekly-best-detail]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

