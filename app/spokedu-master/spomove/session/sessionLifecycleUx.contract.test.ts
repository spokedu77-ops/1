import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPOMOVE_SESSION_ENGINE_LAYER,
  SPOMOVE_SESSION_OVERLAY_LAYER,
} from "./sessionOverlayLayer";

const read = (name: string) =>
  readFileSync(
    join(process.cwd(), "app/spokedu-master/spomove/session", name),
    "utf8",
  );
const page = read("page.tsx");
const start = read("StartBriefing.tsx");
const settings = read("SettingsBriefing.tsx");
const result = read("MasterSessionResult.tsx");

describe("SPOMOVE session lifecycle UX", () => {
  it("separates ready confirmation from editable settings", () => {
    expect(start).toContain("data-spm-session-ready-screen");
    expect(start).not.toContain("SPOMOVE_CUE_SPEED_OPTIONS");
    expect(start).not.toContain("onCueSecondsChange");
    expect(start).toContain("실행 시작");
    expect(start).toContain("설정 변경");
    expect(start).toContain("border border-white/20");
    expect(start).not.toContain("movementSummary");
    expect(start).not.toContain("전체화면 준비");
    expect(start).not.toContain("소리 사용");
    expect(settings).toContain("data-spm-session-settings-screen");
    expect(settings).toContain("SPOMOVE_CUE_SPEED_OPTIONS");
    expect(settings).toContain("sec === recommendedCueSeconds");
    expect(page).toContain(
      "recommendedCueSeconds={effectiveRecommendedCueSeconds}",
    );
    expect(settings).not.toContain("getSpomoveDifficultyOptions");
  });

  it("keeps session overlays above the engine layer", () => {
    expect(SPOMOVE_SESSION_OVERLAY_LAYER).toBeGreaterThan(
      SPOMOVE_SESSION_ENGINE_LAYER,
    );
    const activation = page.slice(
      page.indexOf("activationBlocked ? createPortal"),
      page.indexOf("state === 'paused' && !movementSheetOpen"),
    );
    expect(activation).toContain("zIndex: SPOMOVE_SESSION_OVERLAY_LAYER");
    expect(activation).toContain("createPortal");
  });

  it("moves an engine STOP directly to the stopped-early result", () => {
    expect(page).toContain("onExit={() => finishSession('stopped_early')}");
    expect(page).toContain("finishSession(payload.completionReason, payload)");
    expect(page).not.toContain("수업을 종료할까요?");
    expect(page).not.toContain("setExitConfirmationOpen");
    expect(page).not.toContain("onClick={continueSession}");
  });

  it("keeps activation fallback non-blocking and touch targets usable", () => {
    expect(page).toContain("화면은 계속 실행됩니다.");
    expect(page).toContain("일반 화면으로 실행합니다.");
    expect(page).toContain("다시 시도");
    expect(page).toContain("min-h-11");
    expect(page).toContain("await document.documentElement.requestFullscreen?.()");
  });

  it("shows only measured operational facts and a context-aware action hierarchy", () => {
    expect(result).toContain("sessionReturnHref");
    expect(result).toContain("수업으로 돌아가기");
    expect(result).toContain("같은 설정으로 다시 준비");
    expect(result).toContain("완료로 표시하고 수업으로");
    expect(result).toContain("실행 종료와 수업 활동 완료 기록은 별개입니다");
    expect(result).not.toContain("scheduledCompletionStatus");
    expect(result).not.toContain("오늘 느낌");
    expect(result).not.toContain("스스로 점검");
    expect(result).not.toContain("실행 ID");
    expect(result).not.toContain("runId");
    expect(page).not.toContain("runId={sessionResult.runId}");
  });

  it("does not auto-PATCH SessionProgram on engine done", () => {
    const finishStart = page.indexOf("const finishSession = useCallback");
    const finishEnd = page.indexOf("const beginConfiguredSession");
    const finishBody = page.slice(finishStart, finishEnd);
    expect(finishBody).not.toContain("isCompleted");
    expect(page).toContain("markCompleteAndReturn");
  });

  it("preserves retry settings and Session/Hub return context", () => {
    expect(page).toContain("cueSeconds: effectiveCueSeconds");
    expect(page).not.toContain("difficultyValue");
    expect(page).toContain("operationCandidate");
    expect(page).toContain("hubReturn: parseSpomoveHubReturnHref");
    expect(page).toContain("returnTo: origin.returnTo");
    expect(page).toContain("session: origin.sessionId");
    expect(page).toContain("parseMasterWorkReturnHref");
  });

  it("prioritizes explicit and admin-recommended cue settings before a saved fallback", () => {
    expect(page).toContain("searchParams.get('recommendedCueSeconds')");
    expect(page).toContain("if (urlCueSeconds != null)");
    expect(page).toContain("if (recommendedCueSeconds != null)");
    expect(page).toContain("pref?.cueSeconds");
    expect(page).toContain("resolveSessionCueSeconds(officialPreset, prefCue)");
  });
});
