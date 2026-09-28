import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from '../officialSpomovePresets';
import { canReproduceSpomoveSameSettings, recentSpomoveSessionOptions } from './canReproduceSpomoveSameSettings';
import type { RecentProgramActivity } from '../../lib/recentProgramActivity';
import { buildSpomoveSessionSnapshotV2 } from '../operations/operationSessionHelpers';
import { buildDeclaredOperation } from '../operations/operationResolve';
import { buildRecentConfigSnapshot } from '../session/runtimeContinuity';

describe('canReproduceSpomoveSameSettings', () => {
  const preset = findOfficialSpomovePreset('reaction-cognition-full-color-03')!;

  it('rejects legacy recent without Snapshot V2', () => {
    const activity: RecentProgramActivity = {
      ownerId: 'id:x',
      programId: preset.id,
      programTitle: 'color',
      action: 'spomove_started',
      occurredAt: new Date().toISOString(),
      cueSeconds: 3,
    };
    expect(canReproduceSpomoveSameSettings(activity, preset)).toBe(false);
  });

  it('accepts Snapshot V2 with valid operation without runtime movement', () => {
    const operation = buildDeclaredOperation(
      'immediateResponse',
      preset.recommendedOperation,
    );
    const snapshot = buildSpomoveSessionSnapshotV2({
      presetId: preset.id,
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

  it('migrates valid Snapshot V2 to safe query options with defaults supplied by the preset', () => {
    const operation = buildDeclaredOperation('immediateResponse', preset.recommendedOperation);
    const activity = {
      ownerId: 'id:x', programId: preset.id, programTitle: 'color', action: 'spomove_started', occurredAt: new Date().toISOString(),
      spomoveSnapshot: buildSpomoveSessionSnapshotV2({ presetId: preset.id, operationLayerStatus: 'ready', operation, cueSeconds: 3 }),
    } satisfies RecentProgramActivity;
    expect(recentSpomoveSessionOptions(activity, preset)).toMatchObject({ entry: 'start', cueSeconds: 3, operation });
  });

  it('reproduces every user-controlled V3 setting and excludes run results', () => {
    const operation = buildDeclaredOperation('immediateResponse', preset.recommendedOperation);
    const snapshot = buildRecentConfigSnapshot({
      presetId: preset.id,
      cueSeconds: 4,
      movement: { baseMovement: 'handTouch', limbRule: 'sameSide' },
      operationLayerStatus: 'ready',
      operation,
      launchMode: 'mobile',
      soundEnabled: false,
      bgmPath: 'music/test.mp3',
      diveEnvironmentTheme: 'theme2',
      sportsArenaFeatures: ['side', 'duck'],
      flowDuration: 25,
      flowIncludeBonus: false,
    });
    const activity = {
      ownerId: 'id:x', programId: preset.id, programTitle: 'color', action: 'spomove_started', occurredAt: new Date().toISOString(), spomoveSnapshot: snapshot,
    } satisfies RecentProgramActivity;
    expect(canReproduceSpomoveSameSettings(activity, preset)).toBe(true);
    expect(recentSpomoveSessionOptions(activity, preset)).toMatchObject({
      cueSeconds: 4,
      movement: snapshot.movement,
      mode: 'mobile',
      soundEnabled: false,
      bgmPath: 'music/test.mp3',
      diveEnvironmentTheme: 'theme2',
      sportsArenaFeatures: ['side', 'duck'],
      flowDuration: 25,
      flowIncludeBonus: false,
    });
  });

  it('rejects deleted presets and invalid V3 movement/options', () => {
    const snapshot = buildRecentConfigSnapshot({
      presetId: preset.id,
      cueSeconds: 3,
      movement: { baseMovement: 'twoLegJump', limbRule: 'oppositeSide' },
      operationLayerStatus: 'legacyDisabled',
      launchMode: 'mobile',
      soundEnabled: true,
      bgmPath: '',
      diveEnvironmentTheme: 'space',
      sportsArenaFeatures: [],
      flowDuration: 20,
      flowIncludeBonus: true,
    });
    const activity = {
      ownerId: 'id:x', programId: preset.id, programTitle: 'color', action: 'spomove_started', occurredAt: new Date().toISOString(), spomoveSnapshot: snapshot,
    } satisfies RecentProgramActivity;
    expect(canReproduceSpomoveSameSettings(activity, null)).toBe(false);
    expect(canReproduceSpomoveSameSettings(activity, preset)).toBe(false);
  });
});
