import type { SessionEvent } from "@/app/admin/classes/types";
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
 * 리스트 "상세"와 동일하게: 별칭이면 별칭에 속한 모든 group_id, 아니면 정제 제목이 같은 모든 group_id.
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

  const key = getBundleTitleKey(ev.title);
  const groupIds = new Set<string>();
  for (const s of allSessions) {
    if (!s.groupId) continue;
    if (getBundleTitleKey(s.title) === key) groupIds.add(String(s.groupId));
  }
  const ids = Array.from(groupIds);
  return { bundleTitle: key || ev.title || "수업", groupIds: ids.length ? ids : [gid] };
}
