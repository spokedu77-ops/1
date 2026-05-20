/**
 * DB `session_type` → 운영 분류(라벨·캘린더 톤·themeColor) 단일 소스.
 */

type SessionTypeCategory =
  | "private_one"
  | "private"
  | "center"
  | "one_day_center"
  | "special_lecture"
  | "unknown";

/** 센터 수업과 동일 규칙(정산 기본료·피드백·파일 등)을 쓰는 DB 값 */
export const CENTER_SESSION_TYPE_VALUES = [
  "regular_center",
  "one_day_center",
  "special_lecture",
] as const;

export type CenterSessionTypeValue = (typeof CENTER_SESSION_TYPE_VALUES)[number];

export function isCenterSessionType(type: string | null | undefined): boolean {
  const t = String(type ?? "").trim();
  return (CENTER_SESSION_TYPE_VALUES as readonly string[]).includes(t);
}

function getSessionTypeCategory(type: string | null | undefined): SessionTypeCategory {
  const t = String(type ?? "").trim();
  if (!t) return "unknown";
  if (t === "one_day_private" || t === "one_day") return "private_one";
  if (t === "regular_private") return "private";
  if (t === "regular_center") return "center";
  if (t === "one_day_center") return "one_day_center";
  if (t === "special_lecture") return "special_lecture";
  return "unknown";
}

/** 특강 캘린더·FC 색 (고채도 샛노랑) */
export const SPECIAL_LECTURE_BG_HEX = "#FFE100";
export const SPECIAL_LECTURE_BORDER_HEX = "#E6C200";
export const SPECIAL_LECTURE_THEME_HEX = "#FFE100";

/** 번들/신규개설 공통: DB 값 + 화면 라벨 */
export const SESSION_TYPE_OPTIONS: {
  value:
    | "one_day_private"
    | "regular_private"
    | "regular_center"
    | "one_day_center"
    | "special_lecture";
  label: string;
}[] = [
  { value: "one_day_private", label: "과외 1회차 수업" },
  { value: "regular_private", label: "과외 수업" },
  { value: "regular_center", label: "센터 수업" },
  { value: "one_day_center", label: "원데이 (센터)" },
  { value: "special_lecture", label: "특강" },
];

/**
 * 취소/연기가 아닌 일반 행의 Tailwind 배경·테두리 (캘린더 월간 셀).
 * 특강: 샛노란(고채도, Tailwind yellow 팔레트보다 더 선명한 고정 hex).
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
    case "special_lecture":
      return "bg-[#FFE100] border-2 border-[#E6C200] shadow-sm";
    default:
      return "bg-emerald-200 border-2 border-emerald-600 shadow-sm";
  }
}

/** FullCalendar 등에서 쓰는 단색 — 특강은 샛노란 */
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
    case "special_lecture":
      return SPECIAL_LECTURE_THEME_HEX;
    default:
      return "#047857";
  }
}
