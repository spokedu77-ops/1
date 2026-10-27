import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("Class Ops reference API contract", () => {
  it("requires canonical admin authorization and returns only the approved teacher read model", () => {
    expect(source).toContain("requireAdmin()");
    expect(source).toContain("getServiceSupabase()");
    expect(source).toContain(".eq('role', 'teacher')");
    expect(source).not.toContain("select('*')");
    expect(source).not.toMatch(/insert\(|update\(|delete\(|upsert\(/);
  });

  it("uses the existing paginated session count log reader", () => {
    expect(source).toContain("fetchTeacherLogCounts");
  });
});
