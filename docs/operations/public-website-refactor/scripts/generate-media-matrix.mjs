#!/usr/bin/env node
/** Seed MEDIA_AND_CONTENT_MATRIX.csv from known public marketing assets. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const out = path.join(repo, 'docs/operations/public-website-refactor/MEDIA_AND_CONTENT_MATRIX.csv');

const ROWS = [
  ['/', 'hero', 'home-hero.tsx', 'public/images/spokedu/home/field-editorial/home-hero-coaching.jpg', 'brand', 'home-web-assets HOME_HERO_IMAGE', '', 'keep', '대표 브랜드 장면'],
  ['/', 'method', 'spokedu-method.tsx', 'public/images/spokedu/records/yangcheon-paps.jpg', 'field', 'METHOD 0', 'dup-yangcheon', 'keep', 'FIELD 기둥'],
  ['/', 'method', 'spokedu-method.tsx', 'public/images/spokedu/subscription/prepare-lesson-plan-20261008-final.png', 'product-ui', 'METHOD 1', '', 'keep', 'LAB 가이드 UI'],
  ['/', 'field-records', 'field-records.tsx', 'public/images/spokedu/records/dongjak-spomove-field.jpg', 'field', 'HOME_FIELD_RECORDS[0]', '', 'keep', '동작 SPOMOVE'],
  ['/', 'spomove-stage', 'spomove-stage.tsx', 'public/images/spokedu/dispatch/dispatch-group-class.jpg', 'field', 'HOME_SPOMOVE_VISUAL', 'dup-dispatch', 'review', 'SPOMOVE 소개 — dispatch와 동일 파일 가능성'],
  ['/', 'master-stage', 'master-stage.tsx', 'public/images/spokedu/subscription/library-program-cards-20261008-final.png', 'product-ui', 'HOME_MASTER_VISUAL', '', 'keep', 'LAB 라이브러리'],
  ['/education', 'hub', 'education-hub-landing.tsx', '(via home-media.ts keys)', 'field', 'education-hub.ts', '', 'NOT_VERIFIED', '페이지별 키 — CSV 2차 확장'],
  ['/spomove/catalog', 'activities', 'spomove-public-catalog.tsx', '(activityCards mediaKey)', 'mixed', 'spomove-public-catalog-page.ts', '', 'review', '프로그램별 차별 검증 필요'],
  ['/records', 'featured', 'records-landing.tsx', '(FIELD_RECORD_CATALOG)', 'field', 'field-records-catalog.ts', 'dup-featured-archive', 'review', 'FEATURED vs ARCHIVE 중복 조사'],
  ['/spomat', 'definition', 'spomat-landing.tsx', '(home-media spomovePadSystem)', 'product', 'spomat-page.ts', '', 'keep', '4색 매트'],
];

async function sha(rel) {
  try {
    const buf = await readFile(path.join(repo, rel));
    return createHash('sha256').update(buf).digest('hex').slice(0, 16);
  } catch {
    return 'MISSING';
  }
}

async function main() {
  const header =
    'page,section,component,asset,content_role,original_evidence,duplicate_group,decision,reason\n';
  const lines = [];
  for (const row of ROWS) {
    const asset = row[3];
    let shaCol = '';
    if (asset.startsWith('public/')) {
      shaCol = await sha(asset);
      row[3] = `${asset}#${shaCol}`;
    }
    lines.push(row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  }
  await writeFile(out, header + lines.join('\n') + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, out, rows: lines.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
