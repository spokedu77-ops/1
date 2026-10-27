import { describe, expect, it } from "vitest";
import { getMonthGrid } from "./dateGrid";

describe("getMonthGrid Sunday-first calendar", () => {
  it("places a Sunday month start in the first column", () => {
    const grid = getMonthGrid(new Date(2026, 1, 1));
    expect(grid.cells[0]?.getDay()).toBe(0);
    expect(grid.cells[0]?.getDate()).toBe(1);
  });

  it("pads a Monday month start with one Sunday cell", () => {
    const grid = getMonthGrid(new Date(2026, 5, 1));
    expect(grid.cells[0]).toBeNull();
    expect(grid.cells[1]?.getDay()).toBe(1);
    expect(grid.cells[1]?.getDate()).toBe(1);
  });
});
