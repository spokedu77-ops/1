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

export function isFunctionType(v: string): v is FunctionType {
  return FUNCTION_TYPES.includes(v as FunctionType);
}
export function isMainTheme(v: string): v is MainTheme {
  return MAIN_THEMES.includes(v as MainTheme);
}
export function isGroupSize(v: string): v is GroupSize {
  return GROUP_SIZES.includes(v as GroupSize);
}
