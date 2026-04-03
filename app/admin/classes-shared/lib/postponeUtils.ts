import { toast } from 'sonner';

// 기존 page.tsx의 handlePostponeCascade 로직을 그대로 옮긴 순수 함수 버전
export async function postponeCascade(
  supabase: any,
  sessionId: string,
  options?: { onAfter?: () => void }
) {
  if (!sessionId) return;

  try {
    const { data: curr, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;
    if (!curr?.group_id) {
      toast.error('그룹 정보가 없습니다.');
      return;
    }

    // 주 2회(월/수)처럼 "다음 슬롯"으로 미뤄야 하므로,
    // 같은 group_id에서 start_at 오름차순으로 정렬된 "활성 회차(= postponed/cancelled/deleted 제외)"를
    // 1칸 뒤로 시프트한다. 즉, i번째 회차는 i+1번째 회차의 start/end로 이동한다.
    // 마지막 회차는 직전 간격만큼 뒤로 이동한다.
    const { data: future = [], error: futureError } = await supabase
      .from('sessions')
      .select('id, start_at, end_at, status')
      .eq('group_id', curr.group_id)
      .gte('start_at', curr.start_at)
      .order('start_at', { ascending: true });

    if (futureError) throw futureError;

    const activeList = (future as Array<{ id?: string; start_at?: string; end_at?: string; status?: string | null }>)
      .filter((s) => !['postponed', 'cancelled', 'deleted'].includes(String(s.status ?? '')))
      .filter((s) => !!s.id && !!s.start_at && !!s.end_at)
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

    if (activeList.length === 0) {
      toast.error('미루기 대상 회차가 없습니다.');
      return;
    }

    const lastIdx = activeList.length - 1;
    const lastGapMs =
      activeList.length >= 2
        ? new Date(activeList[lastIdx]!.start_at!).getTime() - new Date(activeList[lastIdx - 1]!.start_at!).getTime()
        : 7 * 24 * 60 * 60 * 1000;

    await Promise.all(
      activeList.map(async (s, i) => {
        const durationMs = new Date(s.end_at!).getTime() - new Date(s.start_at!).getTime();
        const newStartMs =
          i < lastIdx
            ? new Date(activeList[i + 1]!.start_at!).getTime()
            : new Date(s.start_at!).getTime() + lastGapMs;
        const ns = new Date(newStartMs).toISOString();
        const ne = new Date(newStartMs + durationMs).toISOString();
        return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
      })
    );

    // id, created_at 제외한 복사본으로 연기 세션 생성
    const { id: _id, created_at: _createdAt, ...copyData } = curr;
    void _id;
    void _createdAt;

    const { error: insertError } = await supabase
      .from('sessions')
      .insert([{ ...copyData, start_at: curr.start_at, status: 'postponed' }]);

    if (insertError) throw insertError;

    toast.success('일정이 성공적으로 연기되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    toast.error('일정 연기에 실패했습니다: ' + msg);
  }
}

// postponed 상태였던 회차를 원래 슬롯 기준으로 복구한다.
// postponeCascade에서 "다음 슬롯으로 시프트"했으므로, 여기서는 반대로 1칸 앞(이전 슬롯)으로 되돌린다.
export async function undoPostponeCascade(
  supabase: any,
  sessionId: string,
  options?: { onAfter?: () => void }
) {
  if (!sessionId) return;

  try {
    const { data: curr, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;
    if (!curr?.group_id) {
      toast.error('그룹 정보가 없습니다.');
      return;
    }

    // postponed 레코드는 원래 start_at을 기준으로 활성 회차를 되돌린다.
    const origStartMs = new Date(curr.start_at).getTime();
    if (!Number.isFinite(origStartMs)) {
      toast.error('복구할 시작일이 올바르지 않습니다.');
      return;
    }

    const { data: future = [], error: futureError } = await supabase
      .from('sessions')
      .select('id, start_at, end_at, status')
      .eq('group_id', curr.group_id)
      .gte('start_at', curr.start_at)
      .order('start_at', { ascending: true });

    if (futureError) throw futureError;

    const activeList = (future as Array<{ id?: string; start_at?: string; end_at?: string; status?: string | null }>)
      .filter((s) => !['postponed', 'cancelled', 'deleted'].includes(String(s.status ?? '')))
      .filter((s) => !!s.id && !!s.start_at && !!s.end_at)
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

    // activeList가 비어있으면, postponed 레코드만 삭제한다.
    await Promise.all(
      activeList.map(async (s, i) => {
        const durationMs = new Date(s.end_at!).getTime() - new Date(s.start_at!).getTime();
        const newStartMs = i === 0 ? origStartMs : new Date(activeList[i - 1]!.start_at!).getTime();
        const ns = new Date(newStartMs).toISOString();
        const ne = new Date(newStartMs + durationMs).toISOString();
        return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
      })
    );

    const { error: deleteError } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (deleteError) throw deleteError;

    toast.success('일정이 성공적으로 복구되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    toast.error('일정 복구에 실패했습니다: ' + msg);
  }
}
