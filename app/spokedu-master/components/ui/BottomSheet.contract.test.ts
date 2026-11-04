import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/components/ui/BottomSheet.tsx'), 'utf8');

describe('MASTER BottomSheet viewport ownership', () => {
  it('portals modal sheets to the document body while preserving the desktop session workspace', () => {
    expect(source).toContain('setPortalHost(document.body)');
    expect(source).toContain('createPortal(overlay, portalHost)');
    expect(source).toContain('const usesDesktopSessionWorkspace = isSession && desktopSession && !nested');
    expect(source).toContain('if (usesDesktopSessionWorkspace) return overlay');
  });

  it('retains focus restoration, escape handling, body lock, and safe-area padding', () => {
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('previousFocusRef.current?.isConnected');
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain("data-spm-bottom-sheet-scroll-lock");
    expect(source).toContain("document.body.removeAttribute(BODY_SCROLL_LOCK_ATTRIBUTE)");
    expect(source).toContain("document.body.style.overflow === 'hidden'");
    expect(source).toContain('activeBodyScrollLocks += 1');
    expect(source).toContain('releaseBodyScrollLock?.()');
    expect(source).toContain("env(safe-area-inset-bottom)");
  });
});
