/**
 * 드래그 앤 드롭 유틸리티
 * 템플릿 ID와 슬롯 week_key 매핑
 */

export interface DragData {
  templateId: string;
  templateTitle?: string;
}

/**
 * 드래그 데이터를 JSON 문자열로 변환
 */
export function serializeDragData(data: DragData): string {
  return JSON.stringify(data);
}

/**
 * 드래그 데이터를 파싱
 */
export function parseDragData(data: string): DragData | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * week_key 생성
 */
export function generateWeekKey(year: number, month: number, week: number): string {
  return `${year}-${String(month).padStart(2, '0')}-W${week}`;
}

/**
 * week_key 파싱 (W1~W4만 유효, 그 외는 null)
 * 2026-01-W9 같은 입력은 무조건 null
 */
export function parseWeekKey(weekKey: string): { year: number; month: number; week: number } | null {
  const match = weekKey.match(/^(\d{4})-(\d{2})-W([1-4])$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    week: Number(match[3])
  };
}

/** 48주 = 12개월×4주. 시스템 표준 슬롯 수 */
const SLOTS_PER_YEAR = 48;

/**
 * 48주 슬롯 생성 (1월 1주차 ~ 12월 4주차)
 * week_key = YYYY-MM-W{1..4}
 */
export function generate48WeekSlots(year: number): Array<{ weekKey: string; month: number; week: number }> {
  const slots: Array<{ weekKey: string; month: number; week: number }> = [];
  for (let month = 1; month <= 12; month++) {
    for (let week = 1; week <= 4; week++) {
      slots.push({
        weekKey: generateWeekKey(year, month, week),
        month,
        week
      });
    }
  }
  return slots;
}

/**
 * @deprecated Use generate48WeekSlots. 48 slots fixed; alias kept for compatibility.
 */
export function generate52WeekSlots(year: number): Array<{ weekKey: string; month: number; week: number }> {
  return generate48WeekSlots(year);
}
