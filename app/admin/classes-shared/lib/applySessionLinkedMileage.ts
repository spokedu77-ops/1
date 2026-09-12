import { MILEAGE_ACTIONS } from "@/app/admin/classes-shared/constants/mileage";
import { extractMileageAction, getMileageTotal, parseExtraTeachers } from "@/app/admin/classes-shared/lib/sessionUtils";
import { devLogger } from "@/app/lib/logging/devLogger";

type MileageClient = {
  from: (table: string) => any;
};

function formatSessionDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

function buildSessionTitleWithDate(title: string | null, dateIso?: string | null): string {
  const base = (title ?? "")
    .replace(/\s*\([^()]*\d{4}[^()]*\d{1,2}[^()]*\d{1,2}[^()]*\)\s*$/, "")
    .trim();
  if (!dateIso) return base;
  const dateStr = formatSessionDate(dateIso);
  return base ? `${base} (${dateStr})` : dateStr;
}

export function appendMileageActionLabel(prev: string, label: string): string {
  const selected = prev
    ? prev.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (selected.includes(label)) return selected.join(",");
  return [...selected, label].join(",");
}

/** 수업 연동 마일리지: sessions.mileage_option + users.points + mileage_logs (모달과 동일) */
export async function applySessionLinkedMileage(
  supabase: MileageClient,
  input: {
    sessionId: string;
    sessionStartAt: string | null;
    title: string | null;
    memo: string | null | undefined;
    mileage_option: string | null | undefined;
    created_by: string | null;
    nextActionStr: string;
  }
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const prevStr = extractMileageAction(input.memo || "", input.mileage_option ?? undefined).mileageAction;
  const oldTotal = getMileageTotal(prevStr, MILEAGE_ACTIONS);
  const newTotal = getMileageTotal(input.nextActionStr, MILEAGE_ACTIONS);
  const diff = newTotal - oldTotal;

  const { error: sessionError } = await supabase
    .from("sessions")
    .update({ mileage_option: input.nextActionStr })
    .eq("id", input.sessionId);
  if (sessionError) return { ok: false, error: sessionError.message };

  const sessionTitle = buildSessionTitleWithDate(input.title, input.sessionStartAt);
  const { extraTeachers } = parseExtraTeachers(input.memo || "");
  const extras = extraTeachers.slice(0, 2).filter((t) => t.id);
  const mainId =
    input.created_by && String(input.created_by).trim() ? String(input.created_by).trim() : null;
  const teacherIds: string[] = [];
  if (mainId) teacherIds.push(mainId);
  for (const ex of extras) {
    if (ex.id && !teacherIds.includes(ex.id)) teacherIds.push(ex.id);
  }

  if (diff !== 0) {
    for (const teacherId of teacherIds) {
      const { data: user } = await supabase.from("users").select("points").eq("id", teacherId).single();
      await supabase
        .from("users")
        .update({ points: (user?.points ?? 0) + diff })
        .eq("id", teacherId);
    }
  }

  const { error: clearLogError } = await supabase
    .from("mileage_logs")
    .delete()
    .eq("session_id", input.sessionId)
    .like("reason", "[수업연동%");
  if (clearLogError) {
    devLogger.error("수업연동 마일리지 로그 정리 에러:", clearLogError);
    return { ok: true, warning: "마일리지는 반영되었지만 이전 로그 정리에 실패했습니다." };
  }

  if (newTotal !== 0 && teacherIds.length > 0) {
    const reasonVerb = newTotal < 0 ? "차감" : "원복";
    const rows: Array<{
      teacher_id: string;
      amount: number;
      reason: string;
      session_title: string;
      session_id: string;
      session_started_at: string | null;
    }> = [];
    if (mainId) {
      rows.push({
        teacher_id: mainId,
        amount: newTotal,
        reason: `[수업연동] ${reasonVerb}: ${input.nextActionStr}`,
        session_title: sessionTitle,
        session_id: input.sessionId,
        session_started_at: input.sessionStartAt,
      });
    }
    for (const ex of extras) {
      if (!ex.id) continue;
      rows.push({
        teacher_id: ex.id,
        amount: newTotal,
        reason: `[수업연동/보조] ${reasonVerb}: ${input.nextActionStr}`,
        session_title: sessionTitle,
        session_id: input.sessionId,
        session_started_at: input.sessionStartAt,
      });
    }
    if (rows.length > 0) {
      const { error: logError } = await supabase.from("mileage_logs").insert(rows);
      if (logError) {
        devLogger.error("마일리지 로그 저장 에러:", logError);
        return { ok: true, warning: "마일리지는 반영되었지만 로그 저장에 실패했습니다." };
      }
    }
  }

  return { ok: true };
}
