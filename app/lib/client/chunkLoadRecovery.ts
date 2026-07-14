const RELOAD_FLAG = 'spokedu:chunk-load-reload';

function isChunkLoadFailure(error: unknown, message?: string): boolean {
  const name = error && typeof error === 'object' && 'name' in error
    ? String((error as { name?: unknown }).name ?? '')
    : '';
  const text = `${name} ${message ?? ''} ${error instanceof Error ? error.message : ''}`;
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    /Importing a module script failed/i.test(text)
  );
}

/** 배포 후 stale chunk로 깨진 탭을 짧은 시간 창에서 1회만 새로고침. */
export function tryReloadOnceForChunkLoadError(error: unknown, message?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isChunkLoadFailure(error, message)) return false;

  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // sessionStorage 불가 시에도 한 번 시도
  }

  window.location.reload();
  return true;
}

export function installChunkLoadRecovery(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (event: ErrorEvent) => {
    tryReloadOnceForChunkLoadError(event.error, event.message);
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    tryReloadOnceForChunkLoadError(event.reason);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // 정상 로드 후 플래그를 지워, 같은 탭에서 다음 배포 후에도 다시 복구 가능.
  const clearTimer = window.setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      // ignore
    }
  }, 5000);

  return () => {
    window.clearTimeout(clearTimer);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
