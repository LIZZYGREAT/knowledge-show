import { describe, expect, it } from "vitest";
import { centerAt, flowMesh, flowState, surfaceAt } from "../src/features/landing/flowGeometry";

describe("continuous flow surface", () => {
  it("tapers both ends through growth, so the leading edge has no flat cut", () => {
    for (const time of [0, .5, 1.6, 3, 5.5, 25]) {
      const extent = flowState(time).extent;
      for (const u of [0, extent]) {
        const center = centerAt(u, time);
        for (const v of [-1.3, -.5, .5, 1.3]) {
          const point = surfaceAt(u, v, time);
          expect(Math.hypot(point[0] - center[0], point[1] - center[1])).toBeLessThan(.001);
        }
      }
    }
  });

  it("keeps the opening continuous into rest instead of switching geometry", () => {
    for (const time of [0.8, 2.2, 4.2, 4.8, 5.5]) {
      const before = surfaceAt(.6, .7, time - .001);
      const after = surfaceAt(.6, .7, time + .001);
      expect(Math.hypot(before[0] - after[0], before[1] - after[1])).toBeLessThan(.2);
    }
    expect(flowMesh(6).silhouette).not.toBe(flowMesh(7).silhouette);
  });

  it("uses a smaller mesh on phones while preserving the same boundary", () => {
    const full = flowMesh(5.5);
    const compact = flowMesh(5.5, true);
    expect(compact.bands.length).toBeLessThan(full.bands.length);
    for (const u of [0, .2, .4, .6, .8, 1]) {
      for (const v of [-1.4, 0, 1.4]) {
        const [x, y] = surfaceAt(u, v, 5.5);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(800);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(640);
      }
    }
  });
});
