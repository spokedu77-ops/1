import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node scripts/pdf-pages-to-png.mjs <path-to.pdf>');
  process.exit(1);
}

const { pdf } = await import('pdf-to-img');
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'pdf-pages');
mkdirSync(outDir, { recursive: true });

let i = 0;
for await (const image of await pdf(pdfPath, { scale: 2 })) {
  i += 1;
  const out = join(outDir, `page-${String(i).padStart(2, '0')}.png`);
  writeFileSync(out, image);
  console.log('wrote', out);
}
console.log('total pages:', i);
