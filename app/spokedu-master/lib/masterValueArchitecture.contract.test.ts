import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('VALUE / Connected Memory continuity', () => {
  const activity = read('app/spokedu-master/activity/page.tsx');
  const capture = read('app/spokedu-master/activity/SessionCapturePanel.tsx');
  const nextMigration = read('supabase/migrations/20260823120000_spokedu_master_create_next_session.sql');
  const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
  const panel = read('app/spokedu-master/components/value/MasterValueEvidencePanel.tsx');
  const evidenceLib = read('app/spokedu-master/lib/masterSubscriberValueEvidence.ts');

  it('PREM-01: Capture memory surfaces in PREP and next planner without auto-writing current memo', () => {
    expect(activity).toContain('captureMode={workspace?.captureMode');
    expect(activity).toContain('<SessionCapturePanel');
    expect(capture).toContain("captureMode === 'memory'");
    expect(capture).toContain('지난 수업에서 이어갈 점');
    expect(activity).not.toMatch(/setMemo\(previous/);
  });

  it('LIFECYCLE-01: next Session reuses Class + selective programs and starts with empty memo', () => {
    expect(nextMigration).toContain('v_source.class_id');
    expect(nextMigration).toContain("'scheduled', null, null");
    expect(activity).toContain('sourceSessionProgramIds: selectedCarryoverIds');
    expect(activity).toContain('PreviousActivityCarryover');
    expect(activity).toContain('buildNextSessionDraft');
  });

  it('VALUE-01: Home keeps Today above value evidence and renders evidence as quiet secondary', () => {
    const todayIdx = dashboard.indexOf('<TodaySessionsPanel');
    const featuredIdx = dashboard.indexOf('data-dashboard-section="featured-flow"');
    const evidenceIdx = dashboard.indexOf('surface="home"');
    const opsIdx = dashboard.indexOf('data-dashboard-section="operations-flow"');
    expect(todayIdx).toBeGreaterThan(-1);
    expect(featuredIdx).toBeGreaterThan(todayIdx);
    expect(evidenceIdx).toBeGreaterThan(featuredIdx);
    expect(opsIdx).toBeGreaterThan(evidenceIdx);
    expect(dashboard).toContain('activation="none"');
    expect(panel).toContain("surface === 'home'");
    expect(panel).toContain('구독에서 운영 환경 확인');
  });

  it('VALUE-04: evidence ordering prefers reuse over raw usage', () => {
    expect(evidenceLib).toContain("label: '다음 수업 메모'");
    expect(evidenceLib).toContain("kind: 'memory'");
    expect(evidenceLib).toContain('NEXT PREPARED / MEMORY > continuity upcoming > raw usage');
    expect(evidenceLib.indexOf("label: '다음 수업 메모'")).toBeLessThan(evidenceLib.indexOf("label: '완료 수업'"));
  });
});
