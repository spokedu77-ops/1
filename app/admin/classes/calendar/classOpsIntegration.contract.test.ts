import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const desktop = readFileSync(new URL("./MonthExcelGrid.tsx", import.meta.url), "utf8");
const mobile = readFileSync(new URL("./MobileThreeDayView.tsx", import.meta.url), "utf8");
const policy = readFileSync(new URL("./components/ClassOpsPolicyReference.tsx", import.meta.url), "utf8");

describe("Class Ops integrated calendar contract", () => {
  it("keeps the existing detail panel and main/assistant teacher filtering path", () => {
    expect(page).toContain("<ClassBundlePanel");
    expect(page).toContain("setFilterTeacher");
    expect(page).toContain("ClassOpsTeacherDirectory");
  });

  it("uses the V2 1024px monthly boundary and renders every monthly event", () => {
    expect(desktop).toContain("min-[1024px]:block");
    expect(mobile).toContain("min-[1024px]:hidden");
    expect(page).toContain('(min-width: 1024px)');
    expect(desktop).not.toContain("MAX_VISIBLE_EVENTS");
    expect(desktop).not.toContain("onOpenDay");
    expect(desktop).toContain('const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]');
  });

  it("renders policy values from the mileage SSOT", () => {
    expect(policy).toContain('MILEAGE_ACTIONS.map');
    expect(policy).toContain('TEACHER_TIER_IDS.map');
    expect(policy).not.toContain("2500,");
  });
});
