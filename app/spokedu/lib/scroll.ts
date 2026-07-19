/** `/spokedu`는 root layout fullscreen이라 window가 아니라 main이 스크롤됨 */
export function scrollSpokeduToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const rootMain = document.querySelector('body > div.flex > main');
  if (rootMain instanceof HTMLElement) {
    rootMain.scrollTop = 0;
    rootMain.scrollLeft = 0;
  }
}

export function scrollSpokeduToTopOrHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ block: 'start' });
      return;
    }
  }
  scrollSpokeduToTop();
}
