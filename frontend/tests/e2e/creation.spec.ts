import { test, expect } from "@playwright/test";
test("composes, preserves preferences and returns from missing API settings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始创作" }).click();
  await expect(page.getByLabel("你想让大家了解什么？")).toHaveValue("");
  await page.getByRole("button", { name: "生日悖论" }).click();
  await page.getByLabel("有没有特别想讲的？").fill("重点讲直觉");
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  await page.getByLabel("你的讲述方式").fill("从悬念讲起");
  await page.getByRole("button", { name: "故事悬念", exact: true }).click();
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  await expect(page.getByLabel("你的讲述方式")).toHaveValue("从悬念讲起");
  await page.getByText("更多创作偏好", { exact: false }).click();
  await page.getByLabel("想出现的内容").fill("例子\n公式");
  await page.getByLabel("美术风格偏好").fill("纸张与细线");
  await page.getByLabel("你的创意", { exact: true }).fill("从误会开始");
  await page.getByLabel("希望避开的内容").fill("复杂术语\n广告");
  await page.getByRole("button", { name: "开始创作", exact: false }).click();
  await expect(page.getByRole("dialog")).toContainText("重点讲直觉");
  await page.getByRole("button", { name: "确认，开始制作" }).click();
  await expect(page.getByRole("dialog")).toContainText("模型连接");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "准备把这个问题变成动画",
  );
  await page.getByRole("button", { name: "返回修改" }).click();
  await expect(page.getByLabel("想出现的内容")).toHaveValue("例子\n公式");
  await expect(page.getByLabel("美术风格偏好")).toHaveValue("纸张与细线");
  await expect(page.getByLabel("你的创意", { exact: true })).toHaveValue(
    "从误会开始",
  );
  await expect(page.getByLabel("希望避开的内容")).toHaveValue("复杂术语\n广告");
});
test("key stays out of persistent browser storage and cannot fake connection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByLabel("API Key", { exact: true })
    .fill("placeholder-credential-for-test");
  await expect(page.getByLabel("API Key", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("密钥未发送");
  await expect(page.getByRole("button", { name: "本次使用" })).toBeDisabled();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: "" });
  await page.reload();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByLabel("API Key", { exact: true })).toHaveValue("");
});
test("demo has explicit events, recoverable failure, no fabricated preview", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始创作" }).click();
  await page.getByRole("button", { name: "查看流程演示" }).click();
  await expect(page.getByText("流程演示 · 模拟事件")).toBeVisible();
  await page.getByRole("button", { name: "下一条演示事件" }).click();
  await page.getByRole("button", { name: "演示失败", exact: true }).click();
  await expect(page.locator(".creation-timeline .failed")).toHaveCount(1);
  await page.getByRole("button", { name: "重试此步骤" }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "下一条演示事件" }).click();
  await expect(page.getByRole("status")).toContainText("尚无真实动画资源");
  await expect(page.getByRole("button", { name: "进入工作台" })).toHaveCount(0);
});
for (const width of [375, 768, 1280, 1440, 1920])
  test(`responsive layout ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /让知识，\s*动起来。/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const landing = await page.locator(".landing").boundingBox();
    expect(landing!.width).toBeGreaterThanOrEqual(Math.min(width, 1500) - 2);
    const brand = await page.locator(".brand").boundingBox();
    const settings = await page.locator(".settings-button").boundingBox();
    expect(brand!.x + brand!.width).toBeLessThan(settings!.x);
    const theatre = await page.locator(".paper-theatre").boundingBox();
    const sheet = await page.locator(".paper-sheet").boundingBox();
    expect(sheet!.height / theatre!.height).toBeGreaterThan(0.65);
    await page.getByRole("button", { name: "开始创作" }).click();
    const composer = await page.locator(".composer").boundingBox();
    expect(composer!.width).toBeGreaterThanOrEqual(Math.min(width, 1380) - 2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByText("更多创作偏好", { exact: false }).click();
    const layout = await page.locator(".preferences").evaluate((el) => {
      const children = [...el.children].map((node) =>
        node.getBoundingClientRect(),
      );
      return {
        widths: children.map((r) => r.width),
        tops: children.map((r) => r.top),
        right: el.getBoundingClientRect().right,
        lastRight: children.at(-1)!.right,
      };
    });
    if (width > 600) {
      expect(Math.abs(layout.tops[0] - layout.tops[1])).toBeLessThan(3);
      expect(layout.widths[2]).toBeGreaterThan(layout.widths[0] * 1.9);
      expect(Math.abs(layout.tops[3] - layout.tops[4])).toBeLessThan(3);
      expect(Math.abs(layout.right - layout.lastRight)).toBeLessThan(2);
    }
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => document.activeElement?.closest("dialog") !== null,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

test("shared bead travels into the topic prompt, including an immediate click", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".living-paper-stage")).toBeVisible();
  const origin = await page.locator(".idea-seed").boundingBox();
  await page.getByRole("button", { name: "开始创作" }).click();
  await expect(page.locator("#main-content")).toHaveAttribute(
    "data-transition",
    "entering",
  );
  expect(await page.locator(".idea-seed").count()).toBe(1);
  expect(
    await page
      .locator(".idea-seed")
      .evaluate((el) => getComputedStyle(el).viewTransitionName),
  ).toBe("idea-seed");
  const destination = await page.locator(".idea-seed").boundingBox();
  expect(Math.abs(origin!.x - destination!.x)).toBeGreaterThan(100);
  expect(destination!.width).toBeLessThan(origin!.width);
  await expect(page.locator("#main-content")).toHaveAttribute(
    "data-transition",
    "idle",
  );
  await page.getByLabel("你想让大家了解什么？").fill("转场后可以立即编辑");
  await expect(page.getByLabel("你想让大家了解什么？")).toHaveValue(
    "转场后可以立即编辑",
  );
});
test("no view transitions fallback and reduced motion keep the same form usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "开始创作" }).click();
  await expect(page.locator("#main-content")).toHaveAttribute(
    "data-transition",
    "idle",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".living-paper-stage")).toHaveAttribute(
    "data-pose",
    "1.000",
  );
  await page.getByRole("button", { name: "开始创作" }).click();
  await expect(page.locator("#main-content")).toHaveAttribute(
    "data-transition",
    "idle",
  );
  await page.getByLabel("你想让大家了解什么？").fill("保留的主题");
  await page.getByRole("button", { name: "查看流程演示" }).click();
  await page.getByRole("button", { name: "返回修改" }).click();
  await expect(page.getByLabel("你想让大家了解什么？")).toHaveValue(
    "保留的主题",
  );
});
test("opening unfolds once and pauses on blur", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator(".living-paper-stage");
  await expect
    .poll(async () => Number(await stage.getAttribute("data-pose")))
    .toBeGreaterThan(0.1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(stage).toHaveAttribute("data-paused", "true");
  const paused = await stage.getAttribute("data-pose");
  await page.waitForTimeout(180);
  expect(await stage.getAttribute("data-pose")).toBe(paused);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(stage).toHaveAttribute("data-pose", "1.000");
  await page.waitForTimeout(150);
  await expect(stage).toHaveAttribute("data-pose", "1.000");
});
