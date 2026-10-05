import { describe, expect, it } from 'vitest';
import {
  canUseClassTool,
  CLASS_TOOL_IDS,
  FREE_CLASS_TOOL_IDS,
  ROSTER_CLASS_TOOL_IDS,
} from './classTools';

describe('MASTER class-tool plan access', () => {
  it('opens exactly the three non-roster tools for Free', () => {
    expect(FREE_CLASS_TOOL_IDS).toEqual(['stopwatch', 'timer', 'scoreboard']);
    expect(ROSTER_CLASS_TOOL_IDS).toEqual(['picker', 'teams', 'order', 'tournament', 'ladder']);
    expect(CLASS_TOOL_IDS.filter((id) => canUseClassTool(id, false))).toEqual(FREE_CLASS_TOOL_IDS);
  });

  it('opens all eight tools for Lite and Premium roster capability', () => {
    expect(CLASS_TOOL_IDS.every((id) => canUseClassTool(id, true))).toBe(true);
  });
});
