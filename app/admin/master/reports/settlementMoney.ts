import { evaluateExpression } from './settlementSheetCore';

/** Display only: the original expression remains the persisted value. */
export function formatMoneyExpression(value: string | number): string {
  return String(value).replace(/,/g, '').replace(/\d+(?:\.\d+)?/g, (token) => {
    const [integer, fraction] = token.split('.');
    return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
  });
}

export function formatSettlementAmount(value: string | number, sessions: string | number): string {
  const amount = evaluateExpression(value, sessions);
  if (amount === undefined) return '—';
  if (!Number.isFinite(amount)) return '계산식 확인 필요';
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}
