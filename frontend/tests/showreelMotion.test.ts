import { describe, expect, it } from "vitest";
import { seedPositionAt, sharedBeadState } from "../src/features/landing/showreelMotion";

describe("homepage showreel motion geometry", () => {
  it("anchors the curiosity spark into each act's focal visual object instead of floating in empty space", () => {
    const [a1x, a1y] = seedPositionAt(7.2);
    expect(a1x).toBeCloseTo(548, 0);
    expect(a1y).toBeCloseTo(276, 0);

    const [a2x, a2y] = seedPositionAt(14.5);
    expect(a2x).toBeCloseTo(400, 0);
    expect(a2y).toBeCloseTo(314, 0);

    const [a3x, a3y] = seedPositionAt(24.0);
    expect(a3x).toBeCloseTo(674, 0);
    expect(a3y).toBeCloseTo(286, 0);
  });

  it("keeps all PN junction carriers strictly inside the glass chamber and clear of top region badges", () => {
    const badgeBottomY = 186;
    for (const cycle of [21.2, 23.0, 25.5, 27.5]) {
      let visibleCount = 0;
      for (let i = 0; i < 36; i++) {
        const bead = sharedBeadState(i, cycle);
        if (bead.opacity > 0.05) {
          visibleCount += 1;
          expect(bead.y - bead.r).toBeGreaterThan(badgeBottomY + 24);
          expect(bead.y + bead.r).toBeLessThan(364);
          expect(bead.kind === "hole" || bead.kind === "electron").toBe(true);
        }
      }
      expect(visibleCount).toBe(22);
    }
  });
});
