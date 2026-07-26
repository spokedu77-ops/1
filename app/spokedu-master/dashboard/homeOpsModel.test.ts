import { describe, expect, it } from 'vitest';

import type { RecentProgramActivity } from '../lib/recentProgramActivity';
import type { Program } from '../types';
import {
  buildEmptyHomeAnchor,
  buildHomeQueue,
  getHomeAnchorIntensity,
  hasMeaningfulPrepDraft,
  hasMeaningfulReportDraft,
  resolveHomeAnchor,
  shouldEmphasizePrepCandidates,
} from './homeOpsModel';

function makeProgram(id: string, title: string): Program {
  return {
    id,
    title,
    category: '조절형',
    grade: '초등',
    space: '체육관',
    description: '',
    steps: [],
    equipment: [],
    tags: [],
    colors: ['#000', '#111', '#222', '#333'],
    isPro: false,
    isNew: false,
  };
}

const emptyToday = null;

describe('homeOpsModel', () => {
  const programsById = new Map([
    ['p1', makeProgram('p1', '마커 멀리 뛰기')],
    ['p2', makeProgram('p2', '접시콘 빙고')],
  ]);

  it('prefers class-record draft over report and spomove', () => {
    const spomove: RecentProgramActivity = {
      ownerId: 'id:1',
      programId: 'reactTrain',
      programTitle: '반응 훈련',
      action: 'spomove_started',
      occurredAt: '2026-07-26T01:00:00.000Z',
    };
    const anchor = resolveHomeAnchor({
      classRecordDraft: { selectedProgramId: 'p1', classMemo: '관찰 중' },
      reportDraft: { programId: 'p2', note: '안내문 초안' },
      quickRecordDraft: { programId: 'p2', memo: '빠른기록' },
      todayLesson: { programId: 'p2', programTitle: '접시콘 빙고' },
      recentSpomove: spomove,
      programsById,
    });
    expect(anchor.kind).toBe('record_draft');
    expect(anchor.primary.label).toBe('이어서 기록');
    expect(anchor.title).toBe('마커 멀리 뛰기');
  });

  it('prefers today_lesson over spomove and empty', () => {
    const anchor = resolveHomeAnchor({
      classRecordDraft: null,
      reportDraft: null,
      quickRecordDraft: null,
      todayLesson: { programId: 'p1', programTitle: '마커 멀리 뛰기' },
      recentSpomove: {
        ownerId: 'id:1',
        programId: 'reactTrain',
        programTitle: '반응 훈련',
        action: 'spomove_started',
        occurredAt: '2026-07-26T01:00:00.000Z',
      },
      programsById,
    });
    expect(anchor.kind).toBe('today_lesson');
    expect(anchor.status).toBe('오늘');
    expect(anchor.primary.label).toBe('준비');
    expect(anchor.secondary.label).toBe('기록');
    expect(anchor.title).toBe('마커 멀리 뛰기');
    expect(getHomeAnchorIntensity('today_lesson')).toBe('max');
  });

  it('uses SPOMOVE only as fallback when stronger signals are absent', () => {
    const anchor = resolveHomeAnchor({
      classRecordDraft: null,
      reportDraft: null,
      quickRecordDraft: null,
      todayLesson: emptyToday,
      recentSpomove: {
        ownerId: 'id:1',
        programId: 'reactTrain',
        programTitle: '반응 훈련',
        action: 'spomove_started',
        occurredAt: '2026-07-26T01:00:00.000Z',
      },
      programsById,
    });
    expect(anchor.kind).toBe('spomove');
    expect(anchor.primary.label).toBe('다시 실행');
  });

  it('builds empty helper state without command tone', () => {
    const empty = buildEmptyHomeAnchor();
    expect(empty.status).toContain('오늘 이어갈 수업을 고르세요');
    expect(empty.status).not.toContain('정하세요');
    expect(empty.status).not.toContain('지정');
    expect(shouldEmphasizePrepCandidates(empty)).toBe(true);
  });

  it('dedupes queue against the current anchor', () => {
    const input = {
      classRecordDraft: { selectedProgramId: 'p1', classMemo: '관찰' },
      reportDraft: { programId: 'p2', generated: '본문' },
      quickRecordDraft: null,
      todayLesson: emptyToday,
      recentSpomove: null,
      programsById,
    };
    const anchor = resolveHomeAnchor(input);
    const queue = buildHomeQueue(input, anchor);
    expect(anchor.kind).toBe('record_draft');
    expect(queue.some((item) => item.dedupeKey === anchor.dedupeKey)).toBe(false);
    expect(queue.some((item) => item.label === '안내문 초안')).toBe(true);
  });

  it('rejects weak prep/report drafts', () => {
    expect(hasMeaningfulReportDraft({ programId: 'p1' })).toBe(false);
    expect(hasMeaningfulPrepDraft({ programId: 'p1' })).toBe(false);
    expect(hasMeaningfulPrepDraft({ programId: 'p1', memo: '6세반은 2단계' })).toBe(true);
  });

  it('uses max intensity only for strong ops anchors', () => {
    expect(getHomeAnchorIntensity('record_draft')).toBe('max');
    expect(getHomeAnchorIntensity('report_draft')).toBe('max');
    expect(getHomeAnchorIntensity('prep_draft')).toBe('max');
    expect(getHomeAnchorIntensity('today_lesson')).toBe('max');
    expect(getHomeAnchorIntensity('spomove')).toBe('mid');
    expect(getHomeAnchorIntensity('empty')).toBe('mid');
  });
});
