/**
 * Verifies that the built SPOKEDU home page is serving the expected render contract.
 * Usage after starting the app:
 *   node scripts/spokedu-home-render-verify.mjs http://localhost:3000
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const URL = `${BASE.replace(/\/$/, '')}/spokedu`;

function readBuildId() {
  const file = path.join(process.cwd(), 'app/spokedu/data/home-build.ts');
  const src = readFileSync(file, 'utf8');
  const match = src.match(/SPOKEDU_HOME_BUILD_ID = '([^']+)'/);
  if (!match) throw new Error('SPOKEDU_HOME_BUILD_ID not found');
  return match[1];
}

async function main() {
  const buildId = readBuildId();
  const res = await fetch(URL, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${URL}`);
  const html = await res.text();

  const checks = [
    { name: 'build-id', ok: html.includes(`data-spokedu-home-build="${buildId}"`), expect: buildId },
    { name: 'hero-image', ok: html.includes('home-hero-spomove-class.png'), expect: 'home-hero-spomove-class.png' },
    { name: 'no-dongjak-hero', ok: !html.includes('/images/spokedu/records/dongjak.jpg'), expect: 'absent' },
    { name: 'spomove-section', ok: html.includes('id="spomove"'), expect: 'section anchor' },
    { name: 'spomove-program-link', ok: html.includes('/spokedu/programs/spomove'), expect: 'program detail link' },
    { name: 'dispatch-gate-link', ok: html.includes('/spokedu/dispatch'), expect: 'dispatch path link' },
    { name: 'private-gate-link', ok: html.includes('/spokedu/private'), expect: 'private path link' },
    { name: 'contact-link', ok: html.includes('/spokedu/contact'), expect: 'contact link' },
    { name: 'final-cta-grid', ok: html.includes('min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]'), expect: '2-col final cta @1200' },
  ];

  let failed = 0;
  for (const check of checks) {
    const status = check.ok ? 'OK' : 'FAIL';
    if (!check.ok) failed += 1;
    console.log(`[${status}] ${check.name} (${check.expect})`);
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. URL: ${URL}`);
    console.error('If build-id failed: restart server after `npm run build` (not stale dev/start).');
    console.error('If checking production: deploy is required; local changes are not live until push/deploy.');
    process.exit(1);
  }

  console.log(`\nAll ${checks.length} render checks passed for build ${buildId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
