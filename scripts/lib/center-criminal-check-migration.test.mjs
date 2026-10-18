import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMigrationPlan,
  centerFilesFingerprint,
  LEGACY_BUCKET,
  PRIVATE_BUCKET,
  projectRefFromUrl,
  sha256,
  transitionCenterFiles,
} from './center-criminal-check-migration.mjs';

const centerId = '11111111-1111-4111-8111-111111111111';
const referencedPath = `centers/${centerId}/criminal-check/file.pdf`;

test('buildMigrationPlan includes only referenced legacy files and preserves unreferenced objects', () => {
  const plan = buildMigrationPlan({
    centers: [{ id: centerId, criminal_check_files: [{ name: 'file.pdf', path: referencedPath }] }],
    sourceObjects: [
      { path: referencedPath, metadata: { size: 4, mimetype: 'application/pdf' } },
      { path: `centers/${centerId}/criminal-check/orphan.pdf`, metadata: { size: 4, mimetype: 'application/pdf' } },
    ],
    expectedReferenced: 1,
    expectedUnreferenced: 1,
  });
  assert.equal(plan.jobs.length, 1);
  assert.equal(plan.unreferenced.length, 1);
});

test('buildMigrationPlan fails closed on count or ownership mismatch', () => {
  assert.throws(() => buildMigrationPlan({
    centers: [{ id: centerId, criminal_check_files: [{ name: 'file.pdf', path: 'centers/other/criminal-check/file.pdf' }] }],
    sourceObjects: [{ path: 'centers/other/criminal-check/file.pdf' }],
    expectedReferenced: 1,
    expectedUnreferenced: 0,
  }), /ownership/);
});

test('synthetic dry-run inventory accepts exactly 19 referenced and preserves 3 unreferenced files', () => {
  const centers = Array.from({ length: 19 }, (_, index) => {
    const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    return {
      id,
      criminal_check_files: [{ name: `fixture-${index + 1}.pdf`, path: `centers/${id}/criminal-check/fixture-${index + 1}.pdf` }],
    };
  });
  const referencedObjects = centers.map((center) => ({
    path: center.criminal_check_files[0].path,
    metadata: { size: 8, mimetype: 'application/pdf' },
  }));
  const unreferencedObjects = Array.from({ length: 3 }, (_, index) => ({
    path: `centers/00000000-0000-4000-8000-999999999999/criminal-check/preserved-${index + 1}.pdf`,
    metadata: { size: 8, mimetype: 'application/pdf' },
  }));
  const plan = buildMigrationPlan({
    centers,
    sourceObjects: [...referencedObjects, ...unreferencedObjects],
  });
  assert.equal(plan.references.length, 19);
  assert.equal(plan.jobs.length, 19);
  assert.equal(plan.unreferenced.length, 3);
  assert.equal(sha256(Buffer.from('source')), sha256(Buffer.from('source')));
  assert.notEqual(sha256(Buffer.from('source')), sha256(Buffer.from('changed')));
});

test('transitionCenterFiles preserves the list and changes only the selected bucket', () => {
  const untouched = `centers/${centerId}/criminal-check/other.pdf`;
  const before = [
    { name: 'file.pdf', path: referencedPath },
    { name: 'other.pdf', path: untouched },
  ];
  const { current, next } = transitionCenterFiles(before, centerId, referencedPath);
  assert.deepEqual(current, before);
  assert.deepEqual(next, [
    { name: 'file.pdf', path: referencedPath, bucket: PRIVATE_BUCKET },
    { name: 'other.pdf', path: untouched },
  ]);
  assert.notEqual(centerFilesFingerprint(current), centerFilesFingerprint(next));
});

test('transitionCenterFiles refuses an already-migrated or concurrently changed reference', () => {
  assert.throws(() => transitionCenterFiles([
    { name: 'file.pdf', path: referencedPath, bucket: PRIVATE_BUCKET },
  ], centerId, referencedPath), /changed/);
});

test('projectRefFromUrl accepts canonical Supabase and explicit local URLs only', () => {
  assert.equal(projectRefFromUrl('https://stanouvgklynytjtlnif.supabase.co'), 'stanouvgklynytjtlnif');
  assert.equal(projectRefFromUrl('http://127.0.0.1:54321'), 'local');
  assert.equal(projectRefFromUrl('http://localhost:54321'), 'local');
  assert.throws(() => projectRefFromUrl('https://example.com'), /project-ref/);
  assert.equal(LEGACY_BUCKET, 'iiwarmup-files');
});
