import { describe, expect, it } from "vitest";
import { combinationState, stageState, inkState, FLOW_DRAW_DURATION, STAGE_DURATION, STATIC_STAGE_TIME, SILK_REDRAW_START, pnState } from "../src/features/landing/curiosityMotion";

describe("dice demonstration", () => {
  it("draws the original flow from a point before the ink transition", () => {
    expect(inkState(0).flowTime).toBe(0);
    expect(inkState(2.5).flowTime).toBe(2.5);
    const drawn = inkState(FLOW_DRAW_DURATION);
    expect(drawn.flowTime).toBe(FLOW_DRAW_DURATION);
    expect(drawn.bloom).toBe(0);
    expect(drawn.question).toBe(0);
    expect(drawn.fold).toBe(0);
    expect(stageState(FLOW_DRAW_DURATION).t).toBe(0);
  });
  it("reveals knowledge in ink and holds the completed ribbon across the loop seam", () => {
    const full = inkState(STATIC_STAGE_TIME);
    expect(full.bloom).toBe(1);
    expect(full.silkOpacity).toBe(0);
    const initial = inkState(FLOW_DRAW_DURATION);
    const end = inkState(STAGE_DURATION - .001);
    for (const key of ["bloom", "fold", "silkOpacity", "scale", "flowTime", "question"] as const) {
      expect(end[key]).toBeCloseTo(initial[key], 3);
    }
  });
  it("collapses PN completely before drawing the ribbon forward from the point", () => {
    expect(pnState(36).exit).toBe(1);
    expect(pnState(36).opacity).toBe(0);
    expect(inkState(36).silkOpacity).toBe(0);
    expect(inkState(36).seedOpacity).toBe(1);
    const frames = [0, 1, 2.5, 4, FLOW_DRAW_DURATION].map(offset => inkState(SILK_REDRAW_START + offset));
    expect(frames.map(frame => frame.flowTime)).toEqual([0, 1, 2.5, 4, FLOW_DRAW_DURATION]);
    expect(frames.every(frame => frame.scale === 1)).toBe(true);
    expect(inkState(STAGE_DURATION).flowTime).toBe(FLOW_DRAW_DURATION);
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
