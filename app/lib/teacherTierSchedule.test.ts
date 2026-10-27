import { describe, expect, it } from "vitest";
import { effectiveFees, getTierDefaultFees, HARD_CODED_TIER_FEES } from "./teacherTierSchedule";

describe("teacher fee zero semantics", () => {
  it("preserves an explicit zero in the tier fee map", () => {
    const fees = getTierDefaultFees("rookie", {
      rookie: { ...HARD_CODED_TIER_FEES.rookie, fee_private: 0 },
    });
    expect(fees.fee_private).toBe(0);
  });

  it("inherits on null but preserves an explicit teacher zero", () => {
    const fees = effectiveFees("rookie", {
      fee_private: null,
      fee_group: 0,
      fee_center_main: null,
      fee_center_assist: null,
    });
    expect(fees.fee_private).toBe(HARD_CODED_TIER_FEES.rookie.fee_private);
    expect(fees.fee_group).toBe(0);
  });
});
