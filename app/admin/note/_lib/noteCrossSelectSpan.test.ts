import { describe, expect, it } from 'vitest';
import {
  auditCrossDragContinuity,
  blocksBetween,
  buildCrossDragPairs,
  crossDragSpanFromOrder,
} from './noteCrossSelectSpan';

describe('blocksBetween', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];

  it('includes every visual row between anchor and hover', () => {
    expect(blocksBetween(order, 'a', 'e')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(blocksBetween(order, 'e', 'b')).toEqual(['b', 'c', 'd', 'e']);
    expect(blocksBetween(order, 'c', 'c')).toEqual(['c']);
  });

  it('returns empty when anchor or hover is unknown', () => {
    expect(blocksBetween(order, 'x', 'e')).toEqual([]);
    expect(blocksBetween(order, 'a', 'z')).toEqual([]);
  });
});

describe('crossDragSpanFromOrder', () => {
  it('matches blocksBetween on full visual order', () => {
    const order = ['t1', 'b1', 'b2', 'b3', 't2'];
    expect(crossDragSpanFromOrder(order, 't1', 't2')).toEqual(order);
    expect(crossDragSpanFromOrder(order, 'b3', 'b1')).toEqual(['b1', 'b2', 'b3']);
  });
});

describe('auditCrossDragContinuity', () => {
  const order = ['t1', 'b1', 'b2', 'gap', 'b3', 't2'];

  it('flags missing highlight in span (middle block skip bug)', () => {
    const highlighted = new Set(['t1', 'b1', 'b2', 'b3', 't2']);
    const report = auditCrossDragContinuity(
      order,
      't1',
      't2',
      (id) => id !== 'gap',
      (id) => highlighted.has(id),
    );
    expect(report.missingHighlights).toEqual([]);
  });

  it('detects skipped middle selectable row', () => {
    const highlighted = new Set(['t1', 'b1', 'b2', 't2']);
    const report = auditCrossDragContinuity(
      order,
      't1',
      't2',
      (id) => id !== 'gap',
      (id) => highlighted.has(id),
    );
    expect(report.missingHighlights).toEqual(['b3']);
  });

  it('ignores non-text rows in highlight check', () => {
    const report = auditCrossDragContinuity(
      order,
      'b1',
      'b3',
      (id) => id.startsWith('b'),
      (id) => id === 'b1' || id === 'b3',
    );
    expect(report.missingHighlights).toEqual(['b2']);
  });
});

describe('buildCrossDragPairs', () => {
  it('always includes first↔last and generates bounded set', () => {
    const pairs = buildCrossDragPairs(12, { maxPairs: 50 });
    expect(pairs.length).toBeGreaterThan(5);
    expect(pairs.length).toBeLessThanOrEqual(50);
    expect(pairs.some(([a, b]) => a === 0 && b === 11)).toBe(true);
    expect(pairs[0]).toEqual([0, 11]);
  });

  it('returns empty for fewer than 2 selectable rows', () => {
    expect(buildCrossDragPairs(0)).toEqual([]);
    expect(buildCrossDragPairs(1)).toEqual([]);
  });

  it('covers sliding windows', () => {
    const pairs = buildCrossDragPairs(10, { maxPairs: 100, windowSizes: [3] });
    expect(pairs.some(([a, b]) => a === 0 && b === 2)).toBe(true);
    expect(pairs.some(([a, b]) => a === 7 && b === 9)).toBe(true);
  });
});
