import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildMissingMasterMetaRows } from './metaRowContract';

describe('sync-center Master meta row creation', () => {
  it('creates the minimal empty Meta payload for new overlay inserts', () => {
    expect(buildMissingMasterMetaRows([
      { curriculumId: 29, action: 'insert' },
      { curriculumId: 128, action: 'insert' },
    ], [])).toEqual([
      { curriculum_id: 29, sm_tags: [], sm_gallery_image_urls: [] },
      { curriculum_id: 128, sm_tags: [], sm_gallery_image_urls: [] },
    ]);
  });

  it('does not overwrite existing Meta rows or create rows for overlay updates', () => {
    expect(buildMissingMasterMetaRows([
      { curriculumId: 29, action: 'insert' },
      { curriculumId: 52, action: 'update' },
      { curriculumId: 128, action: 'insert' },
    ], [29])).toEqual([
      { curriculum_id: 128, sm_tags: [], sm_gallery_image_urls: [] },
    ]);
  });

  it('does not add inferred content fields to the Meta payload', () => {
    const [row] = buildMissingMasterMetaRows([
      { curriculumId: 77, action: 'insert' },
    ], []);

    expect(row).not.toHaveProperty('sm_theme');
    expect(row).not.toHaveProperty('sm_grade');
    expect(row).not.toHaveProperty('sm_space');
    expect(row).not.toHaveProperty('sm_duration');
  });

  it('is called by both overlay insertion paths without mutating GET handlers', async () => {
    const syncRoute = await readFile(path.join(
      process.cwd(),
      'app/api/admin/spokedu-master/programs/sync-center/route.ts',
    ), 'utf8');
    const seedRoute = await readFile(path.join(
      process.cwd(),
      'app/api/admin/spokedu-master/programs/seed-reference-videos/route.ts',
    ), 'utf8');
    const syncGet = syncRoute.slice(
      syncRoute.indexOf('export async function GET'),
      syncRoute.indexOf('export async function POST'),
    );

    expect(syncRoute).toContain('buildMissingMasterMetaRows(');
    expect(seedRoute).toContain('buildMissingMasterMetaRows(');
    expect(syncRoute).toContain('ignoreDuplicates: true');
    expect(seedRoute).toContain('ignoreDuplicates: true');
    expect(syncGet).not.toContain('.upsert(');
    expect(syncGet).not.toContain('.insert(');
  });

  it('syncs only shared center curriculum fields into the subscription overlay', async () => {
    const syncRoute = await readFile(path.join(
      process.cwd(),
      'app/api/admin/spokedu-master/programs/sync-center/route.ts',
    ), 'utf8');

    expect(syncRoute).toContain("const SYNC_FIELDS = ['title', 'video_url', 'equipment', 'activity_method'] as const");
    expect(syncRoute).toContain(".select('id,title,url,equipment,steps')");
    expect(syncRoute).toContain(".select('id,source_center_curriculum_id,title,video_url,equipment,activity_method,updated_at')");
    expect(syncRoute).not.toContain('checklist');
    expect(syncRoute).not.toContain('activity_tip');
    expect(syncRoute).not.toContain('expert_tip');
    expect(syncRoute).not.toContain('check_list');
  });
});
