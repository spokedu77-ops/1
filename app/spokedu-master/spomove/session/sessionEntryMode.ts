export type SessionEntryMode = 'start' | 'settings';

export function parseSessionEntryMode(value: string | null | undefined): SessionEntryMode {
  return value === 'settings' ? 'settings' : 'start';
}

/**
 * Legacy autostart는 entry 쿼리가 **아예 없을 때만** 허용.
 * entry=start|settings 가 있으면 autostart=1 이어도 Setup 화면을 연다.
 */
export function resolveLegacyAutostart(args: {
  entryParam: string | null | undefined;
  autostartParam: string | null | undefined;
}): boolean {
  return args.entryParam == null && args.autostartParam === '1';
}

export function isInteractiveKeyTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined') return false;
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button, a, input, select, textarea, [role="button"], [role="radio"]'))
  );
}
