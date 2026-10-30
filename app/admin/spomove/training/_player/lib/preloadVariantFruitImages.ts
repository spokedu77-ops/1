const PRELOAD_RETRY_DELAY_MS = 320;

// A training screen can ask for the same asset set during setup, countdown and
// session start. Keep one browser-session request per versioned URL so those
// lifecycle transitions do not download the same Storage object again.
const loadedUrls = new Set<string>();
const inFlightLoads = new Map<string, Promise<void>>();

function loadImageOnce(href: string, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      img.onload = null; img.onerror = null;
      if (ok) loadedUrls.add(href);
      else img.src = '';
      resolve(ok);
    };
    const abort = () => done(false);
    const timeout = setTimeout(abort, 10_000);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { done(false); return; }
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = href;
  });
}

/** Verify actual image loads before publishing a pack to a running engine. */
export async function validateVariantImages<T extends { imageUrl: string }>(slides: readonly T[], signal: AbortSignal): Promise<T[]> {
  const urls = [...new Set(slides.map(slide => slide.imageUrl).filter(Boolean))];
  const results = await Promise.all(urls.map(async url => [url, loadedUrls.has(url) || await loadImageOnce(url, signal)] as const));
  signal.throwIfAborted();
  const usable = new Set(results.filter(([, ok]) => ok).map(([url]) => url));
  return slides.filter(slide => usable.has(slide.imageUrl));
}

async function preloadOneUncached(href: string, maxRetries = 2): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ok = await loadImageOnce(href);
    if (ok) {
      loadedUrls.add(href);
      return;
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, PRELOAD_RETRY_DELAY_MS * (attempt + 1)));
    }
  }
}

function preloadOne(href: string): Promise<void> {
  if (loadedUrls.has(href)) return Promise.resolve();

  const existing = inFlightLoads.get(href);
  if (existing) return existing;

  const pending = preloadOneUncached(href).finally(() => {
    inFlightLoads.delete(href);
  });
  inFlightLoads.set(href, pending);
  return pending;
}

/** 연상 색지각: 이미지 URL 목록을 브라우저 캐시에 올립니다 (순차·재시도). */
export function preloadVariantFruitImages(urls: readonly string[] = []): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const unique = [...new Set(urls.filter((href) => typeof href === 'string' && href.trim()))];
  return (async () => {
    for (const href of unique) {
      await preloadOne(href);
    }
  })();
}
