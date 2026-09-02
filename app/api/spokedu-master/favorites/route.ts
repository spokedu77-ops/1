import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import {
  isFavoriteContentRef,
  normalizeFavoriteContentRefs,
  type FavoriteContentRef,
} from '@/app/spokedu-master/lib/favoriteLib';
import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FAVORITES_SERVER_ERROR = '즐겨찾기를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

type FavoriteRow = {
  content_type: unknown;
  program_id: unknown;
};

async function classifyTransitionRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  rows: FavoriteRow[],
) {
  const untypedIds = [...new Set(rows.filter((row) => row.content_type == null).map((row) => String(row.program_id ?? '')).filter(Boolean))];
  if (untypedIds.length === 0) return [];

  const numericIds = untypedIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0 && untypedIds.includes(String(id)));
  const programIds = new Set<string>();
  if (numericIds.length > 0) {
    const [curricula, overlays, meta] = await Promise.all([
      supabase.from('curriculum').select('id').eq('is_sub', false).in('id', numericIds),
      supabase.from('spokedu_pro_programs').select('source_center_curriculum_id').eq('is_published', true).in('source_center_curriculum_id', numericIds),
      supabase.from('spokedu_master_program_meta').select('curriculum_id').in('curriculum_id', numericIds),
    ]);
    if (curricula.error || overlays.error || meta.error) return [];
    const overlayIds = new Set((overlays.data ?? []).map((row) => row.source_center_curriculum_id));
    const metaIds = new Set((meta.data ?? []).map((row) => row.curriculum_id));
    for (const row of curricula.data ?? []) {
      if (overlayIds.has(row.id) && metaIds.has(row.id)) programIds.add(String(row.id));
    }
  }
  const spomoveIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
  return rows.flatMap((row) => {
    if (row.content_type != null) return [];
    const id = String(row.program_id ?? '');
    const isProgram = programIds.has(id);
    const isSpomove = spomoveIds.has(id);
    if (isProgram === isSpomove) return [];
    return [{ type: isProgram ? 'program' as const : 'spomove' as const, id }];
  });
}

async function readFavoriteRef(request: Request): Promise<FavoriteContentRef | null> {
  try {
    const body = await request.json();
    return isFavoriteContentRef(body) ? { type: body.type, id: body.id.trim() } : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const access = await requireSpokeduMasterCapability('library');
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_favorites')
    .select('content_type,program_id')
    .eq('owner_id', access.userId)
    .order('created_at', { ascending: true });

  if (error) {
    await reportError(error, { context: 'spokedu_master.favorites', tags: { method: 'GET', stage: 'select', status: 500 } });
    return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
  }

  const rows = (data ?? []) as FavoriteRow[];
  const transitionRefs = await classifyTransitionRows(supabase, rows);
  const refs = normalizeFavoriteContentRefs([...rows.map((row) => ({
    type: (row as FavoriteRow).content_type,
    id: (row as FavoriteRow).program_id,
  })), ...transitionRefs]);
  return privateNoStoreJson({ data: refs });
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterCapability('library');
  if (!access.ok) return withPrivateNoStore(access.response);
  const ref = await readFavoriteRef(request);
  if (!ref) return privateNoStoreJson({ error: '유효하지 않은 즐겨찾기 요청입니다.' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data: existing, error: selectError } = await supabase
    .from('spokedu_master_program_favorites')
    .select('id')
    .eq('owner_id', access.userId)
    .eq('content_type', ref.type)
    .eq('program_id', ref.id)
    .maybeSingle();
  if (selectError) {
    await reportError(selectError, { context: 'spokedu_master.favorites', tags: { method: 'POST', stage: 'select', status: 500 } });
    return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
  }
  if (!existing) {
    const { error: insertError } = await supabase.from('spokedu_master_program_favorites').insert({
      owner_id: access.userId,
      content_type: ref.type,
      program_id: ref.id,
    });
    if (insertError && insertError.code !== '23505') {
      await reportError(insertError, { context: 'spokedu_master.favorites', tags: { method: 'POST', stage: 'insert', status: 500 } });
      return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
    }
  }
  return privateNoStoreJson({ data: ref });
}

export async function DELETE(request: Request) {
  const access = await requireSpokeduMasterCapability('library');
  if (!access.ok) return withPrivateNoStore(access.response);
  const ref = await readFavoriteRef(request);
  if (!ref) return privateNoStoreJson({ error: '유효하지 않은 즐겨찾기 요청입니다.' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('spokedu_master_program_favorites')
    .delete()
    .eq('owner_id', access.userId)
    .eq('content_type', ref.type)
    .eq('program_id', ref.id);
  if (error) {
    await reportError(error, { context: 'spokedu_master.favorites', tags: { method: 'DELETE', stage: 'delete', status: 500 } });
    return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
  }
  return privateNoStoreJson({ data: ref });
}
