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
