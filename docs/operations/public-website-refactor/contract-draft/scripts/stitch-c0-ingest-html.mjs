/**
 * Copies Stitch code.html → app/spokedu/stitch/c0/bodies (does not modify ZIP sources).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(__dirname, '..');
const REPO = path.join(CONTRACT, '../../../..');
const STITCH_ROOT = path.join(
  CONTRACT,
  'sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign',
);
const OUT = path.join(REPO, 'app/spokedu/stitch/c0');

const PAGES = [
  { id: 'home', folder: 'home_spomove' },
  { id: 'education', folder: 'education_programs_spomove' },
  { id: 'private', folder: 'private_lesson_spomove' },
  { id: 'spomove', folder: 'spomove_system_spomove' },
  { id: 'records', folder: 'field_records_spomove' },
  { id: 'about', folder: 'about_spomove' },
];

function extractParts(html) {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyClassMatch = html.match(/<body[^>]*class="([^"]*)"/i);
  const configMatch = html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/i);
  const baseStyleMatch = html.match(/<style>(@layer base[\s\S]*?)<\/style>/i);
  if (!bodyMatch) throw new Error('body not found');
  return {
    title: titleMatch?.[1]?.replace(/&amp;/g, '&') ?? 'SPOMOVE',
    bodyHtml: bodyMatch[1].trim(),
    bodyClass: bodyClassMatch?.[1] ?? '',
    tailwindConfigScript: configMatch?.[1]?.trim() ?? '',
    baseLayerStyle: baseStyleMatch?.[1]?.trim() ?? '',
  };
}

function main() {
  const bodiesDir = path.join(OUT, 'bodies');
  fs.mkdirSync(bodiesDir, { recursive: true });
  const manifest = [];
  let sharedTailwind = null;

  for (const p of PAGES) {
    const src = path.join(STITCH_ROOT, p.folder, 'code.html');
    const html = fs.readFileSync(src, 'utf8');
    const parts = extractParts(html);
    if (!sharedTailwind) sharedTailwind = parts.tailwindConfigScript;
    fs.writeFileSync(path.join(bodiesDir, `${p.id}.html`), parts.bodyHtml, 'utf8');
    manifest.push({
      id: p.id,
      folder: p.folder,
      title: parts.title,
      bodyClass: parts.bodyClass,
      bytes: parts.bodyHtml.length,
    });
  }

  fs.writeFileSync(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ pages: manifest, ingestedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
  fs.writeFileSync(path.join(OUT, 'tailwind-config.js'), `${sharedTailwind}\n`, 'utf8');
  console.log(JSON.stringify({ out: OUT, manifest }, null, 2));
}

main();
