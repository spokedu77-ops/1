import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { SCREENPLAY_CATALOG } from '@/app/lib/spokedu-pro/screenplayCatalog';

const DB_READY = process.env.SPOKEDU_PRO_SCREENPLAYS_DB_READY === 'true';

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!DB_READY) {
    return NextResponse.json({ ok: true, screenplays: SCREENPLAY_CATALOG, source: 'catalog' });
  }

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('spokedu_pro_screenplays')
      .select('id, mode_id, title, subtitle, description, sort_order, preset_ref, thumbnail_url')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const screenplays = (data ?? []).map((row) => ({
      id: row.id,
      modeId: row.mode_id,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      description: row.description ?? undefined,
      sortOrder: row.sort_order,
      presetRef: row.preset_ref ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
    }));

    return NextResponse.json({ ok: true, screenplays, source: 'db' });
  } catch {
    return NextResponse.json({ ok: true, screenplays: SCREENPLAY_CATALOG, source: 'catalog_fallback' });
  }
}
