/**
 * MASTER 홈 노출용 정적 프로그램 품질 점검 (오프라인)
 * Usage: node scripts/spokedu-master-home-content-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'app/spokedu-master/lib/data.ts'), 'utf8');

const blocks = source.split(/\n  \{\n    id: '/).slice(1);
const programs = blocks.map((block) => {
  const id = block.split("'")[0];
  const hasHero = /heroImageUrl:\s*['"][^'"]+['"]/.test(block) || /thumbnailUrl:\s*['"][^'"]+['"]/.test(block);
  const hasRules = /rules:\s*\[/.test(block) && !/rules:\s*\[\s*\]/.test(block);
  const isHot = /isHot:\s*true/.test(block);
  const orderMatch = block.match(/homeSortOrder:\s*(\d+)/);
  return { id, hasHero, hasRules, isHot, homeSortOrder: orderMatch ? Number(orderMatch[1]) : 9999 };
});

const showcase = programs.filter((p) => p.hasHero && p.hasRules);
const hot = programs.filter((p) => p.isHot);

console.log('=== SPOKEDU MASTER static PROGRAMS home audit ===');
console.log(`total: ${programs.length}`);
console.log(`HOT: ${hot.length}`);
console.log(`showcase-ready (hero+rules): ${showcase.length}`);
console.log(`fallback showcase target 5~8: ${showcase.length >= 5 ? 'OK' : 'WARN'}`);

for (const p of programs.sort((a, b) => a.homeSortOrder - b.homeSortOrder)) {
  const flags = [p.hasHero ? 'visual' : 'no-visual', p.hasRules ? 'flow' : 'no-flow', p.isHot ? 'HOT' : ''].filter(Boolean).join(', ');
  console.log(`  [${p.homeSortOrder}] ${p.id} — ${flags}`);
}

if (showcase.length < 5) {
  console.warn('\nWARN: static PROGRAMS fallback has fewer than 5 showcase-ready items.');
  console.warn('Dashboard uses API/DB programs first; static PROGRAMS is only the API failure fallback.');
  console.warn('Keeping this as a fallback audit warning instead of failing SPOKEDU MASTER QA.');
}
