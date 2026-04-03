import { toast } from 'sonner';

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    if (typeof e.message === 'string' && e.message.trim()) return e.message;

    const parts: string[] = [];
    if (typeof e.code === 'string' && e.code.trim()) parts.push(`[${e.code}]`);
    if (typeof e.details === 'string' && e.details.trim()) parts.push(e.details);
    if (typeof e.hint === 'string' && e.hint.trim()) parts.push(`hint: ${e.hint}`);
    if (parts.length > 0) return parts.join(' ');

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

// 그룹 수업 회차 확장 유틸
export async function extendClass(
  supabase: any,
  groupId: string,
  addCount: number,
  options?: { onAfter?: () => void }
) {
  if (!groupId || addCount <= 0) return;

  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', groupId)
      .order('start_at', { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      toast.error('해당 그룹의 세션이 없습니다.');
      return;
    }

    const activeSessions = (sessions as any[]).filter(
      (s) => !['postponed', 'cancelled', 'deleted'].includes(String(s.status ?? ''))
    );
    if (activeSessions.length === 0) {
      toast.error('활성 회차를 찾지 못했습니다.');
      return;
    }

    const last = activeSessions[activeSessions.length - 1];

    const lastStart = new Date(last.start_at);
    const first = activeSessions[0];
    const second = activeSessions[1];

    // 간격 추론: 동일 요일 패턴이라고 가정하고 평균 간격 사용 (기본 7일)
    let dayInterval = 7;
    if (second) {
      const firstStart = new Date(first.start_at).getTime();
      const secondStart = new Date(second.start_at).getTime();
      const diffDays = Math.round((secondStart - firstStart) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) dayInterval = diffDays;
    }

    const newTotal = activeSessions.length + addCount;
    const baseDuration =
      (new Date(last.end_at).getTime() - new Date(last.start_at).getTime()) / (1000 * 60);

    const newSessions = [];
    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      start_at: _startAt,
      end_at: _endAt,
      status: _status,
      round_index: _roundIndex,
      round_total: _roundTotal,
      round_display: _roundDisplay,
      ...insertBase
    } = last;
    void _id;
    void _createdAt;
    void _updatedAt;
    void _startAt;
    void _endAt;
    void _status;
    void _roundIndex;
    void _roundTotal;
    void _roundDisplay;

    for (let i = 1; i <= addCount; i++) {
      const start = new Date(lastStart);
      start.setDate(start.getDate() + dayInterval * i);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + baseDuration);

      const roundIndex = (last.round_index ?? activeSessions.length) + i;
      const roundDisplay = `${roundIndex}/${newTotal}`;

      newSessions.push({
        ...insertBase,
        // 다음 회차(opened) 생성 시 이전 회차의 피드백이 그대로 이어붙지 않도록 초기화합니다.
        // (students_text / feedback_fields / 첨부파일이 복사되면 teacher 화면에서 "계속 복사된 것처럼" 보입니다.)
        students_text: null,
        feedback_fields: {},
        photo_url: [],
        file_url: [],
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: 'opened',
        round_index: roundIndex,
        round_total: newTotal,
        round_display: roundDisplay,
      });
    }

    // 기존 세션 round_total / round_display 업데이트
    await Promise.all(
      activeSessions.map((s: any) =>
        supabase
          .from('sessions')
          .update({
            round_total: newTotal,
            round_display: `${s.round_index ?? 1}/${newTotal}`,
          })
          .eq('id', s.id)
      )
    );

    const { error: insertError } = await supabase.from('sessions').insert(newSessions);
    if (insertError) throw insertError;

    toast.success('회차가 성공적으로 확장되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    toast.error('회차 확장에 실패했습니다: ' + formatErrorMessage(error));
  }
}
