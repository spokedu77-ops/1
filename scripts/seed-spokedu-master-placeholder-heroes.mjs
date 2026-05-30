/**
 * HOT 프로그램 slug별 placeholder hero.svg 복사 (콘텐츠 업로드 전)
 * Usage: node scripts/seed-spokedu-master-placeholder-heroes.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public/images/spokedu-master/programs/_placeholder/hero.svg');
const dataSource = readFileSync(join(root, 'app/spokedu-master/lib/data.ts'), 'utf8');
const hotIds = dataSource
  .split(/\n  \{\n    id: '/)
  .slice(1)
  .filter((block) => /isHot: true/.test(block))
  .map((block) => block.split("'")[0]);

if (!existsSync(source)) {
  console.error('Missing placeholder:', source);
  process.exit(1);
}

let copied = 0;
for (const id of hotIds) {
  const dir = join(root, 'public/images/spokedu-master/programs', id);
  const target = join(dir, 'hero.svg');
  if (existsSync(target)) continue;
  mkdirSync(dir, { recursive: true });
  copyFileSync(source, target);
  copied += 1;
  console.log(`OK ${id} → hero.svg`);
}

console.log(`\n${copied} placeholder(s) created. Replace with hero.jpeg when ready.`);
