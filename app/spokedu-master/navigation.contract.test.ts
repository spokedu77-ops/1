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
    expect(nav).toContain("href: '/spokedu-lab/programs', label: '프로그램'");
    expect(nav).toContain("href: '/spokedu-lab/favorites', label: '즐겨찾기'");
    expect(nav).toContain("href: '/spokedu-lab/manage', label: '수업 관리'");
    expect(nav).toContain("key: 'programs'");
    expect(nav).toContain("key: 'favorites'");
    expect(nav).toContain("key: 'manage'");
    expect(nav).not.toContain("href: '/spokedu-lab/profile'");
    expect(desktop).toContain('href="/spokedu-lab/profile"');
    expect(desktop).not.toContain('action="/spokedu-lab/library"');
    expect(desktop).not.toContain('role="search"');
    expect(desktop).not.toContain('name="q"');
    expect(desktop).not.toContain('Search');
    expect(mobile).not.toContain('name="q"');
    expect(nav).toContain("href: '/spokedu-lab/class-tools', label: '수업 도구'");
    expect(nav).not.toContain("href: '/spokedu-lab/plan'");
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
    expect(detail).toContain('수업 시작');
    expect(detail).toContain('resolveSessionWorkspacePresentation');
    expect(detail).toContain("legacyCapture ? 'emphasized'");
    expect(activity).not.toContain('/spokedu-lab/class-record');
    expect(manage).not.toContain('ClassManagerSheet');
    expect(legacy).toContain("redirect('/spokedu-lab/activity')");
  });

  it('keeps profile commercial and data-management actions available', () => {
    const profile = read('app/spokedu-master/profile/page.tsx');
    expect(profile).toContain('display.primaryHref');
    expect(profile).toContain('MASTER_DATA_DELETE_CONFIRMATION');
    expect(profile).toContain('handleLogout');
    expect(profile).toContain('flex-col gap-3 py-4 sm:flex-row');
    expect(profile).toContain('title={profile?.email || \'이메일 정보 없음\'}');
  });

  it('keeps hidden routes protected by the direct URL policy', () => {
    const routeAccess = read('app/spokedu-master/components/layout/masterRouteAccess.ts');
    expect(routeAccess).toContain('return pathname === basePath || pathname.startsWith(`${basePath}/`)');
  });

  it('hides app chrome on login and public documents', () => {
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    expect(shell).toContain('const isLogin = pathname === `${activeBasePath}/login`');
    expect(shell).toContain('isProgramsEditor || isLogin');
  });

  it('keeps the mobile tab bar fixed and reserves matching content clearance', () => {
    const mobile = read('app/spokedu-master/components/layout/TabBar.tsx');
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    const metrics = read('app/spokedu-master/components/layout/tabBarMetrics.ts');
    expect(mobile).toContain('min-[768px]:hidden');
    expect(mobile).toContain("aria-label=\"SPOKEDU LAB 주요 메뉴\"");
    expect(mobile).toContain('data-spm-tabbar="true"');
    expect(mobile).toContain('fixed inset-x-0 bottom-0');
    expect(mobile).toContain('env(safe-area-inset-bottom, 0px)');
    expect(metrics).toContain('calc(70px + max(8px, env(safe-area-inset-bottom, 0px)))');
    expect(shell).toContain("hideChrome ? null : <TabBar");
    expect(shell).toContain('pb-[var(--spm-tabbar-clearance)] min-[768px]:pb-0');
    expect(read('app/globals.css')).toContain("[data-spm-app-shell='true']");
  });

  it('keeps authenticated MASTER paths out of robots allow rules', () => {
    const robots = read('app/robots.ts');
    expect(robots).not.toContain("'/spokedu-lab/landing'");
    expect(read('app/sitemap.ts')).toContain('SPOKEDU_PATHS.subscription');
    expect(robots).toContain("'/spokedu-lab/terms'");
    expect(robots).toContain("'/spokedu-lab/privacy'");
    expect(robots).toContain("'/spokedu-master'");
    expect(robots).toContain("'/spokedu-lab'");
    expect(robots).not.toContain("'/spokedu-lab/dashboard'");
    expect(robots).not.toContain("'/spokedu-lab/library'");
  });
});
