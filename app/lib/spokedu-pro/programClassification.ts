/**
 * 프로그램 분류 기준: 신체 기능, 메인 테마, 인원 구성, 표준 교구 목록.
 * API 필터와 CSV import 검증에서도 같은 값을 사용한다.
 */

export const FUNCTION_TYPES = [
  '순발력',
  '민첩성',
  '리듬감',
  '유연성',
  '협응력',
  '심폐지구력',
  '근지구력',
] as const;
export type FunctionType = (typeof FUNCTION_TYPES)[number];

export const MAIN_THEMES = [
  '상상 대체육',
  '협동',
  '경쟁',
  '안전',
  '태그',
] as const;
export type MainTheme = (typeof MAIN_THEMES)[number];

export const GROUP_SIZES = [
  '개인',
  '짝꿍',
  '소그룹',
  '대그룹',
] as const;
export type GroupSize = (typeof GROUP_SIZES)[number];

export const EQUIPMENT_CATALOG = [
  '후프',
  '스캐터밴드',
  '접시콘',
  '라바콘',
  '스태킹컵',
  '테니스공',
  '배턴스틱',
  '야구공',
  '스카프',
  '빈백',
  '코퍼밴드',
  '점프밴드',
  '루프밴드',
  '점프마커',
  '플라잉디스크',
  '꼬리벨트',
  '양면패드',
  '매트',
  '팀 조끼',
  '종이컵 허들',
  '요가블럭',
  '2인 3각',
  '뜀줄',
  '스포츠스택',
] as const;
export type EquipmentCatalogItem = (typeof EQUIPMENT_CATALOG)[number];

export function isFunctionType(value: string): value is FunctionType {
  return FUNCTION_TYPES.includes(value as FunctionType);
}

export function isMainTheme(value: string): value is MainTheme {
  return MAIN_THEMES.includes(value as MainTheme);
}

export function isGroupSize(value: string): value is GroupSize {
  return GROUP_SIZES.includes(value as GroupSize);
}

export function isEquipmentCatalogItem(value: string): value is EquipmentCatalogItem {
  return (EQUIPMENT_CATALOG as readonly string[]).includes(value);
}

function stripEquipmentSegmentSuffix(segment: string): string {
  let text = segment.trim();
  if (!text) return '';
  text = text.replace(/\s*[\(（]\s*\d+(\.\d+)?\s*[\)）]\s*$/g, '');
  text = text.replace(/\s*[x×]\s*\d+(\.\d+)?\s*$/gi, '');
  text = text.replace(/\s*\d+(\.\d+)?\s*(개|명|ea|pcs|세트|set|m|cm|mm|g|kg)\s*$/gi, '');
  text = text.replace(/\s+\d+(\.\d+)?\s*$/g, '');
  text = text.replace(/^\d+(\.\d+)?\s*[x×]\s*/i, '');
  return text.trim();
}

export function extractEquipmentDisplayTags(raw: string | null | undefined): string[] {
  const text = String(raw ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of EQUIPMENT_CATALOG) {
    if (!text.includes(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  if (out.length > 0) return out;

  return text
    .split(/[,、，\n]+/)
    .map((segment) => stripEquipmentSegmentSuffix(segment))
    .filter(Boolean)
    .filter((segment, index, arr) => arr.indexOf(segment) === index);
}
