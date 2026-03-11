/**
 * 스크린 플레이 카탈로그: CSV → JSON 변환.
 * 사용: node scripts/csv-to-screenplay-catalog.js <csv경로>
 * 출력: public/data/screenplay-catalog.json (디렉터리 없으면 생성)
 *
 * CSV 헤더: id,mode_id,title,subtitle,description,sort_order,preset_ref,thumbnail_url
 */

const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/csv-to-screenplay-catalog.js <csv경로>');
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'public', 'data');
const outPath = path.join(outDir, 'screenplay-catalog.json');

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function rowToItem(row) {
  const id = row.id ? (Number(row.id) || row.id) : row.id;
  const sortOrder = Number(row.sort_order) || 0;
  return {
    id: id ?? 0,
    modeId: String(row.mode_id || '').trim() || 'CHALLENGE',
    title: String(row.title || '').trim() || '제목 없음',
    subtitle: String(row.subtitle || '').trim() || undefined,
    description: String(row.description || '').trim() || undefined,
    sortOrder,
    presetRef: String(row.preset_ref || '').trim() || undefined,
    thumbnailUrl: String(row.thumbnail_url || '').trim() || undefined,
  };
}

try {
  const raw = fs.readFileSync(path.resolve(csvPath), 'utf8');
  const rows = parseCsv(raw);
  const items = rows.map(rowToItem).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`Written ${items.length} items to ${outPath}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
