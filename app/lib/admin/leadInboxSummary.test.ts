import { describe, expect, it } from 'vitest';
import {
  extractPrivateField,
  parseConsultSubject,
  resolveLeadRoute,
  summarizeLeadRow,
} from './leadInboxSummary';

const LEGACY_PRIVATE_CONTENT = [
  '안녕하세요. SPOKEDU 프리미엄 방문 체육 상담을 의뢰합니다.',
  '',
  '1. 학습자 정보 : 7세 / 남 / 최주하',
  '2. 연락처(휴대폰) : 010-8986-1261',
  '3. 희망 종목 : 야구 · 축구 · 농구',
  '4. 방문 지역/장소 : 서울시 도봉구 창동 근처',
  '5. 가능 시간대 : 토, 일 오전',
  '6. 전하고 싶은 말 : 수업 장소를 어떻게 정해야 하는지 문의',
].join('\n');

describe('leadInboxSummary content fallback', () => {
  it('extracts private fields from legacy numbered content', () => {
    expect(extractPrivateField(LEGACY_PRIVATE_CONTENT, '방문 지역/장소')).toBe(
      '서울시 도봉구 창동 근처',
    );
    expect(extractPrivateField(LEGACY_PRIVATE_CONTENT, '가능 시간대')).toBe('토, 일 오전');
    expect(extractPrivateField(LEGACY_PRIVATE_CONTENT, '희망 종목')).toBe('야구 · 축구 · 농구');
    expect(extractPrivateField(LEGACY_PRIVATE_CONTENT, '전하고 싶은 말')).toContain('장소');
  });

  it('falls back to content when selection region/schedule empty', () => {
    const summary = summarizeLeadRow({
      lead_route: 'private',
      consult_type: 'tutoring',
      private_start_direction: 'sport-prep',
      private_preferred_format: 'undecided',
      lead_context: {
        schemaVersion: 1,
        route: 'private',
        acquisition: { entrySurface: 'direct' },
        selection: {
          route: 'private',
          preferredFormat: 'undecided',
        },
        ctaIntentId: 'private_fit_consult',
      },
      content: LEGACY_PRIVATE_CONTENT,
    });

    expect(summary.route).toBe('private');
    expect(summary.facts.location).toBe('도봉구 창동');
    expect(summary.facts.preferredTime).toBe('토·일 오전');
    expect(summary.tags).toContain('구기종목');
    expect(summary.tags).toContain('장소 문의');
  });

  it('hides meaningless defaults from facts and tags', () => {
    const summary = summarizeLeadRow({
      lead_route: 'private',
      consult_type: 'tutoring',
      private_preferred_format: 'undecided',
      lead_context: {
        schemaVersion: 1,
        route: 'private',
        acquisition: { entrySurface: 'home' },
        selection: {
          route: 'private',
          preferredFormat: 'undecided',
          instructorPreference: '별도 희망 없음',
          region: '',
          schedule: '',
        },
        ctaIntentId: 'private_fit_consult',
      },
      content: '1. 학습자 정보 : 테스트\n7. 방문 지역/장소 : [정보 미기재]\n8. 가능 시간대 : [정보 미기재]',
    });
    expect(summary.facts.location).toBeUndefined();
    expect(summary.facts.preferredTime).toBeUndefined();
    expect(summary.facts.format).toBeUndefined();
    expect(summary.facts.coachGender).toBeUndefined();
  });
});

describe('resolveLeadRoute', () => {
  it('prefers lead_context.route over lead_route column', () => {
    expect(
      resolveLeadRoute({
        lead_route: 'curriculum',
        lead_context: {
          schemaVersion: 1,
          route: 'private',
          acquisition: { entrySurface: 'direct' },
          selection: { route: 'private' },
          ctaIntentId: 'private_fit_consult',
        },
        consult_type: 'center',
        content: '[기관 맞춤 제안서 요청]',
      }),
    ).toBe('private');
  });

  it('falls back from consult_type and content markers', () => {
    expect(resolveLeadRoute({ consult_type: 'tutoring', content: '' })).toBe('private');
    expect(resolveLeadRoute({ consult_type: 'center', content: '' })).toBe('dispatch');
    expect(resolveLeadRoute({ content: '[커리큘럼 문의]' })).toBe('curriculum');
    expect(resolveLeadRoute({ content: '[기관 맞춤 제안서 요청]' })).toBe('dispatch');
  });
});

describe('parseConsultSubject', () => {
  it('splits age/gender/name style parent_name', () => {
    const s = parseConsultSubject({ parent_name: '7세 / 남 / 최주하', child_age: null });
    expect(s.name).toBe('최주하');
    expect(s.meta).toContain('7세');
    expect(s.meta).toContain('남');
  });
});

describe('legacy CRM compatibility shapes', () => {
  it('A: structured private envelope', () => {
    const summary = summarizeLeadRow({
      lead_route: 'private',
      consult_type: 'tutoring',
      private_start_direction: 'confidence',
      private_preferred_format: 'one-to-one',
      lead_context: {
        schemaVersion: 1,
        route: 'private',
        acquisition: { entrySurface: 'home', utmSource: 'naver' },
        selection: {
          route: 'private',
          startDirection: 'confidence',
          preferredFormat: 'one-to-one',
          region: '마포',
          schedule: '평일 저녁',
          sport: '축구',
        },
        ctaIntentId: 'private_fit_consult',
      },
      content: '',
    });
    expect(summary.route).toBe('private');
    expect(summary.facts.location).toContain('마포');
    expect(summary.facts.preferredTime).toContain('평일');
    expect(summary.subtitle).toBeTruthy();
  });

  it('B: structured dispatch envelope', () => {
    const summary = summarizeLeadRow({
      lead_route: 'dispatch',
      consult_type: 'center',
      lead_context: {
        schemaVersion: 1,
        route: 'dispatch',
        acquisition: { entrySurface: 'programs' },
        selection: {
          route: 'dispatch',
          programs: ['월간 스포츠'],
          targetAges: ['초등'],
          organizationName: '테스트센터',
          location: '서울 광진구',
          headcount: '20',
        },
        ctaIntentId: 'dispatch_proposal',
      },
      content: '',
    });
    expect(summary.route).toBe('dispatch');
    expect(summary.facts.location).toContain('광진');
    expect(summary.tags.some((t) => t.includes('월간'))).toBe(true);
  });

  it('C: consult_type only (no lead_context)', () => {
    expect(resolveLeadRoute({ consult_type: 'tutoring', content: '문의' })).toBe('private');
    expect(resolveLeadRoute({ consult_type: 'center', content: '문의' })).toBe('dispatch');
  });

  it('D: region/time only in content', () => {
    const summary = summarizeLeadRow({
      consult_type: 'tutoring',
      content: [
        '4. 방문 지역/장소 : 서울시 도봉구 창동 근처',
        '5. 가능 시간대 : 토, 일 오전',
      ].join('\n'),
    });
    expect(summary.facts.location).toBe('도봉구 창동');
    expect(summary.facts.preferredTime).toBe('토·일 오전');
  });

  it('E: source_lead_id dispatch still routes and summarizes from content', () => {
    const summary = summarizeLeadRow({
      consult_type: 'center',
      lead_route: null,
      content: [
        '[기관 맞춤 제안서 요청]',
        '기관명/센터명: 레거시기관',
        '기관 소재지: 부산 해운대',
        '희망 프로그램: 스포무브',
        'source_lead_id: abc-123',
      ].join('\n'),
    });
    expect(summary.route).toBe('dispatch');
    expect(summary.facts.location).toContain('해운대');
  });
});
