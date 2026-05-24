/**
 * 운영 실사 → public/images/spokedu (Home 1–10 + 프로그램 5종)
 * Usage: node scripts/import-spokedu-home-photos.mjs
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../public/images/spokedu');

/** @type {{ url: string; path: string }[]} */
const DOWNLOADS = [
  // Home 1–10
  { url: 'https://i.postimg.cc/s2n6Dbx4/20230318-001009.png', path: 'home/home-hero-movement.png' },
  { url: 'https://i.postimg.cc/Vk0txnwG/seupokidyu-laeb-cheyuggwan-hyeobchan-13.jpg', path: 'home/home-lab-energy.jpg' },
  { url: 'https://i.postimg.cc/4xWDWVRM/SE-5e4e5035-6810-11ee-a584-85f14318c83a.jpg', path: 'home/home-hero-media.jpg' },
  { url: 'https://i.postimg.cc/dV5b5rcf/20231008-152307.jpg', path: 'private/private-coaching.jpg' },
  { url: 'https://i.postimg.cc/Dz7dJvwW/Kakao-Talk-20260508-135643505.jpg', path: 'dispatch/dispatch-group-class.jpg' },
  { url: 'https://i.postimg.cc/C1W82jzZ/IMG-7594.jpg', path: 'curriculum/curriculum-instructor-training.jpg' },
  { url: 'https://i.postimg.cc/fLbsYPgR/DSC00739.jpg', path: 'records/yangcheon.jpg' },
  { url: 'https://i.postimg.cc/6qkTjKD0/IMG-8735.jpg', path: 'records/dongjak.jpg' },
  { url: 'https://i.postimg.cc/J0pswpW4/20260417-115503.png', path: 'records/dasarang.png' },
  { url: 'https://i.postimg.cc/dt2P4SkL/IMG-7940.jpg', path: 'records/playz.jpg' },
  // 프로그램 그리드
  { url: 'https://i.postimg.cc/Dz7dJvwW/Kakao-Talk-20260508-135643505.jpg', path: 'programs/program-spomove.jpg' },
  { url: 'https://i.postimg.cc/FHTMT3QX/IMG-1392.jpg', path: 'programs/program-paps-running.jpg' },
  { url: 'https://i.postimg.cc/5yW4kbxr/20260403-134412.png', path: 'programs/program-oneday.png' },
  { url: 'https://i.postimg.cc/5tg9yHWy/Kakao-Talk-20260507-091904775.jpg', path: 'programs/program-camp.jpg' },
  { url: 'https://i.postimg.cc/MK4GmWft/20260520-130316.png', path: 'programs/program-curriculum-content.png' },
];

function copy(fromRel, toRel) {
  const from = join(ROOT, fromRel);
  const to = join(ROOT, toRel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`COPY ${fromRel} → ${toRel}`);
}

async function download(url, relPath) {
  const dest = join(ROOT, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → ${relPath}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`${url} → ${relPath}: file too small (${buf.length}b)`);
  writeFileSync(dest, buf);
  console.log(`OK ${relPath} (${buf.length} bytes)`);
}

async function main() {
  for (const { url, path } of DOWNLOADS) {
    await download(url, path);
  }

  copy('dispatch/dispatch-group-class.jpg', 'dispatch/dispatch-institution-class.jpg');
  copy('dispatch/dispatch-group-class.jpg', 'home/home-dispatch-scene.jpg');
  copy('home/home-lab-energy.jpg', 'records/lab.jpg');
  copy('home/home-hero-movement.png', 'fallback-field.png');
  copy('records/yangcheon.jpg', 'cases/hero.jpg');
  copy('dispatch/dispatch-group-class.jpg', 'cases/representative.jpg');
  copy('records/yangcheon.jpg', 'monthly/hero.jpg');
  copy('records/playz.jpg', 'monthly/representative.jpg');

  console.log('Done — spokedu home photos imported.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
