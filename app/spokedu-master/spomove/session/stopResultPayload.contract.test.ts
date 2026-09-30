import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOMOVE STOP result payload', () => {
  it('preserves MemoryGame elapsed time and measured color counts on embedded STOP', () => {
    const source = read('app/admin/spomove/training/_player/MemoryGameApp.tsx');
    expect(source).toContain('const stoppedColorCounts = { ...colorCountsRef.current }');
    expect(source).toContain('performance.now() - sessionStartMsRef.current');
    expect(source).toContain('deliverSessionResult(cfg, elapsedMs, counts, { endedEarly: true })');
    expect(source).not.toContain('if (embed && onExit) {\n      onExit(settingsToExitResume(settings));');
  });

  it('keeps the established result order and reaction lane mapping', () => {
    const summary = read('app/admin/spomove/training/_player/lib/trainingResultSummary.ts');
    expect(summary).toContain("['red', 'yellow', 'green', 'blue']");
    expect(summary).toContain('red: laneCount[0]');
    expect(summary).toContain('blue: laneCount[1]');
    expect(summary).toContain('green: laneCount[2]');
    expect(summary).toContain('yellow: laneCount[3]');
  });

  it('distinguishes STOP snapshots from natural reaction completion', () => {
    const router = read('app/spokedu-master/spomove/session/EngineRouter.tsx');
    expect(router).toContain("stats.stoppedEarly ? 'stopped_early' : 'natural_complete'");
    expect(router).toContain("result.stoppedEarly ? 'stopped_early' : 'natural_complete'");

    const engines = [
      'VisualReactionTraining', 'BeatWaveReactionTraining', 'CamouflageReactionTraining',
      'RushReactionTraining', 'RobloxMoleReactionTraining', 'WormholeReactionTraining',
      'NumberCartReactionTraining', 'ColorTrackerReactionTraining',
      'GoalkeeperReactionTraining', 'ColorMemoryGridReactionTraining',
    ];
    for (const engine of engines) {
      expect(read(`app/admin/spomove/training/_player/components/${engine}.tsx`), engine)
        .toContain('stoppedEarly');
    }
  });
});
