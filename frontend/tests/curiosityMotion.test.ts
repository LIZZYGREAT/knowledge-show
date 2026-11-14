import { describe, expect, it } from "vitest";
import { combinationState, stageState, inkState, STAGE_DURATION, STATIC_STAGE_TIME } from "../src/features/landing/curiosityMotion";

describe("dice demonstration", () => {
  it("reveals the full knowledge scene in ink and restores the silk at the loop seam", () => {
    const full = inkState(STATIC_STAGE_TIME);
    expect(full.bloom).toBe(1);
    expect(full.silkOpacity).toBe(0);
    const initial = inkState(0);
    const end = inkState(STAGE_DURATION - .001);
    for (const key of ["bloom", "fold", "silkOpacity", "scale", "flowTime", "question"] as const) {
      expect(end[key]).toBeCloseTo(initial[key], 3);
    }
  });
  it("preserves all 36 ordered outcomes and their triangular sum distribution", () => {
    const groups = new Map<number, Set<number>>();
    let highlighted = 0;
    for (let i = 0; i < 36; i++) {
      const point = combinationState(i, STATIC_STAGE_TIME);
      const ys = groups.get(point.x) ?? new Set();
      ys.add(point.y);
      groups.set(point.x, ys);
      highlighted += Number(point.highlight === 1);
    }
    expect([...groups.values()].map(ys => ys.size)).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
    expect(highlighted).toBe(6);
  });
  it("returns every object to its initial pose without a discontinuity", () => {
    expect(stageState(0)).toEqual(stageState(STAGE_DURATION));
    for (let i = 0; i < 36; i++) {
      const first = combinationState(i, 0);
      const last = combinationState(i, STAGE_DURATION - .001);
      expect(last.x).toBeCloseTo(first.x, 3);
      expect(last.y).toBeCloseTo(first.y, 3);
      expect(last.opacity).toBe(0);
      expect(last.highlight).toBe(first.highlight);
    }
  });
});
