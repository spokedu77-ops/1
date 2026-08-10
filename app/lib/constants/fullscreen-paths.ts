/**
 * 사이드바를 숨기는 경로(전체 화면 페이지) 목록.
 * pathname 조건을 한 곳에서만 관리하여 누적 분산 방지.
 */
import { SPOKEDU_PATHS } from '@/app/spokedu/data/public-routes';

export const FULLSCREEN_PATH_PREFIXES = [
  '/login',
  '/report',
  '/program',
  '/info',
  '/admin/camera',
  '/admin/note',
  '/admin/spomove/training/_player',
  '/pro',
  '/spokedu-master',
  '/teacher',
  '/move-report',
] as const;

const PUBLIC_MARKETING_PATH_PREFIXES = Object.values(SPOKEDU_PATHS);

export function isPublicMarketingPath(pathname: string): boolean {
  return PUBLIC_MARKETING_PATH_PREFIXES.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`))
  );
}

export function isFullscreenPath(pathname: string): boolean {
  return FULLSCREEN_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}
