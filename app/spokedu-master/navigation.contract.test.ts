import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER first pilot navigation', () => {
  it('keeps the desktop top navigation focused on the six pilot roles', () => {
    const statusBar = read('app/spokedu-master/components/layout/StatusBar.tsx');

    expect(statusBar).toContain("href: '/spokedu-master/dashboard', label: '홈'");
    expect(statusBar).toContain("href: '/spokedu-master/library', label: '라이브러리'");
    expect(statusBar).toContain("href: '/spokedu-master/spomove', label: 'SPOMOVE'");
    expect(statusBar).toContain("href: '/spokedu-master/class-tools', label: '수업 도구'");
    expect(statusBar).toContain("href: '/spokedu-master/activity', label: '수업 기록'");
    expect(statusBar).toContain("href: '/spokedu-master/profile', label: '프로필'");
    expect(statusBar).not.toContain("href: '/spokedu-master/plan'");
    expect(statusBar).not.toContain("href: '/spokedu-master/director'");
    expect(statusBar).not.toContain("href: '/spokedu-master/shop'");
  });

  it('keeps the mobile navigation aligned with the pilot entry structure', () => {
    const tabBar = read('app/spokedu-master/components/layout/TabBar.tsx');
    const statusBar = read('app/spokedu-master/components/layout/StatusBar.tsx');

    expect(tabBar).toContain("key: 'dashboard'");
    expect(tabBar).toContain("key: 'library'");
    expect(tabBar).toContain("key: 'spomove'");
    expect(tabBar).toContain("key: 'class-tools'");
    expect(tabBar).toContain('수업 기록');
    expect(tabBar).toContain('const activityHref = `${basePath}/activity`');
    expect(statusBar).toContain('href="/spokedu-master/profile"');
    expect(tabBar).not.toContain('plan');
    expect(tabBar).not.toContain('director');
    expect(tabBar).not.toContain('shop');
  });

  it('removes auxiliary routes from profile and home primary entry points', () => {
    const profile = read('app/spokedu-master/profile/page.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

    expect(profile).not.toContain('/spokedu-master/plan');
    expect(profile).not.toContain('/spokedu-master/director');
    expect(profile).not.toContain('PwaInstallCard');
    // SPOMAT store is in profile secondary menu (not in primary CTA section)
    expect(profile).toContain('/spokedu-master/shop');
    expect(dashboard).not.toContain('/spokedu-master/plan');
    expect(dashboard).not.toContain('/spokedu-master/director');
    expect(dashboard).not.toContain('/spokedu-master/shop');
    expect(dashboard).not.toContain("href: '/spokedu-master/class-tools'");
  });

  it('keeps the activity page focused on the simplified class record flow', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');

    expect(activity).toContain('/spokedu-master/library');
    expect(activity).toContain('라이브러리에서 수업 고르기');
    expect(activity).toContain('최근 수업 기록');
    expect(activity).toContain('기록 보기');
    expect(activity).toContain('안내문 만들기');
    expect(activity).toContain('/spokedu-master/students?add=1');
    expect(activity).toContain('내 반 명단 준비');
    expect(activity).toContain('학생 명단 관리');
    expect(activity).not.toContain('최근 안내문');
    expect(activity).not.toContain('/spokedu-master/plan');
    expect(activity).not.toContain('/spokedu-master/director');
    expect(activity).not.toContain('/spokedu-master/shop');
  });

  it('keeps profile commercial and data-management actions available', () => {
    const profile = read('app/spokedu-master/profile/page.tsx');
    const summary = read('app/spokedu-master/profile/subscriptionSummary.ts');

    expect(profile).toContain('/spokedu-master/subscription');
    expect(summary).toContain('/spokedu-master/payment');
    expect(profile).not.toContain('/spokedu-master/payment?plan=');
    expect(profile).toContain('MASTER_DATA_DELETE_CONFIRMATION');
    expect(profile).toContain('handleLogout');
  });

  it('keeps hidden routes protected by direct URL policy while lowering archive/import hierarchy', () => {
    const routeAccess = read('app/spokedu-master/components/layout/masterRouteAccess.ts');
    const students = read('app/spokedu-master/students/page.tsx');

    expect(routeAccess).toContain('return pathname === basePath || pathname.startsWith(`${basePath}/`)');
    expect(students).toContain('고급 기능: 이 기기의 기존 데이터 가져오기');
    expect(students).toContain('<details>');
    expect(students).toContain('handlePreviewLegacyImport');
  });
});
