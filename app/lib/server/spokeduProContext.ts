/**
 * 스포키듀 구독 v2: activeCenter 쿠키 및 권한 헬퍼.
 * Decision Log D1, D10 반영. 모든 center API에서 재사용.
 */

import { NextRequest } from 'next/server';

export const SPOKEDU_ACTIVE_CENTER_COOKIE = 'spokedu_active_center_id';

/** D1: 쿠키 옵션 고정. path='/' 로 API 및 pro 영역 확장 대비 */
export function getActiveCenterCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** 요청에서 activeCenterId 읽기. 검증은 별도(멤버십) 필수. */
export function getActiveCenterIdFromCookie(request: NextRequest): string | null {
  return request.cookies.get(SPOKEDU_ACTIVE_CENTER_COOKIE)?.value ?? null;
}

/** getCenterMemberRole에서만 쓰는 최소 클라이언트 타입. 실제 Supabase 제네릭 전달 시 깊은 인스턴스화 오류 방지 */
export type SupabaseClientForMemberRole = {
  from(table: string): {
    select(columns: string): {
      eq(col: string, val: string): {
        eq(col2: string, val2: string): {
          maybeSingle(): Promise<{ data: { role?: string } | null; error: unknown }>;
        };
      };
    };
  };
};

/**
 * 센터 멤버십 검증 후 역할 반환.
 * spokedu_center_members 테이블(50) 필요. 없으면 null 반환.
 * getServiceSupabase() 반환값을 넘긴다.
 */
export async function getCenterMemberRole(
  supabase: SupabaseClientForMemberRole,
  centerId: string,
  userId: string
): Promise<'owner' | 'admin' | 'coach' | null> {
  const { data, error } = await supabase
    .from('spokedu_center_members')
    .select('role')
    .eq('center_id', centerId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  const role = data?.role;
  if (role === 'owner' || role === 'admin' || role === 'coach') return role;
  return null;
}

/** D10: center 블록 조회/입력에 필요한 최소 역할(coach 이상). */
export function requireCenterMember(role: 'owner' | 'admin' | 'coach' | null): boolean {
  return role !== null;
}

/** D10: center blocks 수정/게시는 owner 또는 admin. 전역 admin은 별도 requireAdmin()으로. */
export function requireCenterAdmin(role: 'owner' | 'admin' | 'coach' | null): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * D8 Lazy migration: v1 tenant_content(owner_id) → v2 center_content / user_data.
 * 최초 센터 생성 시 1회 호출. 원본 삭제 금지.
 */
export const V1_TO_V2_KEY_MAP: Record<string, { table: 'center'; key: string } | { table: 'user'; key: string }> = {
  tenant_roadmap: { table: 'center', key: 'roadmap' },
  tenant_students: { table: 'center', key: 'students' },
  tenant_reports: { table: 'center', key: 'reports' },
  tenant_report_config: { table: 'center', key: 'report_config' },
  tenant_favorites: { table: 'user', key: 'favorites' },
};

/**
 * v1 → v2 데이터 복사. 51 마이그레이션 적용 후, 최초 center 생성 시 1회 호출.
 * getServiceSupabase()를 인자로 넘긴다. 원본 삭제 금지(D8).
 */
export async function copyV1TenantToV2(
  supabase: ReturnType<typeof import('@/app/lib/server/adminAuth').getServiceSupabase>,
  userId: string,
  centerId: string
): Promise<void> {
  const now = new Date().toISOString();
  for (const [v1Key, { table, key }] of Object.entries(V1_TO_V2_KEY_MAP)) {
    const { data: row } = await supabase
      .from('spokedu_pro_tenant_content')
      .select('draft_value, published_value, version')
      .eq('owner_id', userId)
      .eq('key', v1Key)
      .maybeSingle();
    if (!row || typeof row !== 'object') continue;
    const value = (row as { published_value?: unknown; draft_value?: unknown }).published_value
      ?? (row as { draft_value?: unknown }).draft_value ?? {};
    const version = typeof (row as { version?: number }).version === 'number' ? (row as { version: number }).version : 1;

    if (table === 'center') {
      await supabase.from('spokedu_pro_center_content').upsert(
        { center_id: centerId, key, draft_value: value, published_value: value, version, updated_at: now, published_at: now },
        { onConflict: 'center_id,key' }
      );
    } else {
      await supabase.from('spokedu_pro_user_data').upsert(
        { user_id: userId, key, value, version, updated_at: now },
        { onConflict: 'user_id,key' }
      );
    }
  }
}
