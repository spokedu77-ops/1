import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from './manage/session-detailTestSource';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER primary navigation', () => {
  it('shares semantic product destinations and keeps profile as an account utility', () => {
    const nav = read('app/spokedu-master/components/layout/masterNavLabels.ts');
    const desktop = read('app/spokedu-master/components/layout/StatusBar.tsx');
    const mobile = read('app/spokedu-master/components/layout/TabBar.tsx');
    expect(desktop).toContain('MASTER_NAV_ITEMS');
    expect(mobile).toContain('MASTER_NAV_ITEMS');
    expect(nav).toContain("href: '/spokedu-master/programs', label: '프로그램'");
    expect(nav).toContain("href: '/spokedu-master/favorites', label: '즐겨찾기'");
    expect(nav).toContain("href: '/spokedu-master/manage', label: '수업 관리'");
    expect(nav).toContain("key: 'programs'");
    expect(nav).toContain("key: 'favorites'");
    expect(nav).toContain("key: 'manage'");
    expect(nav).not.toContain("href: '/spokedu-master/profile'");
    expect(desktop).toContain('href="/spokedu-master/profile"');
    expect(nav).toContain("href: '/spokedu-master/class-tools', label: '수업 도구'");
    expect(nav).not.toContain("href: '/spokedu-master/plan'");
    expect((nav.match(/href: '/g) ?? [])).toHaveLength(5);
  });

  it('uses the Session calendar instead of the standalone record creator', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    const manage = read('app/spokedu-master/manage/ManageView.tsx');
    const schedule = read('app/spokedu-master/manage/ScheduleTab.tsx');
    const detail = readSessionDetailSource();
    const legacy = read('app/spokedu-master/class-record/page.tsx');
    expect(activity).toContain("import ManageView from '../manage/ManageView'");
    expect(manage).toContain('수업 관리');
    expect(schedule).toContain('<MonthSessionCalendar');
    expect(schedule).toContain('manage-calendar-heading');
    expect(detail).toContain('수업 상세');
    expect(detail).toContain('수업 활동');
    expect(detail).not.toContain('수업 시작');
    expect(detail).not.toContain('resolveSessionWorkspacePresentation');
    expect(activity).not.toContain('/spokedu-master/class-record');
    expect(manage).not.toContain('ClassManagerSheet');
    expect(legacy).toContain("redirect('/spokedu-master/activity')");
  });

  it('keeps profile commercial and data-management actions available', () => {
    const profile = read('app/spokedu-master/profile/page.tsx');
    expect(profile).toContain('/spokedu-master/subscription');
    expect(profile).toContain('MASTER_DATA_DELETE_CONFIRMATION');
    expect(profile).toContain('handleLogout');
  });

  it('keeps hidden routes protected by the direct URL policy', () => {
    const routeAccess = read('app/spokedu-master/components/layout/masterRouteAccess.ts');
    expect(routeAccess).toContain('return pathname === basePath || pathname.startsWith(`${basePath}/`)');
  });
});
