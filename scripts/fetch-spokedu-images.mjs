/**
 * Pexels 스톡 → public/images/spokedu (SOURCES.internal.md 기준)
 * Usage: node scripts/fetch-spokedu-images.mjs
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../public/images/spokedu');

/** 아동·체육 톤 Pexels ID (건물 외관·무관 인물 제외) */
const PEXELS = {
  8613087: 'home/home-hero-movement.jpg',
  8197524: 'home/home-lab-energy.jpg',
  8612026: 'private/private-coaching.jpg',
  4709285: 'private/private-small-group.jpg',
  3662664: 'private/private-tool-activity.jpg',
  4260325: 'dispatch/dispatch-group-class.jpg',
  2743754: 'dispatch/dispatch-oneday-event.jpg',
  7688336: 'curriculum/curriculum-planning.jpg',
  3662639: 'curriculum/curriculum-tool-setup.jpg',
  2744310: 'programs/program-paps-running.jpg',
  8612031: 'programs/program-spomove.jpg',
};

function pexelsUrl(id) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`;
}

async function download(id, relPath) {
  const dest = join(ROOT, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(pexelsUrl(id));
  if (!res.ok) throw new Error(`Pexels ${id} → ${relPath}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`Pexels ${id} → ${relPath}: file too small`);
  await import('fs').then(({ writeFileSync }) => writeFileSync(dest, buf));
  console.log(`OK ${relPath} (${buf.length} bytes)`);
}

function copy(fromRel, toRel) {
  const from = join(ROOT, fromRel);
  const to = join(ROOT, toRel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`COPY ${fromRel} → ${toRel}`);
}

async function main() {
  for (const [id, rel] of Object.entries(PEXELS)) {
    await download(Number(id), rel);
  }

  copy('dispatch/dispatch-group-class.jpg', 'home/home-dispatch-scene.jpg');
  copy('dispatch/dispatch-group-class.jpg', 'dispatch/dispatch-institution-class.jpg');
  copy('home/home-lab-energy.jpg', 'curriculum/curriculum-instructor-training.webp');
  copy('curriculum/curriculum-planning.jpg', 'curriculum/curriculum-materials.jpg');
  copy('private/private-tool-activity.jpg', 'programs/program-play-pe.jpg');
  copy('dispatch/dispatch-oneday-event.jpg', 'programs/program-oneday.jpg');
  copy('dispatch/dispatch-oneday-event.jpg', 'programs/program-camp.jpg');
  copy('curriculum/curriculum-planning.jpg', 'programs/program-curriculum-content.jpg');
  copy('home/home-hero-movement.jpg', 'records/yangcheon.jpg');
  copy('dispatch/dispatch-group-class.jpg', 'records/dongjak.jpg');
  copy('dispatch/dispatch-oneday-event.jpg', 'records/dasarang.jpg');
  copy('programs/program-camp.jpg', 'records/playz.jpg');
  copy('home/home-lab-energy.jpg', 'records/lab.jpg');
  copy('programs/program-oneday.jpg', 'records/seodaemun.jpg');
  copy('records/yangcheon.jpg', 'cases/hero.jpg');
  copy('dispatch/dispatch-group-class.jpg', 'cases/representative.jpg');
  copy('records/yangcheon.jpg', 'monthly/hero.jpg');
  copy('dispatch/dispatch-group-class.jpg', 'monthly/representative.jpg');
  copy('home/home-hero-movement.jpg', 'fallback-field.jpg');

  console.log('Done — spokedu images ready.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
