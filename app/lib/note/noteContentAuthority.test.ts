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

  it('rejects silent todo uncheck without matching base (all documents)', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '8.5 야간 가족 클래스', checked: true },
      { text: '8.5 야간 가족 클래스', checked: false },
    )).toBe(true);
  });

  it('allows intentional todo check toggle when base matches current', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '8.5 야간 가족 클래스', checked: false },
      { text: '8.5 야간 가족 클래스', checked: true },
      { text: '8.5 야간 가족 클래스', checked: false },
    )).toBe(false);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '8.5 야간 가족 클래스', checked: true },
      { text: '8.5 야간 가족 클래스', checked: false },
      { text: '8.5 야간 가족 클래스', checked: true },
    )).toBe(false);
  });

  it('rejects stale uncheck when base no longer matches checked current', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '교구 드랍', checked: true },
      { text: '교구 드랍', checked: false },
      { text: '교구 드랍', checked: false },
    )).toBe(true);
  });

  it('protects checked-only empty todo from silent uncheck', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '', checked: true },
      { text: '', checked: false },
    )).toBe(true);
  });

  it('rejects html-only rewrite without matching base', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'same', html: '<p>same</p>' },
      { text: 'same', html: '<p><strong>same</strong></p>' },
    )).toBe(true);
  });

  it('allows intentional html-only rewrite when base matches', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'same', html: '<p>same</p>' },
      { text: 'same', html: '<p><strong>same</strong></p>' },
      { text: 'same', html: '<p>same</p>' },
    )).toBe(false);
  });
});
