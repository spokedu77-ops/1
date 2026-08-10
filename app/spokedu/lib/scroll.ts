export function getSpokeduScrollY(): number {
  if (typeof window === 'undefined') return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function scrollSpokeduToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function scrollSpokeduToTopOrHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      const header = document.querySelector('header');
      const headerOffset = header instanceof HTMLElement ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 12;
      window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
      return;
    }
  }
  scrollSpokeduToTop();
}

type ScrollLockState = {
  bodyOverflow: string;
};

let scrollLockState: ScrollLockState | null = null;

/** Lock document scrolling while the mobile navigation overlay is open. */
export function lockSpokeduScroll() {
  if (typeof document === 'undefined' || scrollLockState) return;
  scrollLockState = { bodyOverflow: document.body.style.overflow };
  document.body.style.overflow = 'hidden';
}

export function unlockSpokeduScroll() {
  if (typeof document === 'undefined' || !scrollLockState) return;
  document.body.style.overflow = scrollLockState.bodyOverflow;
  scrollLockState = null;
}
