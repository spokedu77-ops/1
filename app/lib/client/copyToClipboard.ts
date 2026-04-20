/**
 * 동기 복사 (document.execCommand) — 사용자 클릭 직후 같은 태스크에서 호출해야 iPad·iOS Safari에서도 동작하는 경우가 많음.
 * (await fetch(...) 이후에는 clipboard API·execCommand 모두 막히는 경우가 많음)
 */
export function copyTextToClipboardSync(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.padding = '0';
    ta.style.margin = '0';
    ta.style.border = 'none';
    ta.style.outline = 'none';
    ta.style.boxShadow = 'none';
    ta.style.background = 'transparent';
    ta.style.opacity = '0';
    ta.style.fontSize = '16px'; // iOS 확대/선택 이슈 완화
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 비동기 복사: 먼저 동기 경로, 실패 시 Clipboard API + textarea 순
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (copyTextToClipboardSync(text)) return true;

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.writeText &&
      typeof window !== 'undefined' &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ignore */
  }

  return copyTextToClipboardSync(text);
}
