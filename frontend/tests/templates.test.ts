import { describe, expect, it } from "vitest";
import { profiles } from "../src/animation/styles/profiles";
import { validateVector } from "../src/animation/runtime/validateVector";
import { COMPONENT_CATALOG } from "../src/animation/templates/componentLibrary";
import {
  buildComponentPreview,
  buildTemplateDemo,
} from "../src/animation/templates/templateDemos";
import { resolveStyleIdFromPreference } from "../src/common/api";

describe("template demos and reusable component library", () => {
  it("validates all four 1:1 template demos against the vector runtime contract", () => {
    expect(profiles).toHaveLength(4);
    for (const profile of profiles) {
      const demo = buildTemplateDemo(profile.id);
      expect(demo.styleId).toBe(profile.id);
      expect(demo.resource.style.id).toBe(profile.id);
      expect(() => validateVector(demo.scene, demo.resource)).not.toThrow();
    }
  });

  it("validates all 8 reusable visual components across all 4 style templates", () => {
    expect(COMPONENT_CATALOG).toHaveLength(8);
    for (const component of COMPONENT_CATALOG) {
      for (const profile of profiles) {
        const preview = buildComponentPreview(component.id, profile.id);
        expect(preview.resource.style.id).toBe(profile.id);
        expect(() =>
          validateVector(preview.scene, preview.resource),
        ).not.toThrow();
      }
    }
  });

  it("resolves explicit template names and compound preferences into exact style_id", () => {
    expect(resolveStyleIdFromPreference("纸艺编辑风")).toBe("paper-editorial");
    expect(resolveStyleIdFromPreference("纸艺编辑风：柔和暖光")).toBe(
      "paper-editorial",
    );
    expect(resolveStyleIdFromPreference("precision-science")).toBe(
      "precision-science",
    );
    expect(resolveStyleIdFromPreference("modern-graphic")).toBe(
      "modern-graphic",
    );
    expect(resolveStyleIdFromPreference("叙事拼贴风")).toBe("narrative-collage");
    expect(resolveStyleIdFromPreference("随便柔和一点")).toBe("auto");
    expect(resolveStyleIdFromPreference("")).toBe("auto");
  });
});
