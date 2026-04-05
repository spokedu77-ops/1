/**
 * DB `session_type` → 4가지 운영 분류(라벨·캘린더 톤·themeColor) 단일 소스.
 */

export type SessionTypeCategory = "private_one" | "private" | "center" | "one_day_center" | "unknown";

export function getSessionTypeCategory(type: string | null | undefined): SessionTypeCategory {
  const t = String(type ?? "").trim();
  if (!t) return "unknown";
  if (t === "one_day_private" || t === "one_day") return "private_one";
  if (t === "regular_private") return "private";
  if (t === "regular_center") return "center";
  if (t === "one_day_center") return "one_day_center";
  return "unknown";
}

/** 번들/신규개설 공통: DB 값 + 화면 라벨 */
export const SESSION_TYPE_OPTIONS: {
  value: "one_day_private" | "regular_private" | "regular_center" | "one_day_center";
  label: string;
}[] = [
  { value: "one_day_private", label: "과외 1회차 수업" },
  { value: "regular_private", label: "과외 수업" },
  { value: "regular_center", label: "센터 수업" },
  { value: "one_day_center", label: "원데이 (센터)" },
];

/**
 * 취소/연기가 아닌 일반 행의 Tailwind 배경·테두리 (캘린더 월간 셀).
 * hue·명도를 띄워 4종이 한눈에 구분되게: 틸 / 에메랄드 / 블루 / 오렌지.
 */
export function monthRowToneClassesForSessionType(type: string | null | undefined): string {
  const cat = getSessionTypeCategory(type);
  switch (cat) {
    case "private_one":
      return "bg-teal-200 border-2 border-teal-600 shadow-sm";
    case "private":
      return "bg-emerald-200 border-2 border-emerald-600 shadow-sm";
    case "center":
      return "bg-blue-200 border-2 border-blue-600 shadow-sm";
    case "one_day_center":
      return "bg-orange-200 border-2 border-orange-600 shadow-sm";
    default:
      return "bg-emerald-200 border-2 border-emerald-600 shadow-sm";
  }
}

/** FullCalendar 등에서 쓰는 단색 (4분류 + 기본) — 위 톤과 동일 계열의 진한 색 */
export function themeColorHexForSessionType(type: string | null | undefined): string {
  const cat = getSessionTypeCategory(type);
  switch (cat) {
    case "private_one":
      return "#0f7663";
    case "private":
      return "#047857";
    case "center":
      return "#1d4ed8";
    case "one_day_center":
      return "#c2410c";
    default:
      return "#047857";
  }
}
