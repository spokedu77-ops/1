import { describe, expect, it } from 'vitest';
import {
  buildVisualSearchRound,
  normalizeVisualSearchRounds,
  normalizeVisualSearchSpeed,
  VISUAL_SEARCH_ZONE_COLORS,
  visualSearchStage,
  visualSearchStimulusCount,
  zoneAt,
  zonesToReactTrainLanes,
} from './visualSearchModel';

describe('SPOMOVE visual-search stimulus contract', () => {
  it('keeps existing SPOMAT red/yellow/green/blue 2×2 mapping', () => {
    expect(VISUAL_SEARCH_ZONE_COLORS).toEqual(['#EF4444', '#FACC15', '#22C55E', '#3B82F6']);
    expect(zoneAt(10, 10, 100, 100)).toBe(0);
    expect(zoneAt(90, 10, 100, 100)).toBe(1);
    expect(zoneAt(10, 90, 100, 100)).toBe(2);
    expect(zoneAt(90, 90, 100, 100)).toBe(3);
    expect(zonesToReactTrainLanes([1, 2, 3, 4])).toEqual([1, 4, 3, 2]);
  });

  it('has stage transitions and prevents unlimited distraction growth', () => {
    expect([1, 2, 3, 4, 5, 10].map(visualSearchStage))
      .toEqual(['pop-out', 'pop-out', 'conjunction', 'conjunction', 'moving', 'moving']);
    expect(visualSearchStimulusCount(1)).toBe(30);
    expect(visualSearchStimulusCount(4)).toBe(60);
    expect(visualSearchStimulusCount(20)).toBe(80);
  });

  it('accepts existing half-second speed steps with optional 10-second extension', () => {
    expect(normalizeVisualSearchSpeed(1)).toBe(1);
    expect(normalizeVisualSearchSpeed(3.5)).toBe(3.5);
    expect(normalizeVisualSearchSpeed(10)).toBe(10);
    expect(normalizeVisualSearchSpeed(0)).toBe(1);
    expect(normalizeVisualSearchSpeed(99)).toBe(10);
    expect(normalizeVisualSearchSpeed(Number.NaN)).toBe(5);
  });

  it('accepts the Flanker general-count choices only', () => {
    expect([10, 20, 30, 40].map(normalizeVisualSearchRounds)).toEqual([10, 20, 30, 40]);
    expect(normalizeVisualSearchRounds(3)).toBe(20);
  });

  it.each([1, 2, 3, 4, 5, 10, 30])('creates one distinctive target in round %i', (round) => {
    const r = buildVisualSearchRound(round, 1280, 720);
    const targets = r.shapes.filter(shape => shape.isTarget);
    expect(targets).toHaveLength(1);
    const target = targets[0]!;
    expect(r.shapes[r.targetIndex]).toBe(target);
    expect(target.zone).toBe(r.targetZone);
    expect(zoneAt(target.x, target.y, 1280, 720)).toBe(r.targetZone);
    if (round < 3) {
      expect(target).toMatchObject({ color: '#EF4444', type: 'CIRCLE' });
      expect(r.shapes.filter(s => !s.isTarget).every(s => s.type === 'CIRCLE' && s.color === '#3B82F6')).toBe(true);
    } else {
      expect(target).toMatchObject({ color: '#3B82F6', type: 'SQUARE' });
      expect(r.shapes.filter(s => !s.isTarget).every(s =>
        (s.type === 'CIRCLE' && s.color === '#3B82F6') || (s.type === 'SQUARE' && s.color === '#EF4444'))).toBe(true);
    }
    for (const shape of r.shapes) {
      expect(shape.x).toBeGreaterThan(0);
      expect(shape.x).toBeLessThan(1280);
      expect(shape.y).toBeGreaterThan(0);
      expect(shape.y).toBeLessThan(720);
      expect(zoneAt(shape.x, shape.y, 1280, 720)).toBe(shape.zone);
    }
  });

  it('separates the target from the central dividers by enough margin for movement', () => {
    for (let i = 0; i < 20; i++) {
      const r = buildVisualSearchRound(12, 1280, 720);
      for (const shape of r.shapes) {
        expect(Math.abs(shape.x - 640)).toBeGreaterThan(25);
        expect(Math.abs(shape.y - 360)).toBeGreaterThan(25);
      }
    }
  });
});
