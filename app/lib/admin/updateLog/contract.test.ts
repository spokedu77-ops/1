import { describe, expect, it } from 'vitest';
import { assertWorkKey, buildProjectContext, formatWorkLine, validateWorkWrite, type WorkEvent } from './contract';

function event(partial: Partial<WorkEvent> & Pick<WorkEvent, 'workKey' | 'status' | 'summary' | 'occurredAt'>): WorkEvent {
  return {
    id: partial.workKey + partial.occurredAt,
    project: '홈페이지',
    createdAt: partial.occurredAt,
    details: '',
    sourceType: 'manual',
    sourceUrl: '',
    verificationNote: partial.status === 'verified' ? '로컬 화면 확인' : '',
    ...partial,
  };
}

describe('update log contract', () => {
  it('matches production limits and preserves existing keys without lossy normalization', () => {
    expect(assertWorkKey(' Task/한글 ID ')).toBe('Task/한글 ID');
    expect(validateWorkWrite({ project: 'P', summary: '가'.repeat(300), status: 'reported', sourceType: 'chatgpt' })).toBeNull();
    expect(validateWorkWrite({ project: 'P', summary: '가'.repeat(301), status: 'reported' })).toBeTruthy();
    expect(validateWorkWrite({ project: 'P', summary: '수정', status: '완료 보고' })).toBeTruthy();
    expect(validateWorkWrite({ project: 'P', summary: '수정', status: 'reported', sourceType: 'arbitrary' })).toBeTruthy();
  });
  it('orders by occurred_at rather than insert time and keeps approved unfinished work', () => {
    const context = buildProjectContext([
      event({ id: 'b', workKey: 'same', status: 'approved', summary: '승인', occurredAt: '2026-11-17T01:00:00Z' }),
      event({ id: 'a', workKey: 'same', status: 'proposed', summary: '제안', occurredAt: '2026-11-17T01:00:00Z', createdAt: '2026-11-18T01:00:00Z' }),
    ]);
    expect(context.works[0].latest.status).toBe('approved');
    expect(context.unresolved).toHaveLength(1);
  });
  it('rejects verified status without verificationNote and keeps reported distinct', () => {
    expect(validateWorkWrite({ project: '홈페이지', summary: '헤더 수정', status: 'verified' })).toContain('검증 근거');
    expect(validateWorkWrite({ project: '홈페이지', summary: '헤더 수정', status: 'reported' })).toBeNull();
    expect(validateWorkWrite({ project: '홈페이지', summary: '헤더 검증', status: 'verified', verificationNote: '데스크톱·모바일 확인' })).toBeNull();
  });

  it('formats a Seoul date line and links status changes on the same work', () => {
    expect(formatWorkLine('2026-11-17T00:30:00.000Z', '홈페이지', '모바일 헤더 줄바꿈 수정', 'reported'))
      .toBe('2026.11.17 | 홈페이지 | 모바일 헤더 줄바꿈 수정 | 완료 보고');
    const context = buildProjectContext([
      event({ workKey: 'home-header', status: 'approved', summary: '모바일 헤더를 한 줄로 유지', occurredAt: '2026-11-17T01:00:00.000Z' }),
      event({ workKey: 'home-header', status: 'reported', summary: '모바일 헤더 줄바꿈 수정', occurredAt: '2026-11-17T02:00:00.000Z' }),
      event({ workKey: 'home-header', status: 'verified', summary: '모바일 헤더 줄바꿈 검증', occurredAt: '2026-11-17T03:00:00.000Z', verificationNote: '화면 확인' }),
      event({ workKey: 'home-nav', status: 'blocked', summary: '메뉴 겹침', occurredAt: '2026-11-17T04:00:00.000Z' }),
    ], '모바일 헤더 메뉴 겹침을 다시 수정');
    expect(context.works).toHaveLength(2);
    expect(context.works[0].history).toHaveLength(1);
    expect(context.verified).toHaveLength(1);
    expect(context.reported).toHaveLength(0);
    expect(context.approved.map(item => item.summary)).toEqual(['모바일 헤더를 한 줄로 유지']);
    expect(context.unresolved.map(item => item.workKey)).toEqual(['home-nav']);
    expect(context.possibleConflicts.some(item => item.workKey === 'home-nav')).toBe(true);
  });
});
