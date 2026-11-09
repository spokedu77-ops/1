import { describe, expect, it } from 'vitest';
import { ADMIN_TRAINING_ROUNDS, normalizeAdminTrainingRounds } from './adminTrainingRounds';
import { ADMIN_SEQUENCE_OPTIONS } from '../constants';
import { describeSessionVolume, settingsToTrainingResultConfig } from './trainingResultSummary';
import { normalizeSearchReps, getVisualSearchShapeCount, isSearchSymbolOnlyRound } from './visualSearch';
import { normalizeNumberReaderReps } from './movingNumberReader';
import { normalizeNumberCartRounds, normalizeColorTrackerRounds } from './roundNormalization';

describe('admin round selections and preserved public contracts', () => {
  it.each(ADMIN_TRAINING_ROUNDS)('carries %s rounds through settings, applicable engines and results', count => {
    expect(normalizeAdminTrainingRounds(count)).toBe(count);
    expect(normalizeSearchReps(count)).toBe(count);
    expect(normalizeNumberReaderReps(count)).toBe(count);
    expect(normalizeColorTrackerRounds(count)).toBe(count);
    const cfg = settingsToTrainingResultConfig({ mode: 'spatial', level: 7, adminRounds: true, speed: 1, timeMode: 'reps', duration: 60, targetReps: count });
    expect(describeSessionVolume(cfg)).toBe(`${count}라운드`);
    expect(getVisualSearchShapeCount(2, count, count)).toBe(60);
    expect(isSearchSymbolOnlyRound(1, Math.floor(count / 2), count)).toBe(true);
    expect(isSearchSymbolOnlyRound(1, Math.floor(count / 2) + 1, count)).toBe(false);
  });
  it('removes only the admin hard choice and retains original public normalization', () => {
    expect(ADMIN_SEQUENCE_OPTIONS.map(option => option.id)).toEqual([3, 5]);
    expect(normalizeAdminTrainingRounds(30)).toBe(20);
    expect(normalizeSearchReps(40)).toBe(40);
    expect(normalizeNumberReaderReps(30)).toBe(30);
    expect(normalizeNumberCartRounds(25)).toBe(25);
    expect(normalizeColorTrackerRounds(30)).toBe(30);
  });
});
