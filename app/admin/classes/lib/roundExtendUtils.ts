import { toast } from 'sonner';

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

    const last = sessions[sessions.length - 1];
    const lastStart = new Date(last.start_at);
    const first = sessions[0];
    const second = sessions[1];

    // 간격 추론: 동일 요일 패턴이라고 가정하고 평균 간격 사용 (기본 7일)
    let dayInterval = 7;
    if (second) {
      const firstStart = new Date(first.start_at).getTime();
      const secondStart = new Date(second.start_at).getTime();
      const diffDays = Math.round((secondStart - firstStart) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) dayInterval = diffDays;
    }

    const newTotal = sessions.length + addCount;
    const baseDuration =
      (new Date(last.end_at).getTime() - new Date(last.start_at).getTime()) / (1000 * 60);

    const newSessions = [];
    for (let i = 1; i <= addCount; i++) {
      const start = new Date(lastStart);
      start.setDate(start.getDate() + dayInterval * i);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + baseDuration);

      const roundIndex = (last.round_index ?? sessions.length) + i;
      const roundDisplay = `${roundIndex}/${newTotal}`;

      newSessions.push({
        ...last,
        id: undefined,
        created_at: undefined,
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
      sessions.map((s: any) =>
        supabase
          .from('sessions')
          .update({
            round_total: newTotal,
            round_display: `${s.round_index}/${newTotal}`,
          })
          .eq('id', s.id)
      )
    );

    const { error: insertError } = await supabase.from('sessions').insert(newSessions);
    if (insertError) throw insertError;

    toast.success('회차가 성공적으로 확장되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    toast.error('회차 확장에 실패했습니다: ' + msg);
  }
}

