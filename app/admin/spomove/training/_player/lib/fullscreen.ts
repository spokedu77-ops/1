/** Fullscreen is optional; denial must never prevent a terminal result. */
export function exitFullscreenSafely(): void {
  try { void document.exitFullscreen?.().catch(() => {}); } catch { /* Browser already exited or denied the request. */ }
}
