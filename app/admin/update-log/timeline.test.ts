import { describe, expect, it } from 'vitest';
import type { WorkEvent } from '@/app/lib/admin/updateLog/contract';
import { collectTimeline, filterTimeline, groupTimelineDays, timelineStats } from './timeline';
const event = (id: string, workKey: string, status: WorkEvent['status'], occurredAt: string, extra: Partial<WorkEvent> = {}): WorkEvent => ({ id, workKey, status, occurredAt, createdAt: occurredAt, project: 'LAB', summary: `작업 ${id}`, details: '', sourceType: 'codex', sourceUrl: '', verificationNote: '', ...extra });
describe('update log timeline', () => {
  it('groups all events by project plus key, deduplicates and only then filters latest state', () => {
    const old = event('1', 'same', 'reported', '2026-11-17T12:00:00Z');
    const works = collectTimeline([old, event('2', 'same', 'verified', '2026-11-18T00:00:00Z'), old, event('3', 'same', 'blocked', '2026-11-18T01:00:00Z', { project: '홈페이지' })]);
    expect(works).toHaveLength(2);
    expect(works[1].history.map(item => item.status)).toEqual(['reported', 'verified']);
    expect(filterTimeline(works, '', 'reported', '')).toHaveLength(0);
    expect(filterTimeline(works, 'LAB', 'verified', '')).toHaveLength(1);
  });
  it('uses event time, microseconds and stable IDs rather than created time or response order', () => {
    const works = collectTimeline([
      event('z', 'one', 'reported', '2026-11-17T01:00:00.123450+00:00', { createdAt: '2026-11-19T00:00:00Z' }),
      event('a', 'one', 'verified', '2026-11-17T01:00:00.123451Z'),
      event('b', 'two', 'blocked', '2026-11-17T01:00:00.123451Z'),
    ]);
    expect(works.map(work => work.latest.id)).toEqual(['b', 'a']);
    expect(works[1].history.map(item => item.id)).toEqual(['z', 'a']);
  });
  it('groups latest work dates in Seoul, with recent dates first', () => {
    const works = collectTimeline([event('a', 'one', 'verified', '2026-11-17T14:59:00Z'), event('b', 'two', 'in_progress', '2026-11-17T15:01:00Z')]);
    expect(groupTimelineDays(works).map(group => group.date)).toEqual(['2026.11.18', '2026.11.17']);
  });
  it('counts unique latest work and separates in-progress from unverified reports', () => {
    const works = collectTimeline([event('a', 'one', 'in_progress', '2026-11-17T01:00:00Z'), event('b', 'one', 'verified', '2026-11-17T02:00:00Z'), event('c', 'two', 'reported', '2026-11-17T03:00:00Z'), event('d', 'three', 'blocked', '2026-11-17T04:00:00Z'), event('e', 'four', 'in_progress', '2026-11-17T05:00:00Z'), event('f', 'five', 'proposed', '2026-11-17T06:00:00Z')]);
    expect(timelineStats(works)).toEqual({ total: 5, inProgress: 1, blocked: 1 });
    expect(filterTimeline(works, '', 'blocked', '').map(work => work.latest.workKey)).toEqual(['three']);
  });
  it('excludes resolved problems while preserving all history', () => {
    const works = collectTimeline([
      event('a', 'resolved', 'blocked', '2026-11-17T01:00:00Z'),
      event('b', 'resolved', 'reported', '2026-11-17T02:00:00Z'),
      event('c', 'resolved', 'verified', '2026-11-17T03:00:00Z'),
    ]);
    expect(timelineStats(works)).toEqual({ total: 1, inProgress: 0, blocked: 0 });
    expect(filterTimeline(works, '', 'blocked', '')).toEqual([]);
    expect(filterTimeline(works, '', 'verified', '')).toEqual(works);
    expect(works[0].history.map(item => item.status)).toEqual(['blocked', 'reported', 'verified']);
  });
  it('includes only blocked among all six statuses without reclassifying proposals or reports', () => {
    const statuses = ['proposed', 'approved', 'in_progress', 'reported', 'verified', 'blocked'] as const;
    const works = collectTimeline(statuses.map((status, index) => event(String(index), status, status, '2026-11-17T01:00:00Z')));
    expect(timelineStats(works)).toEqual({ total: 6, inProgress: 1, blocked: 1 });
    expect(filterTimeline(works, '', 'blocked', '').map(work => work.latest.status)).toEqual(['blocked']);
    expect(filterTimeline(works, '', 'reported', '').map(work => work.latest.status)).toEqual(['reported']);
    expect(filterTimeline(works, '', 'verified', '').map(work => work.latest.status)).toEqual(['verified']);
    expect(works.find(work => work.latest.workKey === 'proposed')?.latest.status).toBe('proposed');
    expect(works.find(work => work.latest.workKey === 'approved')?.latest.status).toBe('approved');
    const pending = works.filter(work => ['proposed', 'approved', 'reported'].includes(work.latest.status));
    expect(timelineStats(pending)).toEqual({ total: 3, inProgress: 0, blocked: 0 });
  });
  it('searches recorded history, evidence and details without searching raw task IDs', () => {
    const works = collectTimeline([event('a', 'SECRET-ID', 'approved', '2026-11-17T01:00:00Z', { details: '모바일 메뉴 승인' }), event('b', 'SECRET-ID', 'verified', '2026-11-17T02:00:00Z', { verificationNote: 'CHROME 390px' })]);
    expect(filterTimeline(works, '', '', '메뉴 승인')).toHaveLength(1);
    expect(filterTimeline(works, '', '', 'chrome')).toHaveLength(1);
    expect(filterTimeline(works, '', '', 'SECRET-ID')).toHaveLength(0);
    expect(filterTimeline(works, '홈페이지', '', '')).toHaveLength(0);
    expect(filterTimeline(works, '', '', '없는 내용')).toHaveLength(0);
  });
  it('supports an empty log without inventing work', () => {
    expect(collectTimeline([])).toEqual([]);
    expect(timelineStats([])).toEqual({ total: 0, inProgress: 0, blocked: 0 });
  });
});
