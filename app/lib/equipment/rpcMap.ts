export function mapEquipmentRpcError(message: string): { status: number; code: string; error: string } {
  const m = message ?? '';
  if (m.includes('EQUIPMENT_IDEMPOTENCY_CONFLICT')) {
    return { status: 409, code: 'IDEMPOTENCY_CONFLICT', error: '동일 요청 키로 다른 내용이 이미 처리되었습니다.' };
  }
  if (m.includes('EQUIPMENT_INSUFFICIENT_AVAILABLE')) {
    return { status: 409, code: 'INSUFFICIENT_AVAILABLE', error: '가용 재고가 부족합니다.' };
  }
  if (m.includes('RETURN_EXCEEDS_OUTSTANDING')) {
    return { status: 409, code: 'RETURN_EXCEEDS_OUTSTANDING', error: '반납 수량이 대여 잔량을 초과합니다.' };
  }
  if (m.includes('EQUIPMENT_ADJUST_BELOW_COMMITTED')) {
    return { status: 409, code: 'ADJUST_BELOW_COMMITTED', error: '총보유를 대여·격리 아래로 줄일 수 없습니다.' };
  }
  if (m.includes('EQUIPMENT_REQUEST_INVALID')) {
    return { status: 400, code: 'INVALID_REQUEST', error: '요청 형식이 올바르지 않습니다.' };
  }
  if (m.includes('EQUIPMENT_CATALOG_NOT_FOUND') || m.includes('EQUIPMENT_RENTAL_NOT_FOUND')) {
    return { status: 404, code: 'NOT_FOUND', error: '대상을 찾을 수 없습니다.' };
  }
  return { status: 500, code: 'RPC_ERROR', error: '수불 처리에 실패했습니다.' };
}
