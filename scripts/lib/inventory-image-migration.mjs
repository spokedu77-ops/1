import { createHash } from 'node:crypto';

export const INVENTORY_IMAGE_BUCKET = 'spokedu-inventory-images';
export const PRODUCTION_PROJECT_REF = 'mwgvserdyflsqyhcqecp';

const MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export function projectRefFromUrl(url) {
  const hostname = new URL(url).hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost') return 'local';
  const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
  if (!match) throw new Error('Unsupported Supabase URL.');
  return match[1];
}

export function decodeDataImage(value) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value ?? '');
  if (!match) throw new Error('Unsupported Base64 image value.');
  const mime = match[1];
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (bytes.length === 0) throw new Error('Empty Base64 image value.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const md5 = createHash('md5').update(value).digest('hex');
  const extension = MIME_EXTENSIONS.get(mime);
  return { mime, bytes, sha256, md5, extension, path: `sha256/${sha256.slice(0, 2)}/${sha256}.${extension}` };
}

export function buildImageMigrationPlan(catalogRows, inventoryRows) {
  const rows = [];
  for (const [table, values] of [['catalog', catalogRows], ['inventory', inventoryRows]]) {
    for (const row of values ?? []) {
      if (typeof row.image !== 'string' || !row.image.startsWith('data:image/')) continue;
      const decoded = decodeDataImage(row.image);
      rows.push({ table, id: row.id, source: row.image, ...decoded });
    }
  }
  const unique = new Map();
  for (const row of rows) {
    const existing = unique.get(row.sha256);
    if (existing && !existing.bytes.equals(row.bytes)) throw new Error('SHA-256 collision detected.');
    if (!existing) unique.set(row.sha256, row);
  }
  const fingerprint = createHash('sha256').update(JSON.stringify(rows.map((row) => [row.table, row.id, row.sha256]).sort())).digest('hex');
  return { rows, unique: Array.from(unique.values()), fingerprint };
}
