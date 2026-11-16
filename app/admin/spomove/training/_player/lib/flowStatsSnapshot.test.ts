import { describe, expect, it } from 'vitest';
import { FlowEngine } from '../flow-lab/engine/FlowEngine';

describe('Flow execution snapshot ownership', () => {
  it('detaches terminal records from later engine changes and consumer writes', () => {
    const state = { stats: { stagesCompleted: 0, totalSec: 0, colorGatePassCount: 1, colorGateColorCounts: { red: 0, yellow: 1, green: 0, blue: 0 } }, sessionSec: 6.5 };
    const engine = state as unknown as FlowEngine;
    const first = FlowEngine.prototype.getStatsSnapshot.call(engine);
    expect(first.totalSec).toBe(6.5);
    first.colorGateColorCounts!.yellow = 99;
    expect(state.stats.colorGateColorCounts.yellow).toBe(1);
    state.stats.colorGateColorCounts.red = 1;
    state.stats.colorGatePassCount = 2;
    expect(first.colorGatePassCount).toBe(1);
    expect(FlowEngine.prototype.getStatsSnapshot.call(engine).colorGateColorCounts).toEqual({ red: 1, yellow: 1, green: 0, blue: 0 });
  });
});
