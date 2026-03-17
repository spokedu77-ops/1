/**
 * 사이드바를 숨기는 경로(전체 화면 페이지) 목록.
 * pathname 조건을 한 곳에서만 관리하여 누적 분산 방지.
 */
export const FULLSCREEN_PATH_PREFIXES = [
  '/login',
  '/',
  '/report',
  '/program',
  '/info',
  '/admin/camera',
  '/admin/memory-game',
  '/spokedu-pro',
  '/admin/spokedu-pro',
  '/teacher',
] as const;

export function isFullscreenPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return FULLSCREEN_PATH_PREFIXES.some(
    (p) => p !== '/' && (pathname === p || pathname.startsWith(p + '/'))
  );
}
