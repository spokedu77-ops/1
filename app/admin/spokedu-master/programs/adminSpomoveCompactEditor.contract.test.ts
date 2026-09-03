import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/admin/spokedu-master/programs/page.tsx', 'utf8');

describe('MASTER SPOMOVE compact editor contract', () => {
  it('keeps the guide as the primary modal editing surface', () => {
    expect(source).toContain("{ key: 'guide', label: '가이드' }");
    expect(source).toContain("useState<'guide' | 'card' | 'advanced'>('guide')");
    expect(source).toContain("setModalTab('guide')");
  });

  it('separates card fields and legacy fallbacks into secondary tabs', () => {
    expect(source).toContain("{ key: 'card', label: '카드 정보' }");
    expect(source).toContain("{ key: 'advanced', label: '고급' }");
    expect(source).toContain('공식 가이드가 없을 때만 사용');
    expect(source).not.toContain('카드 한줄 설명을 입력하면 여기에 표시됩니다.');
  });
});
