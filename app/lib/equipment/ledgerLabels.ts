const EVENT_LABELS: Record<string, string> = {
  OPENING_BALANCE_MIGRATION: '기초잔액',
  RENT: '대여',
  RETURN: '반납',
  ADJUST_ON_HAND: '재고 조정',
  QUARANTINE_ADJUST: '격리 조정',
};

export function equipmentEventTypeLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}
