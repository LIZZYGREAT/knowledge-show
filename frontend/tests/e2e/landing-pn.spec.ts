import { test, expect } from "@playwright/test";
import { STAGE_DURATION, SILK_REDRAW_START } from "../../src/features/landing/curiosityMotion";

test("home adapts PN polarity and instrument motion then restores silk", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [seconds, split] of [[23, false], [28.5, false], [33.5, true]] as const) {
    await page.goto(`/?stage-pose=${seconds / STAGE_DURATION}`);
    const scene = page.locator(".stage-pn");
    await expect(scene.locator("[data-pn-particle]")).toHaveCount(64);
    await expect(scene.locator('[data-pn-device="comparison"]')).toHaveAttribute("opacity", split ? "1" : "0");
    await expect(scene).toHaveAttribute("data-pn-mode", split ? "compare" : seconds >= 28.5 ? "reverse" : "forward");
    expect(Number(await scene.getAttribute("data-scene-ms"))).toBeGreaterThan(0);
    expect(await scene.locator('[data-pn-device="main"] [data-pn-assembly]').getAttribute("transform"))
      .toContain(seconds >= 28.5 ? "rotate(180" : "rotate(0");
  }
  const widths: number[] = [];
  const starts: number[] = [];
  await page.goto(`/?stage-pose=${36 / STAGE_DURATION}`);
  await expect(page.locator(".stage-pn")).toHaveAttribute("opacity", "0");
  await expect(page.locator(".stage-silk")).toHaveAttribute("opacity", "0");
  const gap = await page.locator(".stage-pn").evaluate(el => {
    const seed = document.querySelector(".idea-seed")!.getBoundingClientRect();
    return Math.max(...[...el.querySelectorAll<SVGCircleElement>("[data-pn-particle]")].map(particle => {
      const point = new DOMPoint(particle.cx.baseVal.value, particle.cy.baseVal.value).matrixTransform(particle.getScreenCTM()!);
      return Math.hypot(point.x - seed.x - seed.width / 2, point.y - seed.y - seed.height / 2);
    }));
  });
  expect(gap).toBeLessThan(1);
  for (const offset of [.5, 2, 5.5]) {
    await page.goto(`/?stage-pose=${(SILK_REDRAW_START + offset) / STAGE_DURATION}`);
    await expect(page.locator(".stage-silk")).toHaveAttribute("opacity", "1");
    starts.push(Number(await page.locator(".stage-silk").getAttribute("data-reveal-from")));
    widths.push((await page.locator(".stage-silk .flow-body").boundingBox())!.width);
  }
  expect(starts[0]).toBeGreaterThan(starts[1]);
  expect(starts[2]).toBe(0);
  expect(widths[0]).toBeLessThan(widths[1]);
  expect(widths[1]).toBeLessThan(widths[2]);
  const complete = await page.locator(".flow-body").getAttribute("d");
  await page.goto("/?stage-pose=1");
  expect(await page.locator(".flow-body").getAttribute("d")).toBe(complete);
  expect(errors).toEqual([]);
});

test("dice faces carry stable pip values through rotation", async ({ page }) => {
  for (const seconds of [8, 9.5, 10.6]) {
    await page.goto(`/?stage-pose=${seconds / STAGE_DURATION}`);
    for (const die of ["ivory", "green"]) {
      const faces = page.locator(`[data-die="${die}"] [data-face]`);
      expect(await faces.count()).toBeGreaterThan(0);
      expect(await faces.count()).toBeLessThanOrEqual(3);
      for (const face of await faces.all()) {
        expect(await face.locator("circle").count()).toBe(Number(await face.getAttribute("data-face")) * 2);
        expect(await face.getAttribute("transform")).not.toMatch(/NaN|Infinity/);
      }
    }
  }
});
