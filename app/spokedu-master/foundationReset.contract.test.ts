import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(path, 'utf8');
const home = read('app/spokedu-master/dashboard/DashboardView.tsx');
const continuity = read('app/spokedu-master/dashboard/TodaySessionsPanel.tsx');
const manage = read('app/spokedu-master/activity/page.tsx');
const managePage = read('app/spokedu-master/manage/page.tsx');
const favorites = read('app/spokedu-master/favorites/FavoritesView.tsx');
const library = read('app/spokedu-master/library/LibraryView.tsx');
const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
const guide = read('app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx');

describe('Foundation Reset user-facing contracts', () => {
  it('keeps Home editorial order and strict resume', () => {
    expect(home).not.toContain('resolveMasterHomePriority');
    expect(home).not.toContain('Lite만으로');
    expect(home).toContain("featuredSpomove.slice(0, 4)");
    expect(continuity).toContain("session.status === 'scheduled'");
    expect(continuity).not.toContain('출석 확인하기');
  });
  it('composes schedule before classes in Manage', () => {
    expect(manage).toContain('수업 관리');
    expect(manage.indexOf('weekly-agenda-heading')).toBeLessThan(manage.indexOf('manage-classes-heading'));
    expect(manage).toContain('내 수업반');
    expect(managePage).not.toContain('activity/page');
  });
  it('makes Favorites the retrieval surface and opens shared Preview', () => {
    expect(favorites).toContain("['all', '전체']");
    expect(favorites).toContain("['program', '놀이체육']");
    expect(favorites).toContain("['spomove', 'SPOMOVE']");
    expect(favorites).toContain('setPreviewPreset(preset)');
    expect(favorites).toContain('SpomoveGuidelineSheet');
    expect(favorites).not.toContain('publicOfficialPresetSessionHref');
  });
  it('removes discovery favorites modes and preserves contextual payment', () => {
    expect(library).not.toContain("view === 'favorites'");
    expect(hub).not.toContain('showSavedOnly');
    expect(guide).toContain('buildMasterGateContext');
    expect(guide).toContain('buildMasterPaymentHref');
  });
});
