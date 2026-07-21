export type SessionEntryMode = 'start' | 'settings';

export function parseSessionEntryMode(value: string | null | undefined): SessionEntryMode {
  return value === 'settings' ? 'settings' : 'start';
}

/**
 * entry=settings 는 Legacy autostart=1 보다 우선.
 * entry 없음 + autostart=1 → Legacy 자동 시작 허용.
 */
export function resolveLegacyAutostart(args: {
  entryMode: SessionEntryMode;
  autostartParam: string | null | undefined;
}): boolean {
  if (args.entryMode === 'settings') return false;
  return args.autostartParam === '1';
}

export function isInteractiveKeyTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined') return false;
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button, a, input, select, textarea, [role="button"], [role="radio"]'))
  );
}
