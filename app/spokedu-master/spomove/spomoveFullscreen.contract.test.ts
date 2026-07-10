import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const sessionPageSource = readFileSync(
  join(process.cwd(), 'app/spokedu-master/spomove/session/page.tsx'),
  'utf8',
);

describe('SPOMOVE fullscreen contract', () => {
  it('exits document fullscreen when a session completes or ends', () => {
    const finishSessionStart = sessionPageSource.indexOf('const finishSession = useCallback');
    const finishSessionEnd = sessionPageSource.indexOf('useEffect(() => {', finishSessionStart);
    const finishSessionSource = sessionPageSource.slice(finishSessionStart, finishSessionEnd);

    expect(sessionPageSource).toContain('const exitFullscreenAfterSession = useCallback');
    expect(sessionPageSource).toContain('document.exitFullscreen?.().catch(() => undefined)');
    expect(finishSessionSource).toContain('exitFullscreenAfterSession();');
  });
});
