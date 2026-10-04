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

  it('keeps one content scroll owner between detached header and optional footer', () => {
    expect(source.match(/data-sheet-scroll-owner/g)).toHaveLength(1);
    expect(source).toContain('min-h-0 flex-1 touch-pan-y overflow-y-auto');
    expect(source).toContain('data-sheet-footer');
    expect(source).toContain('shrink-0');
    expect(source).not.toContain("hasDetachedFooter ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'");
  });

  it('retains focus restoration, escape handling, body lock, and safe-area padding', () => {
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('previousFocusRef.current?.isConnected');
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain("env(safe-area-inset-bottom)");
  });
});
