import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER primary navigation', () => {
  it('shares the six primary destinations across desktop and mobile', () => {
    const nav = read('app/spokedu-master/components/layout/masterNavLabels.ts');
    const desktop = read('app/spokedu-master/components/layout/StatusBar.tsx');
    const mobile = read('app/spokedu-master/components/layout/TabBar.tsx');
    expect(desktop).toContain('MASTER_NAV_ITEMS');
    expect(mobile).toContain('MASTER_NAV_ITEMS');
    expect(nav).toContain("href: '/spokedu-master/library', label: '놀이체육'");
    expect(nav).toContain("href: '/spokedu-master/activity', label: '수업 캘린더'");
    expect(nav).toContain("href: '/spokedu-master/class-tools'");
    expect(nav).not.toContain("href: '/spokedu-master/plan'");
  });

  it('uses the Session calendar instead of the standalone record creator', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    const legacy = read('app/spokedu-master/class-record/page.tsx');
    expect(activity).toContain('Session Calendar');
    expect(activity).toContain('Session 상세');
    expect(activity).toContain('프로그램 미지정');
    expect(activity).toContain('수업 완료');
    expect(activity).not.toContain('/spokedu-master/class-record');
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
