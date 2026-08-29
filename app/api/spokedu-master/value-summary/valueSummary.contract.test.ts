import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('app/api/spokedu-master/value-summary/route.ts', 'utf8');
const home = readFileSync('app/spokedu-master/dashboard/DashboardView.tsx', 'utf8');

describe('value summary API contract', () => {
  it('keeps all facts owner-scoped and completed counts based on completed_at', () => {
    expect(route.match(/\.eq\('owner_id', ownerId\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(route).toContain(".eq('status', 'completed')");
    expect(route).toContain(".gte('completed_at', range.from)");
    expect(route).toContain(".eq('status', 'scheduled')");
    expect(route).toContain(".gt('start_at', now.toISOString())");
    expect(route).toContain(".gte('spokedu_master_sessions.completed_at', range.from)");
  });
  it('returns aggregate facts only and treats capture as optional', () => {
    expect(route).not.toMatch(/student_name|parent_note_snapshot/);
    expect(route).toContain("stage: 'memory_optional'");
    expect(route).toContain('available: false');
  });
  it('keeps Home focused on Weekly curation and one continuity action', () => {
    expect(home).toContain('HomeContinuityPanel');
    expect(home).toContain('data-dashboard-section="featured-flow"');
    expect(home).not.toContain('surface="home"');
    expect(home).not.toContain('data-dashboard-section="operations-flow"');
  });
});
