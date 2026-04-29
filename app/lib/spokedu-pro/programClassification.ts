/**
 * 프로그램 분류 — 기능 종류, 메인테마, 인원구성
 * PTG(Play-Think-Grow)는 슬로건이며, 분류는 아래 3가지로 사용.
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
  '육상놀이체육',
  '협동형',
  '경쟁형',
  '도전형',
  '태그형',
] as const;
export type MainTheme = (typeof MAIN_THEMES)[number];

export const GROUP_SIZES = [
  '개인',
  '짝꿍',
  '소그룹',
  '대그룹',
] as const;
export type GroupSize = (typeof GROUP_SIZES)[number];

/** 프로그램 뱅크 필터·표기용 활용 교구(표준 목록) */
export const EQUIPMENT_CATALOG = [
  '후프',
  '스탭레더',
  '접시콘',
  '라바콘',
  '스태킹 컵',
  '테니스공',
  '펀스틱',
  '피구공',
  '스카프',
  '빈백',
  '코퍼밴드',
  '점프밴드',
  '루프밴드',
  '원마커',
  '플라잉 디스크',
  '태권도미트',
  '양면패드',
  '안대',
  '팀조끼',
  '접이식 허들',
  '요가블럭',
  '2인 3각',
  '풍선',
  '포스트잇',
] as const;
export type EquipmentCatalogItem = (typeof EQUIPMENT_CATALOG)[number];

export function isFunctionType(v: string): v is FunctionType {
  return FUNCTION_TYPES.includes(v as FunctionType);
}
export function isMainTheme(v: string): v is MainTheme {
  return MAIN_THEMES.includes(v as MainTheme);
}
export function isGroupSize(v: string): v is GroupSize {
  return GROUP_SIZES.includes(v as GroupSize);
}

export function isEquipmentCatalogItem(v: string): v is EquipmentCatalogItem {
  return (EQUIPMENT_CATALOG as readonly string[]).includes(v);
}

function stripEquipmentSegmentSuffix(segment: string): string {
  let t = segment.trim();
  if (!t) return '';
  t = t.replace(/\s*[\(（]\s*\d+(\.\d+)?\s*[\)）]\s*$/g, '');
  t = t.replace(/\s*[x×]\s*\d+(\.\d+)?\s*$/gi, '');
  t = t.replace(/\s*\d+(\.\d+)?\s*(개|명|ea|pcs|장|세트|set|m|cm|mm|g|kg)\s*$/gi, '');
  t = t.replace(/\s+\d+(\.\d+)?\s*$/g, '');
  t = t.replace(/^\d+(\.\d+)?\s*[x×]\s*/i, '');
  return t.trim();
}

/**
 * 프로그램 뱅크 썸네일 등: equipment 원문에서 **교구 이름만** 추출.
 * 표준 목록(EQUIPMENT_CATALOG)에 포함된 이름은 원문 부분 문자열로 매칭,
 * 없으면 구분자로 나눈 뒤 접미의 개수·단위를 제거한 토큰을 사용.
 */
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
    .split(/[,，、/\n]+/)
    .map((s) => stripEquipmentSegmentSuffix(s))
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i);
}
