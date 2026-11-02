import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("Class Ops reference API contract", () => {
  it("requires canonical admin authorization and returns only the approved teacher read model", () => {
    expect(source).toContain("requireAdmin()");
    expect(source).toContain("getServiceSupabase()");
    expect(source).toContain(".in('role', ['teacher', 'admin', 'master'])");
    expect(source).not.toContain("select('*')");
    expect(source).not.toMatch(/insert\(|update\(|delete\(|upsert\(/);
  });

  it("uses the existing paginated session count log reader", () => {
    expect(source).toContain("fetchTeacherLogCounts");
  });

  it("keeps registered operators selectable before excluding test labels", () => {
    expect(source).toContain(".select('id, name, email, role, is_admin')");
    const operatorCheck = source.indexOf('if (isPlatformAdminFromUserRow(candidate)) return true;');
    expect(operatorCheck).toBeGreaterThan(-1);
    const nameExclusion = source.indexOf(".test(candidate.name ?? '')");
    expect(nameExclusion).toBeGreaterThan(-1);
    expect(nameExclusion).toBeLessThan(operatorCheck);
    expect(operatorCheck).toBeLessThan(source.indexOf('const label ='));
  });
});
