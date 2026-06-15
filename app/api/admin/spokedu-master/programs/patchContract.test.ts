import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('admin program PATCH contract', () => {
  it('does not run the full programs loader after saving', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/admin/spokedu-master/programs/route.ts',
    ), 'utf8');
    const patchSource = source.slice(source.indexOf('export async function PATCH'));

    expect(patchSource).not.toContain('loadPrograms()');
    expect(patchSource).toContain('loadSavedAdminProgram(curriculumId');
    expect(patchSource).not.toContain('total: data.length');
  });

  it('does not refresh the full admin or public program list after a normal save', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/admin/spokedu-master/programs/page.tsx',
    ), 'utf8');
    const saveStart = source.indexOf('const save = async () =>');
    const saveEnd = source.indexOf('const selectedQuality =', saveStart);
    const saveSource = source.slice(saveStart, saveEnd);

    expect(saveSource).not.toContain('load()');
    expect(saveSource).not.toContain('reloadPrograms()');
    expect(saveSource).not.toContain('json.data');
    expect(saveSource).toContain('replaceAdminProgramByCurriculumId');
  });

  it('does not mirror Master content into legacy overlay fields', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/admin/spokedu-master/programs/route.ts',
    ), 'utf8');
    const patchSource = source.slice(source.indexOf('export async function PATCH'));

    expect(patchSource).not.toContain('legacyMirrorSaved');
    expect(patchSource).not.toContain('legacy-mirror');
    expect(patchSource).not.toContain('replaceExactSection');
    expect(patchSource).not.toContain('checklist:');
    expect(patchSource).not.toContain('activity_tip:');
  });

  it('does not load retired checklist or activity tip fields for the editor', async () => {
    const routeSource = await readFile(path.join(
      process.cwd(),
      'app/api/admin/spokedu-master/programs/route.ts',
    ), 'utf8');
    const pageSource = await readFile(path.join(
      process.cwd(),
      'app/admin/spokedu-master/programs/page.tsx',
    ), 'utf8');

    expect(routeSource).not.toContain('check_list');
    expect(routeSource).not.toContain('checklist');
    expect(routeSource).not.toContain('activity_tip');
    expect(pageSource).not.toContain('checklist');
    expect(pageSource).not.toContain('activity_tip');
    expect(pageSource).toContain('resolveAdminBriefingNotes(meta?.sm_briefing_notes)');
    expect(pageSource).toContain('resolveAdminVariationMethod(meta?.sm_variation_method)');
  });
});
