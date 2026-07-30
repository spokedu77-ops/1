import { describe, expect, it } from 'vitest';

import {
  buildSpomoveCoreKeywordTags,
  mapParticipantScaleToCoreKeyword,
  mapStartZoneToCoreKeyword,
  normalizeSpomoveCoreKeywordsList,
  parseSpomoveCoreKeywordsOverride,
  resolveSpomoveCoreKeywords,
  serializeSpomoveCoreKeywords,
} from './spomoveCoreKeywords';

describe('spomoveCoreKeywords', () => {
  it('maps operation scales/zones into the fixed 3-axis vocabulary', () => {
    expect(mapStartZoneToCoreKeyword('onMat')).toBe('매트 위');
    expect(mapStartZoneToCoreKeyword('adjacentToMat')).toBe('매트 밖');
    expect(mapStartZoneToCoreKeyword('externalSpot')).toBe('매트 밖');
    expect(mapParticipantScaleToCoreKeyword('individual')).toBe('개인');
    expect(mapParticipantScaleToCoreKeyword('pair')).toBe('그룹');
    expect(mapParticipantScaleToCoreKeyword('smallGroup')).toBe('그룹');
    expect(mapParticipantScaleToCoreKeyword('team')).toBe('그룹');
  });

  it('prefers 매트 밖 when recommended movement starts behind the mat', () => {
    const keywords = resolveSpomoveCoreKeywords({
      startZone: 'onMat',
      participantScale: 'individual',
      thinkingLevel: 'hard',
      movementStartPosition: 'behindMat',
    });
    expect(keywords).toEqual({
      startPosition: '매트 밖',
      participation: '개인',
      difficulty: '어려움',
    });
    expect(buildSpomoveCoreKeywordTags(keywords).map((tag) => tag.value)).toEqual([
      '매트 밖',
      '개인',
      '어려움',
    ]);
  });

  it('normalizes legacy freeform aliases into ordered tags', () => {
    expect(normalizeSpomoveCoreKeywordsList(['매트 바로 밖', '짝', 'easy'])).toEqual([
      '매트 밖',
      '그룹',
      '쉬움',
    ]);
    expect(parseSpomoveCoreKeywordsOverride(['소집단', '매트 위', '어려움'])).toEqual({
      startPosition: '매트 위',
      participation: '그룹',
      difficulty: '어려움',
    });
    expect(serializeSpomoveCoreKeywords({
      startPosition: '매트 위',
      participation: '개인',
      difficulty: '보통',
    })).toEqual(['매트 위', '개인', '보통']);
  });

  it('lets override win per axis while filling gaps from derived values', () => {
    expect(
      resolveSpomoveCoreKeywords({
        override: ['그룹'],
        startZone: 'onMat',
        participantScale: 'individual',
        thinkingLevel: 'easy',
        movementStartPosition: 'onMat',
      }),
    ).toEqual({
      startPosition: '매트 위',
      participation: '그룹',
      difficulty: '쉬움',
    });
  });
});
