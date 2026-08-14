import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('SPOMOVE admin 72-preset mapping', () => {
  it('uses the public 72-preset group counts and order', () => {
    const expectedRows = [
      "{ key: 'reaction-cognition', label: '반응 인지', expectedCount: 23 }",
      "{ key: 'visual-reaction', label: '시지각 반응', expectedCount: 10 }",
      "{ key: 'simon', label: '사이먼 이펙트', expectedCount: 10 }",
      "{ key: 'flanker', label: '플랭커 이펙트', expectedCount: 17 }",
      "{ key: 'stroop', label: '스트룹 이펙트', expectedCount: 4 }",
      "{ key: 'sequential-memory', label: '순차 기억', expectedCount: 6 }",
      "{ key: 'dive', label: '다이브', expectedCount: 2 }",
    ];
    expectedRows.forEach((row) => expect(source).toContain(row));
    expect(expectedRows.reduce((sum, row) => sum + Number(row.match(/expectedCount: (\d+)/)?.[1] ?? 0), 0)).toBe(72);
  });

  it('uses ADMIN_SPOMOVE_LIBRARY for catalog, content, thumbnails, and guide videos', () => {
    expect(source).not.toContain('const presets = OFFICIAL_SPOMOVE_LIBRARY');
    expect(source).toContain('공개 공식 프리셋 {ADMIN_SPOMOVE_LIBRARY.length}개');
    expect(source).toContain('SPOMOVE_GROUP_OPTIONS.map((group) => {');
    expect(source).not.toContain('{ADMIN_SPOMOVE_LIBRARY.map((preset) => {');
  });
});
