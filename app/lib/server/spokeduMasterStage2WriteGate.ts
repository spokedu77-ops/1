import { privateNoStoreJson } from './privateNoStore';

type PostgresErrorLike = { code?: string | null; message?: string | null } | null | undefined;

export const STAGE2_WRITE_GATE_ERROR = 'stage2_cutover_write_gate_active';

export function isStage2WriteGateError(error: PostgresErrorLike) {
  return error?.code === '55P03' && String(error.message ?? '').includes(STAGE2_WRITE_GATE_ERROR);
}

export function stage2WriteGateResponse() {
  return privateNoStoreJson({
    error: 'Stage 2 전환 점검 중에는 수업 기록을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    code: 'STAGE2_CUTOVER_WRITE_GATE',
    retryable: true,
  }, {
    status: 503,
    headers: { 'Retry-After': '30' },
  });
}
