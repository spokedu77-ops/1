import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from '../officialSpomovePresets';
import { canReproduceSpomoveSameSettings } from './canReproduceSpomoveSameSettings';
import type { RecentProgramActivity } from '../../lib/recentProgramActivity';
import { buildSpomoveSessionSnapshotV2 } from '../operations/operationSessionHelpers';
import { buildDeclaredOperation } from '../operations/operationResolve';

describe('canReproduceSpomoveSameSettings', () => {
  const preset = findOfficialSpomovePreset('reaction-cognition-full-color-03')!;

  it('rejects legacy recent without Snapshot V2', () => {
    const activity: RecentProgramActivity = {
      ownerId: 'id:x',
      programId: preset.id,
      programTitle: 'color',
      action: 'spomove_started',
      occurredAt: new Date().toISOString(),
      baseMovement: 'twoLegJump',
      limbRule: 'free',
      cueSeconds: 3,
    };
    expect(canReproduceSpomoveSameSettings(activity, preset)).toBe(false);
  });

  it('accepts Snapshot V2 with valid operation', () => {
    const operation = buildDeclaredOperation(
      'immediateResponse',
      preset.recommendedOperation,
    );
    const snapshot = buildSpomoveSessionSnapshotV2({
      presetId: preset.id,
      movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
      operationLayerStatus: 'ready',
      operation,
      cueSeconds: 3,
    });
    const activity: RecentProgramActivity = {
      ownerId: 'id:x',
      programId: preset.id,
      programTitle: 'color',
      action: 'spomove_started',
      occurredAt: new Date().toISOString(),
      cueSeconds: 3,
      spomoveSnapshot: snapshot,
    };
    expect(canReproduceSpomoveSameSettings(activity, preset)).toBe(true);
  });
});
