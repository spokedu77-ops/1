import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('public program lesson content sources', () => {
  it('maps briefing and variation content only from Master meta', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/spokedu-master/programs/route.ts',
    ), 'utf8');

    expect(source).toContain('parseTextareaLines(meta?.sm_briefing_notes)');
    expect(source).toContain('parseTextareaLines(meta?.sm_variation_method)');
    expect(source).not.toContain('overlay?.checklist');
    expect(source).not.toContain('overlay?.activity_tip');
    expect(source).not.toContain('row.check_list');
  });

  it('maps participant format from structured people tags instead of legacy duration', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/spokedu-master/programs/route.ts',
    ), 'utf8');

    expect(source).toContain('const participantFormat = getMasterParticipantFormat(smTags)');
    expect(source).toContain('recommendedPlayers: participantFormat');
    expect(source).not.toContain('recommendedPlayers: displayDuration');
  });

  it('selects the new meta columns and not the retired public content sources', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/spokedu-master/programs/route.ts',
    ), 'utf8');

    expect(source).toContain('sm_briefing_notes,sm_variation_method');
    expect(source).not.toContain("video_url,activity_tip");
    expect(source).not.toContain("equipment,checklist");
    expect(source).not.toContain("url,check_list");
  });

  it('does not retain dead Funstick overlays or unused public columns', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/spokedu-master/programs/route.ts',
    ), 'utf8');

    expect(source).not.toContain('applyPremiumContentOverlay');
    expect(source).not.toContain('cleanFunstickProgram');
    expect(source).not.toContain('expert_tip');
    expect(source).not.toContain('function_type');
    expect(source).not.toContain('function_types');
    expect(source).toContain('const smTags = meta?.sm_tags ?? []');
  });

  it('does not fall back to curriculum or legacy overlay content', async () => {
    const source = await readFile(path.join(
      process.cwd(),
      'app/api/spokedu-master/programs/route.ts',
    ), 'utf8');

    expect(source).toContain(".select('id,display_order')");
    expect(source).toContain("const title = (overlay?.title ?? '').trim()");
    expect(source).toContain('const videoUrl = rawVideoUrl');
    expect(source).toContain("const rawCategory = (meta?.sm_theme ?? '').trim()");
    expect(source).not.toContain('row.title');
    expect(source).not.toContain('row.url');
    expect(source).not.toContain('row.equipment');
    expect(source).not.toContain('row.steps');
    expect(source).not.toContain('overlay?.main_theme');
    expect(source).not.toContain('overlay?.group_size');
    expect(source).not.toContain('curriculum #');
    expect(source).not.toContain('resolveTrustedReferenceVideoUrl');
    expect(source).not.toContain('applyTrustedReferenceVideo');
  });
});
