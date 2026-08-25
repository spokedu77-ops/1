import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(join(process.cwd(), 'app/spokedu-master/spomove', name), 'utf8');
const hub = read('SpomoveHubView.tsx');
const sheet = read('SpomoveGuidelineSheet.tsx');

describe('SPOMOVE user-friction hardening contracts', () => {
  it('keeps search, URL state, reset and selection semantics explicit', () => {
    expect(hub).toContain('활동명 또는 키워드 검색');
    expect(hub).toContain('parseSpomoveHubUrlState');
    expect(hub).toContain('serializeSpomoveHubUrlState');
    expect(hub).toContain('aria-pressed={active}');
    expect(hub).toContain('aria-live="polite"');
    expect(hub).toContain('>초기화</button>');
  });

  it('keeps one card column through 430px and mobile action targets usable', () => {
    expect(hub).toContain('min-[431px]:grid-cols-2');
    expect(hub).not.toContain('min-[380px]:grid-cols-2');
    expect(hub).toContain('h-11 min-w-0 flex-[1.6]');
  });

  it('does not truncate prep values and always exposes a footer close action', () => {
    expect(sheet).toContain('grid grid-cols-2 gap-2 sm:grid-cols-3');
    expect(sheet).toContain('break-words text-[13.5px]');
    expect(sheet).not.toContain('mt-0.5 truncate text-[13.5px]');
    expect(sheet).toContain('실제 운영 예시 영상입니다.');
    expect(sheet).not.toContain('실제 준비 수량은 오른쪽 기준을 따릅니다.');
    expect(sheet).not.toContain('실행 전 오른쪽 준비·진행 기준을 확인하세요.');
    expect(sheet).toContain('grid-cols-[minmax(88px,0.7fr)_minmax(0,1.3fr)]');
  });
});
