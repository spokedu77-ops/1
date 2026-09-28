import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentDir = join(
  process.cwd(),
  'app/admin/spomove/training/_player/components',
);
const readComponent = (name: string) =>
  readFileSync(join(componentDir, `${name}.tsx`), 'utf8');

const stopBody = (source: string) => {
  const start = source.indexOf('const stopGame = useCallback');
  const end = source.indexOf('const endGame = useCallback', start);
  return source.slice(start, end);
};

describe('SPOMOVE engine completion semantics', () => {
  it.each([
    'VisualReactionTraining',
    'BeatWaveReactionTraining',
    'CamouflageReactionTraining',
    'RushReactionTraining',
    'RobloxMoleReactionTraining',
    'WormholeReactionTraining',
    'NumberCartReactionTraining',
    'ColorTrackerReactionTraining',
    'GoalkeeperReactionTraining',
  ])('%s routes STOP to exit confirmation rather than completion', (name) => {
    const body = stopBody(readComponent(name));
    expect(body).toMatch(/onExit(?:Ref\.current)?\(\)/);
    expect(body).not.toContain('onComplete');
  });

  it('keeps ColorMemoryGrid STOP separate from its natural completion callback', () => {
    const source = readComponent('ColorMemoryGridReactionTraining');
    expect(source).toContain('onClick={onExit}>STOP</button>');
    expect(source).toContain('if (g.durationLeft <= 0) complete()');
  });

  it.each([
    ['ShapeCompletionReactionTraining', 'const stop=useCallback(()=>exitRef.current(),[])'],
    ['RelativeCompassReactionTraining', 'const stop = useCallback(() => exitRef.current(), [])'],
    ['TargetTrackingReactionTraining', 'onExitRef.current();'],
    ['VirusOutbreakReactionTraining', 'onClick={onExit}>STOP</button>'],
  ])('%s keeps its official STOP control on the exit-request path', (name, expected) => {
    expect(readComponent(name)).toContain(expected);
  });

  it('labels only natural engine callbacks as natural completion', () => {
    const router = readFileSync(
      join(process.cwd(), 'app/spokedu-master/spomove/session/EngineRouter.tsx'),
      'utf8',
    );
    expect(router).toContain("completionReason: 'natural_complete'");
    expect(router).not.toContain("completionReason: 'stopped_early'");
  });

  it('guards STOP requests and terminal completion synchronously', () => {
    const page = readFileSync(
      join(process.cwd(), 'app/spokedu-master/spomove/session/page.tsx'),
      'utf8',
    );
    expect(page).toContain('if (!officialPreset || !activeRunId || finishLockedRef.current) return;');
    expect(page).toContain('finishLockedRef.current = true;');
    expect(page).toContain('if (finishLockedRef.current || stopRequestLockedRef.current) return;');
    expect(page).toContain('stopRequestLockedRef.current = true;');
  });
});
