import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';

type StartableSessionRow = {
  id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  started_at: string | null;
};

export async function POST(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);

  const { sessionId } = await context.params;
  const supabase = getServiceSupabase();
  const loadOwnedSession = () => supabase.from('spokedu_master_sessions')
    .select('id,status,started_at')
    .eq('id', sessionId)
    .eq('owner_id', access.userId)
    .is('deleted_at', null)
    .maybeSingle();

  const { data: loaded, error: loadError } = await loadOwnedSession();
  if (loadError) return privateNoStoreJson({ error: 'Session could not be loaded' }, { status: 500 });
  const session = loaded as StartableSessionRow | null;
  if (!session) return privateNoStoreJson({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'scheduled') {
    return privateNoStoreJson({ error: 'Only scheduled sessions can be started' }, { status: 409 });
  }
  if (session.started_at) {
    return privateNoStoreJson({ data: { sessionId: session.id, startedAt: session.started_at } });
  }

  const firstStartedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from('spokedu_master_sessions')
    .update({ started_at: firstStartedAt })
    .eq('id', sessionId)
    .eq('owner_id', access.userId)
    .eq('status', 'scheduled')
    .is('started_at', null)
    .is('deleted_at', null)
    .select('id,started_at')
    .maybeSingle();
  if (updateError) return privateNoStoreJson({ error: 'Session could not be started' }, { status: 500 });
  if (updated?.started_at) {
    return privateNoStoreJson({ data: { sessionId: updated.id, startedAt: updated.started_at } });
  }

  // A concurrent/repeated request may have won the nullable-column update.
  const { data: reloaded, error: reloadError } = await loadOwnedSession();
  const current = reloaded as StartableSessionRow | null;
  if (!reloadError && current?.status === 'scheduled' && current.started_at) {
    return privateNoStoreJson({ data: { sessionId: current.id, startedAt: current.started_at } });
  }
  return privateNoStoreJson({ error: 'Session could not be started' }, { status: 409 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);

  const { sessionId } = await context.params;
  const supabase = getServiceSupabase();
  const { error } = await supabase.rpc('spokedu_master_undo_session_start', {
    p_owner_id: access.userId,
    p_session_id: sessionId,
  });
  if (error) {
    if (error.code === 'P0002') return privateNoStoreJson({ error: 'Session not found' }, { status: 404 });
    if (error.code === '55000') {
      return privateNoStoreJson({ error: error.message === 'session has run evidence'
        ? '진행한 활동이나 수업 기록이 있어 시작을 취소할 수 없습니다.'
        : '진행 중인 수업만 시작을 취소할 수 있습니다.' }, { status: 409 });
    }
    return privateNoStoreJson({ error: 'Session start could not be undone' }, { status: 500 });
  }
  return privateNoStoreJson({ data: { sessionId, startedAt: null, rosterLockedAt: null } });
}
