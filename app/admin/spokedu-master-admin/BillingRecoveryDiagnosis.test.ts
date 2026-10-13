import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BillingRecoveryDiagnosis, type RecoveryPreview } from './BillingRecoveryDiagnosis';

const preview = (status: RecoveryPreview['diagnosis']['status'], phase: RecoveryPreview['diagnosis']['processing']['phase'] = 'not_processing'): RecoveryPreview => ({ diagnosis: { status, label: status === 'applied' ? '정상 반영' : '복구 후보', orderKind: 'renewal', evidence: ['승인 식별 근거 확인'], blockers: [], checksRequired: ['Toss 최종 상태 확인'], entitlement: { applied: status === 'applied', subscriptionActive: true, plan: 'premium' }, processing: { warningAt: null, reclaimableAt: null, phase }, recommendedAction: '추가 확인 후 별도 승인 절차 검토' } });
const render = (props: Parameters<typeof BillingRecoveryDiagnosis>[0]) => renderToStaticMarkup(createElement(BillingRecoveryDiagnosis, props));

describe('BillingRecoveryDiagnosis', () => {
  it('renders evidence and keeps diagnosis read-only', () => {
    const markup = render({ preview: preview('recovery_candidate', 'warning'), loading: false, error: '' });
    expect(markup).toContain('복구 진단');
    expect(markup).toContain('읽기 전용');
    expect(markup).toContain('조기 경고');
    expect(markup).toContain('Toss 최종 상태 확인');
    expect(markup).not.toMatch(/>복구 실행<|>다시 결제<|>환불 실행</);
  });

  it('renders applied and lookup-error states distinctly', () => {
    expect(render({ preview: preview('applied'), loading: false, error: '' })).toContain('정상 반영');
    expect(render({ preview: null, loading: false, error: '데이터 조회 오류' })).toContain('데이터 조회 오류');
  });
});