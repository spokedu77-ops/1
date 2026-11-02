export type StockInputValidationInput = {
  warehouseQty: number;
  confirmedTeacherHeld: number;
  legacyMappingPending: boolean;
  openingAlreadyConfirmed: boolean;
};

export type StockInputValidationResult =
  | { ok: true; qtyOnHandTotal: number; qtyAvailablePreview: number }
  | { ok: false; message: string };

/** 신규 기초재고: 사용 불가=0. 총보유=창고+확인된 강사 보유, 대여 가능=창고(대여 중 0 가정). */
export function validateStockInput(input: StockInputValidationInput): StockInputValidationResult {
  if (input.openingAlreadyConfirmed) {
    return { ok: false, message: '이미 재고가 확정된 교구입니다. 재고 조정을 사용하세요.' };
  }
  if (input.legacyMappingPending) {
    return { ok: false, message: '기존 강사 보유 기록 확인이 끝나기 전에는 재고를 확정할 수 없습니다.' };
  }
  const w = input.warehouseQty;
  const h = input.confirmedTeacherHeld;
  if (!Number.isSafeInteger(w) || w < 0) {
    return { ok: false, message: '창고 수량을 0 이상의 정수로 입력하세요.' };
  }
  const total = w + h;
  return { ok: true, qtyOnHandTotal: total, qtyAvailablePreview: w };
}
