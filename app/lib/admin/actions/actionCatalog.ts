/**
 * Action Catalog 관리 모듈
 * Source of Truth: physics.ts의 ACTION_KEYS
 * DB는 라벨/정렬/활성화만 관리
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';
import { ACTION_KEYS, DEFAULT_ACTION_LABELS, type ActionKey } from '@/app/lib/admin/constants/physics';

const supabase = getSupabaseClient();

export type ActionCatalogItem = {
  key: ActionKey;
  label: string;
  is_active: boolean;
  sort_order: number;
};

/**
 * Action Catalog 조회
 * ACTION_KEYS 검증 로직 포함:
 * - DB에 있지만 ACTION_KEYS에 없는 key는 무시
 * - ACTION_KEYS에 있지만 DB에 없는 key는 DEFAULT_ACTION_LABELS로 fallback
 */
export async function fetchActionCatalog(): Promise<ActionCatalogItem[]> {
  const { data, error } = await supabase
    .from('action_catalog')
    .select('key,label,is_active,sort_order')
    .order('sort_order', { ascending: true });

  // 테이블이 없을 때 graceful fallback (DEFAULT_ACTION_LABELS 사용)
  if (error) {
    // 테이블이 없는 경우 (PGRST205) DEFAULT_ACTION_LABELS로 fallback
    if (error.code === 'PGRST205') {
      console.warn('[actionCatalog] action_catalog 테이블이 없습니다. DEFAULT_ACTION_LABELS를 사용합니다. SQL 마이그레이션(sql/18_action_catalog.sql)을 실행하세요.');
      // DEFAULT_ACTION_LABELS로 fallback
      return ACTION_KEYS.map((key, index) => ({
        key,
        label: DEFAULT_ACTION_LABELS[key],
        is_active: true,
        sort_order: index + 1,
      }));
    }
    
    // 다른 에러는 그대로 throw
    throw error;
  }

  // ACTION_KEYS에 있는 것만 필터링 (안전성)
  const validKeys = new Set(ACTION_KEYS);
  const dbItems = (data ?? []) as Array<{
    key: string;
    label: string;
    is_active: boolean;
    sort_order: number;
  }>;

  // DB에 없는 ACTION_KEYS는 DEFAULT_ACTION_LABELS로 fallback
  const result: ActionCatalogItem[] = [];

  // 1. DB에 있는 항목 중 유효한 것만 추가
  for (const item of dbItems) {
    if (validKeys.has(item.key as ActionKey)) {
      result.push({
        key: item.key as ActionKey,
        label: item.label,
        is_active: item.is_active,
        sort_order: item.sort_order,
      });
    } else {
      // 경고: DB에 있지만 코드에 없는 key
      console.warn(`[actionCatalog] Ignoring invalid key from DB: ${item.key}`);
    }
  }

  // 2. ACTION_KEYS에 있지만 DB에 없는 항목은 DEFAULT_ACTION_LABELS로 fallback
  for (const key of ACTION_KEYS) {
    if (!result.find((r) => r.key === key)) {
      result.push({
        key,
        label: DEFAULT_ACTION_LABELS[key],
        is_active: true,
        sort_order: ACTION_KEYS.indexOf(key) + 1,
      });
    }
  }

  // sort_order로 정렬
  return result.sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Action 라벨 수정
 * key는 수정 불가 (Source of Truth는 physics.ts)
 * 레코드가 없으면 insert, 있으면 update (upsert)
 */
export async function updateActionLabel(key: ActionKey, label: string): Promise<void> {
  // ACTION_KEYS 검증
  if (!ACTION_KEYS.includes(key)) {
    throw new Error(`Invalid action key: ${key}. Key must be one of ACTION_KEYS.`);
  }

  // sort_order 계산 (ACTION_KEYS 인덱스 기반)
  const sortOrder = ACTION_KEYS.indexOf(key) + 1;

  // upsert: 레코드가 없으면 insert, 있으면 update
  const { error } = await supabase
    .from('action_catalog')
    .upsert({
      key,
      label,
      is_active: true, // 기본값
      sort_order: sortOrder,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'key' // key가 primary key인 경우
    });

  if (error) {
    // 테이블이 없는 경우 (PGRST205) 명확한 에러 메시지 제공
    if (error.code === 'PGRST205') {
      throw new Error(
        `action_catalog 테이블이 없습니다. SQL 마이그레이션(sql/18_action_catalog.sql)을 실행하세요.`
      );
    }
    throw error;
  }
}

/**
 * Action 활성화 상태 변경
 */
export async function updateActionActive(key: ActionKey, isActive: boolean): Promise<void> {
  if (!ACTION_KEYS.includes(key)) {
    throw new Error(`Invalid action key: ${key}. Key must be one of ACTION_KEYS.`);
  }

  const { error } = await supabase
    .from('action_catalog')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) throw error;
}
