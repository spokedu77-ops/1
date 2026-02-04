import { SupabaseClient } from '@supabase/supabase-js';

/** RPC로 방별 읽지 않은 메시지 수 조회 (admin/teacher 공통) */
export async function fetchUnreadCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_unread_counts', { p_user_id: userId });
  if (error) return {};
  const counts: Record<string, number> = {};
  data?.forEach((item: { room_id: string; unread_count: number }) => {
    if (item.unread_count > 0) counts[item.room_id] = item.unread_count;
  });
  return counts;
}

/** 방 입장 시 읽음 처리 (admin/teacher 공통) */
export async function markRoomAsRead(
  supabase: SupabaseClient,
  roomId: string,
  userId: string
): Promise<void> {
  await supabase
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);
}
