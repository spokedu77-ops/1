const PRELOAD_RETRY_DELAY_MS = 320;

// A training screen can ask for the same asset set during setup, countdown and
// session start. Keep one browser-session request per versioned URL so those
// lifecycle transitions do not download the same Storage object again.
const loadedUrls = new Set<string>();
const inFlightLoads = new Map<string, Promise<void>>();

function loadImageOnce(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok: boolean) => resolve(ok);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = href;
  });
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
