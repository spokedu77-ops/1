import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Premium SPOMOVE media boundary', () => {
  it('keeps guide video packs out of Home and Browse browser preload', () => {
    for (const path of [
      'app/spokedu-master/dashboard/DashboardView.tsx',
      'app/spokedu-master/spomove/SpomoveHubView.tsx',
    ]) {
      const source = read(path);
      expect(source).not.toContain('SPOMOVE_GUIDE_VIDEO_PACK_ID');
      expect(source).not.toContain('normalizeSpomoveGuideVideoMap');
      expect(source).toContain('useSpomoveGuideVideo');
    }
  });

  it('gates and signs only private-bucket objects on the server', () => {
    const route = read('app/api/spokedu-master/spomove/guide-video/route.ts');
    expect(route).toContain("requireSpokeduMasterCapability('spomove')");
    expect(route).toContain('SPOMOVE_PREMIUM_MEDIA_BUCKET');
    expect(read('app/lib/spomove/spomoveOfficialAssets.ts')).toContain("'spokedu-master-premium-media'");
    expect(route).toContain('createSignedUrl');
    expect(route).toContain('PREMIUM_MEDIA_NOT_MIGRATED');
    expect(route).not.toContain("from('iiwarmup-files')");
    expect(route).not.toContain('/object/public/');
  });

  it('keeps Lite URLs out of browser state and plays Premium signed objects directly', () => {
    const hook = read('app/spokedu-master/spomove/useSpomoveGuideVideo.ts');
    const sheet = read('app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx');
    expect(hook).toContain('if (!presetId || !enabled) return');
    expect(hook).toContain("state: 'locked'");
    expect(sheet).toContain('<video controls preload="metadata" src={videoUrl}');
    expect(sheet).toContain("guideVideoState === 'locked'");
    expect(sheet).toContain("guideVideoState === 'missing'");
  });

  it('prevents Admin from persisting new public guide-video URLs', () => {
    const admin = read('app/admin/spokedu-master/programs/page.tsx');
    expect(admin).toContain('isPrivateSpomoveGuideVideoRef');
    expect(admin).toContain('guides/preset-id.mp4');
    expect(admin).not.toContain('placeholder="https://www.youtube.com/watch?v=..."');
  });

  it('does not mutate the shared bucket in the staging migration', () => {
    const migration = read('supabase/migrations/20260902071422_spokedu_master_private_premium_media.sql');
    expect(migration).toContain("'spokedu-master-premium-media'");
    expect(migration).toContain('false');
    expect(migration).not.toMatch(/update\s+storage\.buckets[\s\S]*iiwarmup-files/i);
  });
});
