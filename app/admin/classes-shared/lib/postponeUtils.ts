import { toast } from 'sonner';

import { reindexGroupRounds, type SessionRowForReindex } from './reindexGroupRounds';
import { buildRoundSnapshot } from './roundFields';
import { findCrossGroupSlotConflicts, hasDuplicatePostponedSlot } from './sessionRoundGuards';
import { omitSessionIdentityForInsertClone } from './sessionInsertClone';

function assertMutationApplied(data: { id?: string } | null, error: unknown, fallback: string) {
  if (error) throw error;
  if (!data?.id) throw new Error(fallback);
}

async function loadGroupSessionsForRounds(
  supabase: any,
  groupId: string
): Promise<SessionRowForReindex[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, start_at, status, round_total, round_index')
    .eq('group_id', groupId)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return (data || []) as SessionRowForReindex[];
}

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

    const groupId = String(curr.group_id);
    const origStartAt = String(curr.start_at);
    const teacherId = String(curr.created_by ?? '');
    const title = String(curr.title ?? '');

    if (await hasDuplicatePostponedSlot(supabase, groupId, origStartAt)) {
      toast.error('이미 같은 날짜·시간에 연기 기록이 있습니다. 중복 연기는 할 수 없습니다.');
      return;
    }

    const crossConflicts = await findCrossGroupSlotConflicts(supabase, {
      teacherId,
      title,
      startAtList: [origStartAt],
      excludeGroupId: groupId,
    });
    if (crossConflicts.length > 0) {
      toast.error(
        '같은 강사·수업명·시간에 다른 사이클(그룹) 수업이 이미 있습니다. 구 사이클을 정리한 뒤 연기해 주세요.'
      );
      return;
    }

    let groupRows = await loadGroupSessionsForRounds(supabase, groupId);
    if (groupRows.length > 1) {
      await reindexGroupRounds(supabase, groupRows);
      groupRows = await loadGroupSessionsForRounds(supabase, groupId);
    }

    const { data: currFresh, error: refetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (refetchError) throw refetchError;
    if (!currFresh) throw new Error('POSTPONE_SESSION_NOT_FOUND');

    const roundSnapshot = buildRoundSnapshot(groupRows, currFresh.round_index);

    // 주 2회(월/수)처럼 "다음 슬롯"으로 미뤄야 하므로,
    // 같은 group_id에서 start_at 오름차순으로 정렬된 "활성 회차(= postponed/cancelled/deleted 제외)"를
    // 1칸 뒤로 시프트한다.
    const { data: future = [], error: futureError } = await supabase
      .from('sessions')
      .select('id, start_at, end_at, status')
      .eq('group_id', groupId)
      .gte('start_at', currFresh.start_at)
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
        const { data, error } = await supabase
          .from('sessions')
          .update({ start_at: ns, end_at: ne })
          .eq('id', s.id)
          .select('id')
          .maybeSingle();
        assertMutationApplied(data, error, 'POSTPONE_SESSION_SHIFT_NOT_UPDATED');
      })
    );

    const insertBase = omitSessionIdentityForInsertClone(currFresh as Record<string, unknown>);
    const { data: insertedPostpone, error: insertError } = await supabase
      .from('sessions')
      .insert([
        {
          ...insertBase,
          start_at: origStartAt,
          end_at: currFresh.end_at,
          status: 'postponed',
          ...roundSnapshot,
        },
      ])
      .select('id')
      .maybeSingle();

    assertMutationApplied(insertedPostpone, insertError, 'POSTPONE_SESSION_NOT_CREATED');

    const afterRows = await loadGroupSessionsForRounds(supabase, groupId);
    if (afterRows.length > 1) {
      await reindexGroupRounds(supabase, afterRows);
    }

    toast.success('일정이 성공적으로 연기되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    toast.error('일정 연기에 실패했습니다: ' + msg);
  }
}

// postponed 상태였던 회차를 원래 슬롯 기준으로 복구한다.
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

    const groupId = String(curr.group_id);
    const origStartMs = new Date(curr.start_at).getTime();
    if (!Number.isFinite(origStartMs)) {
      toast.error('복구할 시작일이 올바르지 않습니다.');
      return;
    }

    const { data: future = [], error: futureError } = await supabase
      .from('sessions')
      .select('id, start_at, end_at, status')
      .eq('group_id', groupId)
      .gte('start_at', curr.start_at)
      .order('start_at', { ascending: true });

    if (futureError) throw futureError;

    const activeList = (future as Array<{ id?: string; start_at?: string; end_at?: string; status?: string | null }>)
      .filter((s) => !['postponed', 'cancelled', 'deleted'].includes(String(s.status ?? '')))
      .filter((s) => !!s.id && !!s.start_at && !!s.end_at)
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

    await Promise.all(
      activeList.map(async (s, i) => {
        const durationMs = new Date(s.end_at!).getTime() - new Date(s.start_at!).getTime();
        const newStartMs = i === 0 ? origStartMs : new Date(activeList[i - 1]!.start_at!).getTime();
        const ns = new Date(newStartMs).toISOString();
        const ne = new Date(newStartMs + durationMs).toISOString();
        const { data, error } = await supabase
          .from('sessions')
          .update({ start_at: ns, end_at: ne })
          .eq('id', s.id)
          .select('id')
          .maybeSingle();
        assertMutationApplied(data, error, 'UNDO_POSTPONE_SESSION_SHIFT_NOT_UPDATED');
      })
    );

    const { data: deletedPostpone, error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .select('id')
      .maybeSingle();
    assertMutationApplied(deletedPostpone, deleteError, 'POSTPONED_SESSION_NOT_DELETED');

    const afterRows = await loadGroupSessionsForRounds(supabase, groupId);
    if (afterRows.length > 1) {
      await reindexGroupRounds(supabase, afterRows);
    }

    toast.success('일정이 성공적으로 복구되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    toast.error('일정 복구에 실패했습니다: ' + msg);
  }
}
