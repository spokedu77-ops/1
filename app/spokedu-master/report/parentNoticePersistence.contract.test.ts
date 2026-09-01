import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const report = readFileSync('app/spokedu-master/report/page.tsx', 'utf8');
const route = readFileSync('app/api/spokedu-master/sessions/[sessionId]/parent-notice/route.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260901155330_spokedu_master_session_reopen_and_parent_notice.sql', 'utf8');

describe('parent notice persistence contract', () => {
  it('persists teacher edits against an owned completed session', () => {
    expect(migration).toContain('add column if not exists parent_notice text');
    expect(route).toContain("requireSpokeduMasterCapability('records')");
    expect(route).toContain(".eq('owner_id', access.userId)");
    expect(route).toContain(".eq('status', 'completed')");
  });

  it('separates saving from copying and exposes dirty state', () => {
    expect(report).toContain('안내문 저장');
    expect(report).toContain('저장하지 않은 변경사항이 있습니다.');
    expect(report).toContain('navigator.clipboard.writeText(notice)');
  });
});
