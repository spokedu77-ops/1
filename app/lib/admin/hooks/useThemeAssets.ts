/**
 * React Query Hooks for Theme Assets
 * Asset Hub 이미지 조회 및 캐싱
 */

import { useQuery } from '@tanstack/react-query';
import { loadThemeAssets, ThemeAssets } from '@/app/lib/admin/assets/loadThemeAssets';

/**
 * 테마별 Asset 조회
 * staleTime: 10분 (이미지는 자주 변경되지 않음)
 */
export function useThemeAssets(themeId: string, weekId?: string) {
  return useQuery<ThemeAssets>({
    queryKey: ['theme-assets', themeId, weekId],
    queryFn: () => loadThemeAssets(themeId, weekId),
    staleTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false, // 이미지는 포커스 시 갱신 불필요
    enabled: !!themeId, // themeId가 있을 때만 실행
  });
}
