import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPOMOVE_SESSION_ENGINE_LAYER, SPOMOVE_SESSION_OVERLAY_LAYER } from './sessionOverlayLayer';

const page = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/session/page.tsx'), 'utf8');

describe('SPOMOVE session overlay layer', () => {
  it('places session dialogs above the engine layer', () => {
    expect(SPOMOVE_SESSION_OVERLAY_LAYER).toBeGreaterThan(SPOMOVE_SESSION_ENGINE_LAYER);
  });

  it('renders exit and activation overlays on the shared session layer', () => {
    const activation = page.slice(page.indexOf('activationBlocked ? createPortal'), page.indexOf('exitConfirmationOpen ? createPortal'));
    const exit = page.slice(page.indexOf('exitConfirmationOpen ? createPortal'));
    expect(activation).toContain('zIndex: SPOMOVE_SESSION_OVERLAY_LAYER');
    expect(activation).toContain('createPortal');
    expect(exit).toContain('zIndex: SPOMOVE_SESSION_OVERLAY_LAYER');
    expect(exit).toContain('fixed inset-0');
    expect(exit).toContain('createPortal');
    expect(page).not.toMatch(/z-\[\d+\].*수업 종료/);
  });
});
