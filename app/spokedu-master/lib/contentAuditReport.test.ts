import { describe, expect, it } from 'vitest';

import {
  buildContentAuditItem,
  sortContentAuditItems,
  summarizeContentAudit,
} from './contentAuditReport';

describe('contentAuditReport', () => {
  it('scores video equipment steps and tags', () => {
    const item = buildContentAuditItem({
      curriculumId: 1,
      title: '접시콘 빙고',
      videoUrl: 'https://youtu.be/abc123',
      equipment: ['접시콘'],
      steps: ['준비', '진행'],
      tags: ['민첩성'],
      isHot: true,
      displayOrder: 1,
    });
    expect(item.pass).toBe(true);
    expect(item.score).toBe(4);
    expect(item.missing).toEqual([]);
  });

  it('lists missing fields for incomplete programs', () => {
    const item = buildContentAuditItem({
      curriculumId: 2,
      title: '불완전',
      videoUrl: '없음',
      equipment: [],
      steps: [],
      tags: [],
    });
    expect(item.pass).toBe(false);
    expect(item.missing).toEqual(['video', 'equipment', 'steps', 'tags']);
  });

  it('does not treat safety briefing sections as a required audit field', () => {
    const item = buildContentAuditItem({
      curriculumId: 3,
      title: '안전 섹션 없음',
      videoUrl: 'https://example.com/v.mp4',
      equipment: ['콘'],
      steps: ['1'],
      tags: ['t'],
    });
    expect(item.pass).toBe(true);
    expect(item.missing).not.toContain('safety');
    expect(item.score).toBe(4);
  });

  it('sorts hot programs first then display order', () => {
    const sorted = sortContentAuditItems([
      buildContentAuditItem({ curriculumId: 3, title: 'C', isHot: false, displayOrder: 1 }),
      buildContentAuditItem({ curriculumId: 1, title: 'A', isHot: true, displayOrder: 5 }),
      buildContentAuditItem({ curriculumId: 2, title: 'B', isHot: true, displayOrder: 2 }),
    ]);
    expect(sorted.map((item) => item.curriculumId)).toEqual([2, 1, 3]);
  });

  it('summarizes pass fail and missing counts', () => {
    const items = [
      buildContentAuditItem({
        curriculumId: 1,
        title: 'Complete',
        videoUrl: 'https://example.com/v.mp4',
        equipment: ['콘'],
        steps: ['1'],
        tags: ['t'],
      }),
      buildContentAuditItem({ curriculumId: 2, title: 'Empty' }),
    ];
    const summary = summarizeContentAudit(items);
    expect(summary.passCount).toBe(1);
    expect(summary.failCount).toBe(1);
    expect(summary.byMissing.video).toBe(1);
    expect(summary.byMissing).not.toHaveProperty('safety');
  });
});
