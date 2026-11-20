import { describe, expect, it } from "vitest";
import {
  SHOWREEL_DURATION,
  activeActAt,
  logoOvertureState,
  sharedBeadState,
} from "../src/features/landing/showreelMotion";

describe("Knowledge.Show(me) hero logo overture and showreel motion", () => {
  it("constructs the Knowledge.Show(me) hero logo cleanly and removes the golden dot completely during Acts 1-3", () => {
    expect(activeActAt(0.2).id).toBe("logo");
    const hold = logoOvertureState(3.6);
    expect(hold.opacity).toBe(1);
    expect(hold.kStemDraw).toBeCloseTo(1, 3);
    expect(hold.prismFill).toBeCloseTo(1, 3);
    expect(hold.knowledgeIn).toBeCloseTo(1, 3);
    expect(hold.showIn).toBeCloseTo(1, 3);
    expect(hold.dotX).toBeCloseTo(400, 0);
    expect(hold.dotY).toBeCloseTo(354, 0);
    expect(hold.dotOpacity).toBe(1);

    // Zero floating golden dot during Act 1 (Dice), Act 2 (Prism), and Act 3 (PN)
    for (const cycle of [7.5, 12.0, 18.0, 22.0, 27.5, 32.0]) {
      const state = logoOvertureState(cycle);
      expect(state.opacity).toBe(0);
      expect(state.dotOpacity).toBe(0);
      expect(state.returnSparkOpacity).toBe(0);
    }

    // Smooth return spark condenses right before loop wraparound
    const wrap = logoOvertureState(SHOWREEL_DURATION - 0.1);
    expect(wrap.returnSparkOpacity).toBeGreaterThan(0.95);
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
