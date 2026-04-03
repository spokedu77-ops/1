/**
 * 선생님 세션 피드백 저장 — 서버에서 담당 여부 검증 후 Service Role로 갱신(RLS 이슈 방지)
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';
import {
  type FeedbackFields,
  fieldsToTemplateText,
} from '@/app/lib/feedbackValidation';

type Body = {
  sessionId?: unknown;
  feedbackFields?: FeedbackFields;
  photoUrls?: unknown;
  fileUrls?: unknown;
};

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const feedbackFields = (body.feedbackFields && typeof body.feedbackFields === 'object'
      ? body.feedbackFields
      : {}) as FeedbackFields;
    const photoUrls = Array.isArray(body.photoUrls) ? (body.photoUrls as string[]) : [];
    const fileUrls = Array.isArray(body.fileUrls) ? (body.fileUrls as string[]) : [];

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId이 필요합니다.' }, { status: 400 });
    }

    const svc = getServiceSupabase();
    const { data: row, error: fetchErr } = await svc
      .from('sessions')
      .select('id, created_by, start_at, session_type, title, memo, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (fetchErr) {
      devLogger.error('[teacher/session-feedback] fetch', fetchErr);
      return NextResponse.json({ error: '세션을 불러오지 못했습니다.' }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (String(row.created_by || '') !== String(user.id)) {
      return NextResponse.json({ error: '이 수업을 수정할 권한이 없습니다.' }, { status: 403 });
    }

    const sessionStart = new Date(String(row.start_at));
    const today = new Date();
    sessionStart.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (sessionStart > today) {
      return NextResponse.json(
        { error: '수업일이 아직 지나지 않았습니다. 수업일 이후에 완료 처리해 주세요.' },
        { status: 400 }
      );
    }

    const sessionType = String(row.session_type || '');
    const isCenterType =
      sessionType === 'regular_center' || sessionType === 'one_day_center';

    if (isCenterType) {
      if (fileUrls.length === 0) {
        return NextResponse.json({ error: '파일을 최소 1개 업로드해주세요.' }, { status: 400 });
      }
    } else {
      const requiredFields = [
        'main_activity',
        'strengths',
        'improvements',
        'next_goals',
        'condition_notes',
      ] as const;
      const fieldNames: Record<string, string> = {
        main_activity: '오늘 수업의 주요 활동',
        strengths: '강점 및 긍정적인 부분',
        improvements: '개선이 필요한 부분 및 피드백',
        next_goals: '다음 수업 목표 및 계획',
        condition_notes: '특이사항 및 시작/종료 시간',
      };
      const missingFields = requiredFields.filter(
        (field) =>
          !feedbackFields[field as keyof FeedbackFields] ||
          String(feedbackFields[field as keyof FeedbackFields]).trim().length < 5
      );
      if (missingFields.length > 0) {
        const msg = missingFields.map((f) => fieldNames[f]).join(', ');
        return NextResponse.json({ error: `다음 필드를 작성해주세요: ${msg}` }, { status: 400 });
      }
    }

    const { data: updated, error: upErr } = await svc
      .from('sessions')
      .update({
        status: 'finished',
        feedback_fields: feedbackFields,
        students_text: fieldsToTemplateText(feedbackFields),
        photo_url: photoUrls,
        file_url: fileUrls,
      })
      .eq('id', sessionId)
      .eq('created_by', user.id)
      .select('id');

    if (upErr) {
      devLogger.error('[teacher/session-feedback] update', upErr);
      return NextResponse.json({ error: upErr.message || '저장에 실패했습니다.' }, { status: 500 });
    }
    if (!updated?.length) {
      return NextResponse.json({ error: '저장이 반영되지 않았습니다.' }, { status: 500 });
    }

    const teacherId = row.created_by;
    const sessionTitle = row.title ?? null;
    const memo = typeof row.memo === 'string' ? row.memo : '';

    if (teacherId && String(teacherId).trim()) {
      const { error: logErr } = await svc.from('session_count_logs').insert({
        teacher_id: teacherId,
        session_id: sessionId,
        session_title: sessionTitle,
        count_change: 1,
        reason: '수업 완료',
      });
      if (logErr && logErr.code !== '23505' && logErr.code !== '23503') {
        devLogger.error('[teacher/session-feedback] session_count_logs', logErr);
      }
    }

    if (memo.includes('EXTRA_TEACHERS:')) {
      const { extraTeachers } = parseExtraTeachers(memo);
      for (const ex of extraTeachers) {
        if (!ex.id) continue;
        const { error: exLog } = await svc.from('session_count_logs').insert({
          teacher_id: ex.id,
          session_id: sessionId,
          session_title: sessionTitle,
          count_change: 1,
          reason: '수업 완료 (보조)',
        });
        if (exLog && exLog.code !== '23505' && exLog.code !== '23503') {
          devLogger.error('[teacher/session-feedback] session_count_logs extra', exLog);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[teacher/session-feedback]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
