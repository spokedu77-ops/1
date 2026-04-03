import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { GROUP_ALIAS_RULES } from "./groupAliases";

/** 리스트/번들과 동일한 수업명 정제 */
export function getCleanClassTitle(title: string): string {
  const original = title ?? "";
  const cleaned = original
    .replace(/\b\d+\s*\/\s*\d+\b/g, " ")
    .replace(/\b\d+\s*(회차|회|차)\b/g, " ")
    .replace(/[|_]/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || original.trim();
}

/**
 * 리스트/캘린더 번들 묶음 키.
 * 제목 끝의 `(연기 처리)`, `(정재원 / 성연호)` 등 괄호 구간은 같은 수업으로 보고 제거합니다.
 * (별칭 `normalizeForAlias`와 동일한 괄호 제거를 번들 키에도 적용)
 */
export function getBundleTitleKey(title: string): string {
  return getCleanClassTitle(title)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 담당이 비어 있을 때 복합 키용 (서로 동일해야 같은 번들) */
const TEACHER_NONE = "__none__";
const BUNDLE_KEY_SEP = "::";

/**
 * 같은 수업명 + 같은 담당 강사(created_by)면 별도로 개설했어도 한 번들로 묶음.
 * `teacherId`는 sessions.created_by / SessionEvent.teacherId 와 동일한 UUID.
 */
export function makeBundleCompositeKey(teacherId: string | null | undefined, title: string): string {
  const tid = String(teacherId ?? "").trim() || TEACHER_NONE;
  const tk = getBundleTitleKey(title);
  return `${tid}${BUNDLE_KEY_SEP}${tk}`;
}

/** 리스트/포커스 복합 키에서 모달 헤더용 수업명만 */
export function getBundleTitleFromCompositeKey(compositeKey: string): string {
  const i = compositeKey.indexOf(BUNDLE_KEY_SEP);
  if (i === -1) return compositeKey;
  return compositeKey.slice(i + BUNDLE_KEY_SEP.length).trim() || compositeKey;
}

function normalizeForAlias(rawTitle: string) {
  return getCleanClassTitle(rawTitle).replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

export function getAliasTitleForGroup(rawTitle: string): string | null {
  const t = normalizeForAlias(rawTitle);
  for (const rule of GROUP_ALIAS_RULES) {
    const ok = rule.matchAny.some((m) => m.titleIncludesAll.every((needle) => t.includes(needle)));
    if (ok) return rule.aliasTitle;
  }
  return null;
}

export type V2BundleSelection = { bundleTitle: string; groupIds: string[] };

/**
 * 리스트 "상세"와 동일하게:
 * - 별칭이면 별칭 규칙대로 group_id 수집
 * - 아니면 **같은 담당(teacherId) + 같은 정제 수업명**인 모든 group_id (별도 개설도 포함)
 */
export function resolveV2BundleFromSession(
  ev: SessionEvent,
  allSessions: SessionEvent[]
): V2BundleSelection {
  const gid = ev.groupId ? String(ev.groupId) : "";
  if (!gid) {
    return {
      bundleTitle: getBundleTitleKey(ev.title) || getCleanClassTitle(ev.title) || ev.title || "수업",
      groupIds: [],
    };
  }

  const alias = getAliasTitleForGroup(ev.title);
  if (alias) {
    const groupIds = new Set<string>();
    for (const s of allSessions) {
      if (!s.groupId) continue;
      if (getAliasTitleForGroup(s.title) === alias) groupIds.add(String(s.groupId));
    }
    const ids = Array.from(groupIds);
    return { bundleTitle: alias, groupIds: ids.length ? ids : [gid] };
  }

  const titleKey = getBundleTitleKey(ev.title);
  const evTid = String(ev.teacherId ?? "").trim() || TEACHER_NONE;
  const groupIds = new Set<string>();
  for (const s of allSessions) {
    if (!s.groupId) continue;
    const sTid = String(s.teacherId ?? "").trim() || TEACHER_NONE;
    if (sTid !== evTid) continue;
    if (getBundleTitleKey(s.title) !== titleKey) continue;
    groupIds.add(String(s.groupId));
  }
  const ids = Array.from(groupIds);
  const displayTitle = titleKey || ev.title || "수업";
  return { bundleTitle: displayTitle, groupIds: ids.length ? ids : [gid] };
}
