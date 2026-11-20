import { describe, expect, it } from "vitest";
import {
  SHOWREEL_DURATION,
  activeActAt,
  logoOvertureState,
  sharedBeadState,
} from "../src/features/landing/showreelMotion";

describe("Knowledge.Show(me) Origami Prism-K overture and showreel motion", () => {
  it("folds all 3 origami planes cleanly, reveals Knowledge.Show(me), and removes the dot during Acts 1-3", () => {
    expect(activeActAt(0.2).id).toBe("logo");
    const hold = logoOvertureState(3.7);
    expect(hold.opacity).toBe(1);
    expect(hold.spineIn).toBeCloseTo(1, 3);
    expect(hold.upperWingIn).toBeCloseTo(1, 3);
    expect(hold.lowerWingIn).toBeCloseTo(1, 3);
    expect(hold.coreIn).toBeCloseTo(1, 3);
    expect(hold.knowledgeIn).toBeCloseTo(1, 3);
    expect(hold.showIn).toBeCloseTo(1, 3);
    expect(hold.meIn).toBeCloseTo(1, 3);
    expect(hold.dotOpacity).toBe(1);
    expect(hold.guideOpacity).toBe(0);

    // Zero floating dot or leftover overture layers during Act 1 (Dice), Act 2 (Prism), and Act 3 (PN)
    for (const cycle of [7.5, 12.0, 18.0, 22.0, 27.5, 32.0]) {
      const state = logoOvertureState(cycle);
      expect(state.opacity).toBe(0);
      expect(state.dotOpacity).toBe(0);
      expect(state.returnAuraOpacity).toBe(0);
    }

    // Soft caustic aura blooms smoothly right before loop wraparound
    const wrap = logoOvertureState(SHOWREEL_DURATION - 0.1);
    expect(wrap.returnAuraOpacity).toBeGreaterThan(0.95);
  });

  it("keeps all PN junction carriers strictly inside the glass chamber and clear of top region badges", () => {
    const badgeBottomY = 186;
    for (const cycle of [26.5, 28.0, 30.8, 33.0]) {
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
