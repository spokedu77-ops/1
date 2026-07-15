import { describe, expect, it } from 'vitest';

import { buildSpomoveRecordDraft, buildSpomoveRecordHref, resolveSpomoveDraftFromQuery } from './spomoveRecordDraft';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';

const preset = {
  id: 'reaction-test',
  title: '반응 전환 테스트',
  axisTitle: '반응 전환',
} as OfficialSpomovePreset;

describe('SPOMOVE record draft', () => {
  it('builds an editable class-record memo with general activity estimates', () => {
    const draft = buildSpomoveRecordDraft({
      elapsedMs: 125_000,
      preset,
      status: 'done',
    });

    expect(draft).toContain('[SPOMOVE 활동 기록 초안] 반응 전환 테스트 완료');
    expect(draft).toContain('실제 움직인 시간: 약 2분');
    expect(draft).toContain('예상 소모 열량 6-12kcal');
    expect(draft).toContain('반응 전환');
    expect(draft).toContain('센서 기반 정밀 측정값이 아니라 수업 기록용 일반 추정치');
  });

  it('keeps early-ended sessions explicit and encodes the draft in the record href', () => {
    const draft = buildSpomoveRecordDraft({
      elapsedMs: 20_000,
      preset,
      status: 'ended',
    });
    const href = buildSpomoveRecordHref('123', draft);

    expect(draft).toContain('중도 종료');
    expect(href).toContain('/spokedu-master/class-record?');
    expect(href).toContain('program=123');
    expect(href).toContain('spomoveDraft=');
    expect(new URL(href, 'https://example.test').searchParams.get('spomoveDraft')).toContain('수업 기록용 일반 추정치');
  });

  it('stores oversized drafts in session storage and links by key', () => {
    const storage = new Map<string, string>();
    const sessionLike = {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key) ?? null,
    };
    const longDraft = `${'가'.repeat(2500)}\n수업 기록용 일반 추정치`;
    const href = buildSpomoveRecordHref('123', longDraft, sessionLike);
    const url = new URL(href, 'https://example.test');

    expect(url.searchParams.get('program')).toBe('123');
    expect(url.searchParams.has('spomoveDraft')).toBe(false);
    const draftKey = url.searchParams.get('spomoveDraftKey');
    expect(draftKey).toMatch(/^spokedu-master:spomove-draft:/);
    expect(resolveSpomoveDraftFromQuery(url.searchParams, sessionLike)).toContain('수업 기록용 일반 추정치');
  });
});
