import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getMasterRequestErrorMessage, MasterClientRequestError } from './masterRequestError';
import { toMasterClientError, toNetworkMasterClientError } from './clientErrors';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MASTER Field Reliability — work preservation / mutation / resume', () => {
  it('RESUME-01 / REL-01: SessionSheet guards unsaved attendance/memo and soft-reconciles server truth', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('unsavedWork');
    expect(activity).toContain('beforeunload');
    expect(activity).toContain('저장하지 않은 변경이 있습니다');
    expect(activity).toContain('requestClose');
    expect(activity).toContain('data.sessions.find((item) => item.id === editing.id)');
  });

  it('FAIL-01: Session mutations use safe client error messages and keep retry copy', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('getMasterRequestErrorMessage');
    expect(activity).toContain('sessionMutationError');
    expect(activity).not.toMatch(/setError\(caught instanceof Error \? caught\.message/);
    expect(activity).toContain('입력 내용은 유지되어 있습니다');

    const network = getMasterRequestErrorMessage(new MasterClientRequestError(toNetworkMasterClientError()));
    expect(network).toContain('인터넷');
    const validation = getMasterRequestErrorMessage(new MasterClientRequestError(toMasterClientError(400, 'spokedu_master_sessions constraint')));
    expect(validation).not.toMatch(/spokedu_master_|constraint/i);
  });

  it('REL-02: Operational soft reload keeps lists visible on field return', () => {
    const provider = read('app/spokedu-master/operational/OperationalDataProvider.tsx');
    expect(provider).toContain("mode: 'hard' | 'soft'");
    expect(provider).toContain("reload('soft')");
    expect(provider).toContain("if (mode === 'hard')");
    expect(provider).toContain('clearData()');
  });

  it('REL-06: activity toggle/reorder/remove share saving lock', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('|| saving) return');
    expect(activity).toMatch(/toggleProgram[\s\S]*setSaving\(true\)/);
    expect(activity).toMatch(/moveProgram[\s\S]*setSaving\(true\)/);
  });

  it('BILL-01: Payment unlocks after Toss auth handoff so cancel can retry', () => {
    const payment = read('app/spokedu-master/payment/page.tsx');
    expect(payment).toContain('setWorkingPlan(plan)');
    expect(payment).toContain('setWorkingPlan(null)');
    expect(payment).toContain('setTimeout');
  });

  it('FIELD-LITE / FIELD-PREM anchors remain in Session complete → next path', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('completeSession');
    expect(activity).toContain('다음 수업 만들기');
    expect(activity).toContain('sourceSessionProgramIds');
    expect(activity).toContain('createNextSession');
  });

  it('DENSE-01: documents full hydrate as known soft-refresh scope (no silent pagination)', () => {
    const provider = read('app/spokedu-master/operational/OperationalDataProvider.tsx');
    const sessionsRoute = read('app/api/spokedu-master/sessions/route.ts');
    expect(provider).toContain('/api/spokedu-master/sessions');
    expect(sessionsRoute).not.toContain('.range(');
    expect(sessionsRoute).not.toContain('limit:');
  });
});
