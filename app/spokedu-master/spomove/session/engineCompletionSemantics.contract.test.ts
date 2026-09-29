import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { completionReasonToSessionState } from './sessionResultModel';

const componentDir = 'app/admin/spomove/training/_player/components';
const stopContracts = [
  ['BeatWaveReactionTraining.tsx', 'onExitRef.current({ stims: g.stims'],
  ['CamouflageReactionTraining.tsx', 'onExitRef.current({ stims: g.rounds'],
  ['ColorMemoryGridReactionTraining.tsx', 'onClick={stopGame}'],
  ['ColorTrackerReactionTraining.tsx', 'onExitRef.current({ stims: g.rounds'],
  ['GoalkeeperReactionTraining.tsx', 'onExitRef.current({ stims: g.stims'],
  ['NumberCartReactionTraining.tsx', 'onExitRef.current({ stims: g.rounds'],
  ['RelativeCompassReactionTraining.tsx', 'exitRef.current({ stims: completedRef.current'],
  ['RobloxMoleReactionTraining.tsx', 'onExit({ stims: g.stims'],
  ['RushReactionTraining.tsx', 'onExit({ stims: g.stims'],
  ['ShapeCompletionReactionTraining.tsx', 'exitRef.current({stims:completedRef.current'],
  ['TargetTrackingReactionTraining.tsx', 'onExitRef.current({ stims: completedRoundsRef.current'],
  ['VirusOutbreakReactionTraining.tsx', 'onClick={stopGame}'],
  ['VisualReactionTraining.tsx', 'onExit({ stims: g.stims'],
  ['WormholeReactionTraining.tsx', 'onExitRef.current({ stims: g.waves'],
] as const;

describe('SPOMOVE engine completion semantics', () => {
  it.each(stopContracts)('%s routes STOP through early-exit stats', (file, assertion) => {
    const source = readFileSync(`${componentDir}/${file}`, 'utf8');
    expect(source).toContain(assertion);
  });

  it('keeps natural and early terminal UI states distinct', () => {
    expect(completionReasonToSessionState('natural_complete')).toBe('done');
    expect(completionReasonToSessionState('stopped_early')).toBe('ended');
    expect(completionReasonToSessionState('cancelled')).toBe('ended');
    expect(completionReasonToSessionState('failed')).toBe('ended');
  });

  it('commits the pending stop payload only after confirmation', () => {
    const page = readFileSync('app/spokedu-master/spomove/session/page.tsx', 'utf8');
    expect(page).toContain('pendingStopPayloadRef');
    expect(page).toContain("finishSession('stopped_early', pendingStopPayloadRef.current)");
    expect(page).toContain('commitTerminalReceipt');
  });
});
