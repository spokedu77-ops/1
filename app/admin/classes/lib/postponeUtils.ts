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

    const { data: future, error: futureError } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', curr.group_id)
      .gte('start_at', curr.start_at);

    if (futureError) throw futureError;

    if (future) {
      await Promise.all(
        future.map(async (s: { id?: string; start_at?: string; end_at?: string }) => {
          const startAt = s.start_at ?? '';
          const endAt = s.end_at ?? '';
          const ns = new Date(new Date(startAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const ne = new Date(new Date(endAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
        })
      );
    }

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

