import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalQaTarget, isForbiddenQaRequest, installLocalQaRouteGuard } from './qa-network-guard.mjs';

test('visual QA rejects production, Preview, LAN, and credentialed targets', () => {
  for (const url of [
    'https://spokedu.kr',
    'https://www.spokedu.kr/',
    'https://spokedu-git-main-example.vercel.app',
    'http://example.com',
    'http://192.168.1.2:3000',
    'http://user:pass@localhost:3000',
  ]) assert.throws(() => assertLocalQaTarget(url), /QA NETWORK BLOCK/);
});

test('visual QA permits HTTP loopback only', () => {
  assert.equal(assertLocalQaTarget('http://127.0.0.1:3000/').port, '3000');
  assert.equal(assertLocalQaTarget('http://localhost:3018/').hostname, 'localhost');
  assert.equal(assertLocalQaTarget('http://[::1]:3000/').hostname, '[::1]');
  assert.throws(() => assertLocalQaTarget('https://localhost:3000/'), /QA NETWORK BLOCK/);
});

test('request blocker detects production, Preview, and remote image optimizer URLs', () => {
  for (const url of [
    'https://spokedu.kr/_next/image?url=a&w=640&q=75',
    'https://preview.vercel.app/image.jpg',
    'https://cdn.example.com/_next/image?url=x',
  ]) assert.equal(isForbiddenQaRequest(url), true, url);
  assert.equal(isForbiddenQaRequest('http://localhost:3000/_next/image?w=640'), false);
});

test('browser guard aborts forbidden requests before network', async () => {
  let handler;
  const context = { route: async (_pattern, callback) => { handler = callback; } };
  const blocked = await installLocalQaRouteGuard(context);
  const events = [];
  const route = (url, type = 'image') => ({
    request: () => ({ url: () => url, resourceType: () => type, isNavigationRequest: () => type === 'document' }),
    abort: async () => { events.push('abort'); },
    continue: async () => { events.push('continue'); },
  });
  await handler(route('https://spokedu.kr/_next/image?url=x'));
  await handler(route('http://127.0.0.1:3000/images/hero.webp'));
  await handler(route('https://images.example.org/remote.jpg'));
  await handler(route('https://another-host.example.org/page', 'document'));
  assert.deepEqual(events, ['abort', 'continue', 'abort', 'abort']);
  assert.equal(blocked.length, 3);
});
