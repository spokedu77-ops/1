import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER service-worker recovery contract', () => {
  const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
  const worker = read('public/spokedu-master-sw.js');

  it('does not register a MASTER service worker', () => {
    expect(shell).not.toContain('navigator.serviceWorker.register');
    expect(shell).toContain("registration.scope.includes('/spokedu-master/')");
    expect(shell).toContain('registration.unregister()');
  });

  it('clears only MASTER-owned browser caches', () => {
    expect(shell).toContain("cacheName.startsWith('spokedu-master')");
    expect(shell).toContain('window.caches.delete(cacheName)');
    expect(shell).not.toContain('cacheNames.map((cacheName) => window.caches.delete(cacheName))');
  });

  it('ships a no-fetch tombstone for previously installed workers', () => {
    expect(worker).toContain("const MASTER_CACHE_PREFIX = 'spokedu-master'");
    expect(worker).toContain('self.skipWaiting()');
    expect(worker).toContain('self.registration.unregister()');
    expect(worker).toContain('caches.delete(cacheName)');
    expect(worker).not.toContain("addEventListener('fetch'");
    expect(worker).not.toContain('event.respondWith');
  });
});
