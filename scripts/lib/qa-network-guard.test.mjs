import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalQaTarget, isForbiddenQaRequest, installLocalQaRouteGuard } from './qa-network-guard.mjs';

test('visual QA rejects production and Preview targets', () => {
  for (const u of ['https://spokedu.kr', 'https://www.spokedu.kr/', 'https://spokedu-git-main-jihoonchois-projects.vercel.app', 'http://example.com', 'http://192.168.1.2:3000']) {
    assert.throws(() => assertLocalQaTarget(u), /QA NETWORK BLOCK/);
  }
});
test('visual QA permits loopback only', () => {
  assert.equal(assertLocalQaTarget('http://127.0.0.1:3000/').port, '3000');
  assert.equal(assertLocalQaTarget('http://localhost:3018/').hostname, 'localhost');
});
test('request blocker detects production, Preview and image optimizer URLs', () => {
  for (const u of ['https://spokedu.kr/_next/image?url=a&w=640&q=75', 'https://spokedu-git-main-jihoonchois-projects.vercel.app/', 'https://cdn.example.com/_next/image?url=x']) {
    assert.equal(isForbiddenQaRequest(u), true, u);
  }
  assert.equal(isForbiddenQaRequest('http://localhost:3000/_next/image?w=640'), false);
});
test('browser guard aborts forbidden requests before network', async () => {
  let handler;
  const context = { route: async (_pattern, callback) => { handler = callback; } };
  const blocked = await installLocalQaRouteGuard(context);
  const events = [];
  const req = (url, type='image') => ({
    request: () => ({ url: () => url, resourceType: () => type, isNavigationRequest: () => type === 'document' }),
    abort: async () => { events.push('abort'); },
    continue: async () => { events.push('continue'); },
  });
  await handler(req('https://spokedu.kr/_next/image?url=x'));
  await handler(req('http://127.0.0.1:3000/images/hero.webp'));
  await handler(req('https://another-host.example.org/page', 'document'));
  assert.deepEqual(events, ['abort','continue','abort']);
  assert.equal(blocked.length, 2);
});
