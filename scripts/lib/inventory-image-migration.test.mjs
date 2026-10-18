import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImageMigrationPlan, decodeDataImage } from './inventory-image-migration.mjs';

const image = `data:image/png;base64,${Buffer.from('synthetic-image').toString('base64')}`;

test('decodes a supported data URL and derives a content path', () => {
  const decoded = decodeDataImage(image);
  assert.equal(decoded.mime, 'image/png');
  assert.match(decoded.path, /^sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.png$/);
  assert.equal(decoded.bytes.toString(), 'synthetic-image');
});
test('deduplicates identical bytes while preserving every row transition', () => {
  const plan = buildImageMigrationPlan([{ id: 1, image }], [{ id: 2, image }, { id: 3, image }]);
  assert.equal(plan.rows.length, 3);
  assert.equal(plan.unique.length, 1);
});
