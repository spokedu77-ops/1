import { describe, expect, it } from 'vitest';

import {
  buildContentAuditItem,
  extractSafetyNotes,
  sortContentAuditItems,
  summarizeContentAudit,
} from './contentAuditReport';

describe('contentAuditReport', () => {
  it('scores video equipment safety steps and tags', () => {
    const item = buildContentAuditItem({
      curriculumId: 1,
      title: '접시콘 빙고',
      videoUrl: 'https://youtu.be/abc123',
      equipment: ['접시콘'],
      steps: ['준비', '진행'],
      tags: ['민첩성'],
      briefingNotes: ['[안전 포인트]', '미끄럼 주의'].join('\n'),
      isHot: true,
      displayOrder: 1,
    });
    expect(item.pass).toBe(true);
    expect(item.score).toBe(5);
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
      briefingNotes: '팁만 있음',
    });
    expect(item.pass).toBe(false);
    expect(item.missing).toEqual(['video', 'equipment', 'safety', 'steps', 'tags']);
  });

  it('extracts safety notes from briefing sections', () => {
    expect(
      extractSafetyNotes(['[안전 유의사항]', '간격 유지', '[운영 팁]', '빠르게'].join('\n')),
    ).toEqual(['간격 유지']);
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
        briefingNotes: '[안전]\n주의',
      }),
      buildContentAuditItem({ curriculumId: 2, title: 'Empty' }),
    ];
    const summary = summarizeContentAudit(items);
    expect(summary.passCount).toBe(1);
    expect(summary.failCount).toBe(1);
    expect(summary.byMissing.video).toBe(1);
  });
});
