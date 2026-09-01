import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/admin/spokedu-master/programs/page.tsx', 'utf8');

describe('MASTER SPOMOVE compact editor contract', () => {
  it('keeps the official guide as the primary open editing surface', () => {
    expect(source).toContain('공식 수업 가이드');
    expect(source.indexOf('공식 가이드 완성도')).toBeLessThan(source.indexOf('고급·레거시 정보'));
  });

  it('collapses secondary card fields and legacy fallbacks', () => {
    expect(source).toContain('필요할 때 열기');
    expect(source).toContain('고급·레거시 정보');
    expect(source).toContain('공식 가이드가 없을 때만 사용');
    expect(source).not.toContain('카드 한줄 설명을 입력하면 여기에 표시됩니다.');
  });
});
