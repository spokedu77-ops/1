/** devicePixelRatio 대응 canvas 리사이즈 유틸.
 *
 * 반환값 cssW/cssH는 게임 좌표계(CSS 픽셀)로, 게임 내 모든 위치 계산에 사용한다.
 * canvas 백킹 스토어는 dpr 배율로 확대되고 ctx는 dpr 스케일이 적용된 상태로 반환된다.
 * 각 프레임 clearRect 전에 `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` 을 호출해야
 * 스케일이 유지된다. (clearRect 자체는 변환 무관하게 전체 버퍼를 지운다.)
 */
export function setupCanvas(
  cv: HTMLCanvasElement,
  containerWidth: number,
  containerHeight: number,
): { cssW: number; cssH: number; dpr: number } {
  const cssW = containerWidth;
  const cssH = containerHeight;
  if (cssW <= 0 || cssH <= 0) return { cssW: 0, cssH: 0, dpr: 1 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const ctx = cv.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cssW, cssH, dpr };
}
