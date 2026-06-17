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

  it('removes only known legacy caches from the client bootstrap', () => {
    const source = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(source).toContain("['spokedu-master-v3', 'start-url', 'dev']");
    expect(source).toContain('window.caches.delete(cacheName)');
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

  it('caches only explicit public static allowlist and public Supabase storage objects', () => {
    const source = read('public/spokedu-master-sw.js');

    expect(source).toContain("url.pathname.startsWith('/_next/static/')");
    expect(source).toContain("'/manifest.json'");
    expect(source).toContain("'/spokedu-master-icon.svg'");
    expect(source).toContain("url.pathname.includes('/storage/v1/object/public/iiwarmup-files/')");
    expect(source).toContain("!url.pathname.includes('/storage/v1/object/sign/')");
    expect(source).toContain("!url.pathname.includes('/storage/v1/object/authenticated/')");
  });

  it('deletes named legacy caches without deleting all cache storage', () => {
    const source = read('public/spokedu-master-sw.js');

    expect(source).toContain("const LEGACY_CACHES = ['spokedu-master-v3', 'start-url', 'dev']");
    expect(source).toContain('LEGACY_CACHES.map((cacheName) => caches.delete(cacheName))');
    expect(source).not.toContain('caches.keys()');
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

    expect(source).toContain('앱 설치 및 정적 리소스 준비됨');
    expect(source).not.toContain('오프라인 캐시 준비됨');
  });
});
