import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER service worker cache contract', () => {
  it('does not use root next-pwa runtime configuration or generated root workers', () => {
    const nextConfig = read('next.config.ts');

    expect(nextConfig).not.toContain('@ducanh2912/next-pwa');
    expect(nextConfig).not.toContain('withPWA');
    expect(existsSync(join(process.cwd(), 'public/sw.js'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'public/workbox-7144475a.js'))).toBe(false);
  });

  it('registers only the MASTER scoped service worker from AppShell', () => {
    const source = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(source.match(/navigator\.serviceWorker\.register/g)).toHaveLength(1);
    expect(source).toContain("navigator.serviceWorker.register('/spokedu-master-sw.js', { scope: '/spokedu-master/' })");
    expect(source).toContain("new URL(worker.scriptURL).pathname === '/sw.js'");
    expect(source).not.toContain('registrations.forEach((registration) => void registration.unregister())');
  });

  it('does not remove caches from the client bootstrap', () => {
    const source = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(source).not.toContain('window.caches.delete(cacheName)');
    expect(source).not.toContain('window.caches.keys');
  });

  it('does not cache MASTER documents, navigation, RSC, JSON, or API responses', () => {
    const source = read('public/spokedu-master-sw.js');

    expect(source).toContain("if (request.mode === 'navigate' || request.destination === 'document') return;");
    expect(source).toContain("if (url.pathname.startsWith('/api/')) return;");
    expect(source).toContain("if (url.pathname.startsWith('/spokedu-master')) return;");
    expect(source).toContain("'text/html'");
    expect(source).toContain("'application/json'");
    expect(source).toContain("'text/x-component'");
    expect(source).not.toContain("cache.addAll(APP_SHELL)");
    expect(source).not.toContain("caches.match('/spokedu-master')");
  });

  it('does not cache private, no-store, signed, or authenticated responses', () => {
    const source = read('public/spokedu-master-sw.js');

    expect(source).toContain("cacheControl.includes('no-store')");
    expect(source).toContain("cacheControl.includes('private')");
    expect(source).toContain("!url.pathname.includes('/storage/v1/object/sign/')");
    expect(source).toContain("!url.pathname.includes('/storage/v1/object/authenticated/')");
  });

  it('caches only explicit public static allowlist and public Supabase storage objects', () => {
    const source = read('public/spokedu-master-sw.js');

    expect(source).toContain("url.pathname.startsWith('/_next/static/')");
    expect(source).toContain("'/manifest.json'");
    expect(source).toContain("'/spokedu-master-icon.svg'");
    expect(source).toContain("url.pathname.includes('/storage/v1/object/public/iiwarmup-files/')");
    expect(source).toContain("!url.pathname.includes('/storage/v1/object/sign/')");
    expect(source).toContain("!url.pathname.includes('/storage/v1/object/authenticated/')");
  });

  it('deletes old SPOKEDU MASTER caches while leaving other service caches untouched', () => {
    const source = read('public/spokedu-master-sw.js');

    expect(source).toContain("const CURRENT_CACHES = new Set([STATIC_CACHE, STORAGE_CACHE])");
    expect(source).toContain("const MASTER_CACHE_PREFIX = 'spokedu-master'");
    expect(source).toContain('caches.keys()');
    expect(source).toContain('cacheName.startsWith(MASTER_CACHE_PREFIX)');
    expect(source).toContain('!CURRENT_CACHES.has(cacheName)');
    expect(source).toContain('caches.delete(cacheName)');
    expect(source).not.toContain('cacheNames.map((cacheName) => caches.delete(cacheName))');
  });
});

describe('SPOKEDU MASTER protected response cache contract', () => {
  const protectedRoutes = [
    'app/api/spokedu-master/access/route.ts',
    'app/api/spokedu-master/students/route.ts',
    'app/api/spokedu-master/students/[id]/route.ts',
    'app/api/spokedu-master/class-records/route.ts',
    'app/api/spokedu-master/subscription/route.ts',
    'app/api/spokedu-master/programs/route.ts',
  ];

  it.each(protectedRoutes)('%s uses private no-store response headers and dynamic routing', (route) => {
    const source = read(route);

    expect(source).toContain("dynamic = 'force-dynamic'");
    expect(source).toContain('revalidate = 0');
    expect(source).toMatch(/privateNoStoreJson|withPrivateNoStore/);
  });

  it('defines the exact private no-store headers once', () => {
    const source = read('app/lib/server/privateNoStore.ts');

    expect(source).toContain("'Cache-Control': 'private, no-store, max-age=0'");
    expect(source).toContain("Pragma: 'no-cache'");
    expect(source).toContain("Vary: 'Cookie, Authorization'");
  });

  it('uses no-store for operational protected GET requests', () => {
    const source = read('app/spokedu-master/operational/OperationalDataProvider.tsx');

    expect(source).toContain("cache: init?.method ? undefined : 'no-store'");
    expect(source).toContain("'/api/spokedu-master/students'");
    expect(source).toContain("'/api/spokedu-master/class-records'");
  });

  it('does not describe personalized offline data as available', () => {
    const source = read('app/spokedu-master/components/operations/PwaInstallCard.tsx');

    expect(source).toContain('빠른 재진입 준비됨');
    expect(source).toContain('수업 자료와 기록 기능은 인터넷 연결 상태에서 사용해 주세요.');
    expect(source).not.toContain('오프라인 캐시 준비됨');
    expect(source).not.toContain('오프라인에서도');
    expect(source).not.toContain('자동 업로드');
  });

  it('uses network wording without promising server health or sync completion', () => {
    const statusBar = read('app/spokedu-master/components/layout/StatusBar.tsx');
    const operationsPanel = read('app/spokedu-master/components/operations/OperationsPanel.tsx');

    expect(statusBar).toContain('인터넷 연결됨');
    expect(statusBar).toContain('인터넷 연결 없음');
    expect(operationsPanel).toContain('인터넷 연결됨');
    expect(operationsPanel).toContain('인터넷 연결 없음');
    expect(operationsPanel).toContain("operational.online ? '연결됨' : '연결 없음'");
    expect(read('app/spokedu-master/components/layout/AppShell.tsx')).not.toContain('OperationsBanner');
    expect(statusBar).not.toContain('서버 정상');
    expect(statusBar).not.toContain('동기화 완료');
    expect(statusBar).not.toContain('모든 자료 최신');
    expect(operationsPanel).not.toContain('동기화 완료');
    expect(operationsPanel).not.toContain("operational.online ? '정상' : '보관'");
  });

  it('does not show an install success CTA without a real install state', () => {
    const source = read('app/spokedu-master/components/operations/PwaInstallCard.tsx');

    expect(source).toContain('window.addEventListener(\'beforeinstallprompt\'');
    expect(source).toContain('window.addEventListener(\'appinstalled\'');
    expect(source).toContain('{standalone ? null : (');
    expect(source).not.toContain("const installLabel = standalone ? '설치 완료'");
  });

  it('describes the manifest as an online-first quick-launch app', () => {
    const source = read('public/manifest.json');

    expect(source).toContain('"name": "SPOKEDU MASTER"');
    expect(source).toContain('인터넷 연결 상태에서');
    expect(source).not.toContain('오프라인');
    expect(source).not.toContain('동기화');
  });
});
