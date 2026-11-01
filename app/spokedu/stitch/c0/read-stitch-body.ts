import fs from 'node:fs';
import path from 'node:path';

const BODIES_DIR = path.join(process.cwd(), 'app/spokedu/stitch/c0/bodies');

export function readStitchC0Body(pageId: string): string {
  const file = path.join(BODIES_DIR, `${pageId}.html`);
  return fs.readFileSync(file, 'utf8');
}

export function readStitchTailwindConfigScript(): string {
  const file = path.join(process.cwd(), 'app/spokedu/stitch/c0/tailwind-config.js');
  let raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw.includes('important:')) {
    raw = raw.replace('tailwind.config={', "tailwind.config={important:'.stitch-c0-root',");
  }
  return raw;
}
