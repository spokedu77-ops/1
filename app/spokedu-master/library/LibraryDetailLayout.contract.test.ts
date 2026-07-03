import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER library detail layout contract', () => {
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const preview = read('app/spokedu-master/components/lesson/LessonPreviewContent.tsx');

  it('keeps the setup image and prep checklist top-aligned without equal-height stretch', () => {
    expect(detail).toContain('lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]');
    expect(detail).toContain('lg:items-start');
    expect(detail).not.toContain('lg:items-stretch');
    expect(detail).not.toContain('title="초기 교구 세팅" className="h-full"');
    expect(detail).not.toContain('title="사전 체크리스트" className="h-full"');
  });

  it('preserves educational setup images instead of cropping them as covers', () => {
    expect(detail).toContain('width={960}');
    expect(detail).toContain('height={720}');
    expect(detail).toContain('object-contain');
    expect(detail).toContain('lg:max-h-[500px]');
    expect(detail).not.toContain('relative aspect-[4/3] w-full overflow-hidden sm:aspect-square lg:aspect-[4/5]');
  });

  it('uses a single section level for short preparation blocks', () => {
    expect(detail).toContain('function LessonPrepBlock');
    expect(detail).toContain('border-t border-slate-100 pt-4');
    expect(detail).not.toContain('LessonChecklistCard');
  });

  it('does not expose internal lesson quality warnings in user-facing library screens', () => {
    for (const source of [detail, preview]) {
      expect(source).not.toContain('일부 정보가 부족합니다');
      expect(source).not.toContain('수업 정보 보강이 필요합니다');
      expect(source).not.toContain('부족 정보:');
      expect(source).not.toContain('{quality.status}');
      expect(source).not.toContain('qualityNotice');
    }
  });

  it('only reserves large bottom padding when a sticky SPOMOVE action exists', () => {
    expect(detail).toContain("primarySpomovePreset ? 'pb-44 lg:pb-14' : 'pb-10 lg:pb-12'");
    expect(detail).toContain('style={{ paddingBottom:');
  });
});
