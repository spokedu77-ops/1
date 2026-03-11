/**
 * Shared server-side utilities for SPOKEDU Pro API routes.
 */
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie } from '@/app/lib/server/spokeduProContext';

export type SvcClient = ReturnType<typeof getServiceSupabase>;

/**
 * Resolves the active center ID for the current user.
 * Priority: cookie → owned center → member center.
 */
export async function resolveCenter(
  req: NextRequest,
  svc: SvcClient,
  userId: string,
): Promise<string | null> {
  const fromCookie = getActiveCenterIdFromCookie(req);
  if (fromCookie) return fromCookie;

  const { data } = await svc
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (data?.id) return data.id;

  const { data: member } = await svc
    .from('spokedu_pro_center_members')
    .select('center_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return member?.center_id ?? null;
}

/**
 * Loads students from the legacy tenant_content JSON blob (DB_READY=false mode).
 */
export async function loadStudentsFromContent(
  svc: SvcClient,
  userId: string,
): Promise<import('@/app/lib/types/spokeduPro').StoredStudent[]> {
  const { data } = await svc
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', 'students')
    .maybeSingle();
  if (!data) return [];
  const val = data.draft_value as { students?: import('@/app/lib/types/spokeduPro').StoredStudent[] };
  return val?.students ?? [];
}

/**
 * Persists students to the legacy tenant_content JSON blob (DB_READY=false mode).
 */
export async function saveStudentsToContent(
  svc: SvcClient,
  userId: string,
  students: import('@/app/lib/types/spokeduPro').StoredStudent[],
): Promise<void> {
  await svc
    .from('spokedu_pro_tenant_content')
    .upsert(
      {
        owner_id: userId,
        key: 'students',
        draft_value: { students },
        draft_updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,key' },
    );
}
