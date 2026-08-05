import { describe, expect, it } from 'vitest';
import {
  isStrictNoteTextExtension,
  shouldIgnoreRegressiveContentPatch,
} from './noteContentAuthority';

describe('noteContentAuthority (ZERO LOSS shared predicate)', () => {
  it('rejects equal-length rewrite without matching base (1400 vs 1100)', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '9.1 2차 기성금 요청 (찾동체) : 1400만원' },
      { text: '9.1 2차 기성금 요청 (찾동체) : 1100만원' },
    )).toBe(true);
  });

  it('allows equal-length rewrite when base matches current', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '9.1 2차 기성금 요청 (찾동체) : 1100만원' },
      { text: '9.1 2차 기성금 요청 (찾동체) : 1400만원' },
      { text: '9.1 2차 기성금 요청 (찾동체) : 1100만원' },
    )).toBe(false);
  });

  it('rejects stale patch when base no longer matches server', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'latest checklist text' },
      { text: 'older delayed edit' },
      { text: 'old checklist text' },
    )).toBe(true);
  });

  it('rejects short-prefix false extension without base', () => {
    expect(isStrictNoteTextExtension('A', 'A server')).toBe(false);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'A' },
      { text: 'A server' },
    )).toBe(true);
  });

  it('allows strict extension without base when local is long enough', () => {
    expect(isStrictNoteTextExtension('hello world', 'hello world!')).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'hello world' },
      { text: 'hello world!' },
    )).toBe(false);
  });

  it('rejects empty wipe of protectable text without matching base', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'saved callout body', html: '<p>saved callout body</p>' },
      { text: '', html: '<p></p>' },
    )).toBe(true);
  });

  it('allows intentional clear when base matches', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'saved callout body' },
      { text: '', html: '<p></p>' },
      { text: 'saved callout body' },
    )).toBe(false);
  });
});
