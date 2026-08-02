/** `/spokedu`는 root layout fullscreen이라 window가 아니라 main이 스크롤됨 */
export function getSpokeduScrollRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const rootMain = document.querySelector('body > div.flex > main');
  return rootMain instanceof HTMLElement ? rootMain : null;
}

export function getSpokeduScrollY(): number {
  if (typeof window === 'undefined') return 0;
  const root = getSpokeduScrollRoot();
  if (root && root.scrollHeight > root.clientHeight + 1) {
    return root.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function scrollSpokeduToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const rootMain = getSpokeduScrollRoot();
  if (rootMain) {
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

type ScrollLockState = {
  root: HTMLElement | null;
  rootOverflow: string;
  bodyOverflow: string;
};

let scrollLockState: ScrollLockState | null = null;

/** fullscreen main + body 모두 잠근다 (메뉴 오버레이용) */
export function lockSpokeduScroll() {
  if (typeof document === 'undefined' || scrollLockState) return;
  const root = getSpokeduScrollRoot();
  scrollLockState = {
    root,
    rootOverflow: root?.style.overflow ?? '',
    bodyOverflow: document.body.style.overflow,
  };
  document.body.style.overflow = 'hidden';
  if (root) root.style.overflow = 'hidden';
}

export function unlockSpokeduScroll() {
  if (typeof document === 'undefined' || !scrollLockState) return;
  const { root, rootOverflow, bodyOverflow } = scrollLockState;
  document.body.style.overflow = bodyOverflow;
  if (root) root.style.overflow = rootOverflow;
  scrollLockState = null;
}
