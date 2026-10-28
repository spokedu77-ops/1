import { describe, expect, it } from "vitest";
import { getMonthGrid } from "./dateGrid";

describe("getMonthGrid Monday-first calendar", () => {
  it("places a Sunday month start in the last column", () => {
    const grid = getMonthGrid(new Date(2026, 1, 1));
    expect(grid.cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid.cells[6]?.getDay()).toBe(0);
    expect(grid.cells[6]?.getDate()).toBe(1);
  });

  it("places a Monday month start in the first column", () => {
    const grid = getMonthGrid(new Date(2026, 5, 1));
    expect(grid.cells[0]?.getDay()).toBe(1);
    expect(grid.cells[0]?.getDate()).toBe(1);
  });
});
