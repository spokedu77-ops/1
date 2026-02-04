/**
 * Orphan Draft 정리 로직
 * 오래된 Draft 자동 정리 기능
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

/**
 * 오래된 Draft 정리
 * @param daysOld 정리할 Draft의 최소 일수 (기본값: 30일)
 * @returns 정리된 Draft 개수
 */
export async function cleanupOldDrafts(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const { data, error } = await supabase
      .from('scenarios')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('is_draft', true)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      throw new Error(`Draft 정리 실패: ${error.message}`);
    }
    
    return data?.length || 0;
  } catch (err: any) {
    console.error('Draft 정리 실패:', err);
    throw err;
  }
}
