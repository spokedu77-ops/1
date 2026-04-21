import type { SupabaseClient } from '@supabase/supabase-js';
import { devLogger } from '@/app/lib/logging/devLogger';

export function slugifyTitle(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'untitled';
}

/** 활성 문서(deleted_at IS NULL) 사이에서만 slug 충돌을 피함 */
export async function allocateSlugForActiveRow(
  supabase: SupabaseClient,
  desired: string,
  excludeDocumentId: string | null
): Promise<string> {
  for (let n = 0; n < 40; n++) {
    const candidate = n === 0 ? desired : `${desired}-${n + 1}`;
    let q = supabase.from('note_documents').select('id').eq('slug', candidate).is('deleted_at', null);
    if (excludeDocumentId) {
      q = q.neq('id', excludeDocumentId);
    }
    const { data, error } = await q.limit(1);
    if (error) {
      devLogger.error('[noteDocumentSlug] allocateSlug query', error);
      throw error;
    }
    if (!data || data.length === 0) return candidate;
  }
  return `${desired}-${Date.now()}`;
}
