
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from './manage/session-detailTestSource';
const session = readSessionDetailSource();

describe('UI Foundation v3.2 deep operational contract', () => {

  it('preserves the existing persistence and completion calls', () => {
    expect(session).toContain('await data.updateSessionProgram');
    expect(session).toContain('primarySurfaceIntent={presentation?.primarySurfaceIntent ?? null}');
    expect(session).toContain('saveCapture: captureRef.current');
    expect(session).toContain('전체 출석');
  });
});
