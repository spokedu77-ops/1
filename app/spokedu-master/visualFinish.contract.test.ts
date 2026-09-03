import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'app/spokedu-master', file), 'utf8');

describe('MASTER representative visual finish', () => {
  it('keeps Home editorial and media-first without strong content shadows', () => {
    const home = read('dashboard/DashboardView.tsx');
    expect(home).toContain("{'이번 주,\\n어떤 수업을 해볼까요?'}");
    expect(home).toContain('ensureWeeklyRecommendationCount');
    expect(home).toContain('featuredSpomove.slice(0, 4)');
    expect(home).toContain('snap-mandatory');
    expect(home).not.toContain('SPOKEDU WEEKLY PICK');
    expect(home).not.toContain('shadow-[0_14px_30px');
  });

  it('keeps Library search-led with saved content and no outer shelf elevation', () => {
    const library = read('library/LibraryView.tsx');
    const card = read('components/lesson/LessonCatalogCard.tsx');
    expect(library).toContain('MasterPageHeader title="놀이체육"');
    expect(library).toContain('placeholder="활동 이름, 교구, 종목 검색"');
    expect(library).not.toContain('shadow-[0_10px_24px');
    expect(card).toContain('Bookmark');
    expect(card).toContain("favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'");
  });

  it('keeps SPOMOVE discovery cards separate from Preview-owned execution actions', () => {
    const hub = read('spomove/SpomoveHubView.tsx');
    const preview = read('spomove/SpomoveGuidelineSheet.tsx');

    expect(hub).toContain('SPOMOVE 프로그램');
    expect(hub).toContain('SharedSpomoveGuidelineSheet');
    expect(hub).toContain('SPOMOVE_CATALOG_FAMILIES');
    expect(hub).toContain('data-spm-spomove-card-action="preview"');
    expect(hub).toContain('Bookmark');
    expect(hub).not.toContain('data-spm-spomove-card-action="start"');
    expect(hub).not.toContain('활동 준비');
    expect(hub).not.toContain('시작 설정');
    expect(hub).toContain('이 수업에 추가');
    expect(hub).toContain('familyFiltered.slice(0, 4)');
    expect(hub).toContain('xl:grid-cols-4');
    expect(hub).toContain('sm:max-w-[440px]');
    expect(hub).not.toContain('PREMIUM DIGITAL MOVEMENT');

    expect(preview).toContain('data-preview-column="media"');
    expect(preview).toContain("guideVideoState === 'locked'");
    expect(preview).toContain('활동 준비');
    expect(preview).toContain('시작 설정');
    expect(preview).toContain("sessionHref('start')");
    expect(preview).toContain("sessionHref('settings')");
  });
});
