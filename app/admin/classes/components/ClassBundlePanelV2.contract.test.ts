import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ClassBundlePanel.tsx", import.meta.url), "utf8");

describe("ClassBundlePanel V2 UI contract", () => {
  it("keeps the existing mutation handlers and exception tools", () => {
    for (const handler of [
      "applyInlineUpdate",
      "saveSessionSchedule",
      "handleBulkApplyToGroup",
      "handleBulkApplyAssistToGroup",
      "handlePostpone",
      "handleUndoPostpone",
      "handleRestoreCancelledSession",
      "handleRestartCycle",
      "SessionMileageModal",
    ]) expect(source).toContain(handler);
  });

  it("adds the V2 fixed identity, operational summary and cycle navigation", () => {
    expect(source).toContain('aria-label="수업 상세 관리"');
    expect(source).toContain('aria-label="수업 운영 요약"');
    expect(source).toContain('aria-label="사이클 선택"');
    expect(source).toContain("bundleSummary");
  });
});
