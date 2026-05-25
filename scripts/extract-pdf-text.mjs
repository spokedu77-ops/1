import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node scripts/extract-pdf-text.mjs <path-to.pdf>');
  process.exit(1);
}

const { PDFParse } = await import('pdf-parse');
const buf = readFileSync(pdfPath);
const parser = new PDFParse({ data: buf });
const result = await parser.getText();
const text = result.text ?? '';
const out = join(dirname(fileURLToPath(import.meta.url)), 'extracted-intro.txt');
writeFileSync(out, text, 'utf8');
console.log(text);
console.log('\n--- saved to scripts/extracted-intro.txt ---');
