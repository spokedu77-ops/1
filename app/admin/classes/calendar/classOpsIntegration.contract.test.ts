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

  it("uses the approved 801px desktop boundary so 768px renders three days", () => {
    expect(desktop).toContain("min-[801px]:block");
    expect(mobile).toContain("min-[801px]:hidden");
    expect(page).toContain('(min-width: 801px)');
  });

  it("renders policy values from the mileage SSOT", () => {
    expect(policy).toContain('MILEAGE_ACTIONS.map');
    expect(policy).toContain('TEACHER_TIER_IDS.map');
    expect(policy).not.toContain("2500,");
  });
});
