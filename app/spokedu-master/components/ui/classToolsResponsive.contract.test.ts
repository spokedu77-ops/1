import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/components/ui/ClassToolsView.tsx', 'utf8');

describe('MASTER Class Tools responsive contract', () => {
  it('keeps the ladder modal accessible and inside the viewport', () => {
    expect(source).toContain('role="dialog" aria-modal="true"');
    expect(source).toContain('aria-labelledby="ladder-result-title"');
    expect(source).toContain('max-h-[calc(100dvh-2rem)]');
    expect(source).toContain('aria-label="결과 요약 닫기"');
    expect(source).toContain('h-11 w-11');
    expect(source).toContain('max-h-[calc(100dvh-2rem)]');
  });


});
