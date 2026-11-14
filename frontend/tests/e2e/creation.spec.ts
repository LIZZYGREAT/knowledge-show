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
  await page.getByLabel("希望包含的内容").fill("例子\n公式");
  await page.getByRole("button", { name: "开始创作", exact: false }).click();
  await expect(page.getByRole("dialog")).toContainText("重点讲直觉");
  await page.getByRole("button", { name: "确认，开始制作" }).click();
  await expect(page.getByRole("dialog")).toContainText("模型连接");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "准备把这个问题变成动画",
  );
  await page.getByRole("button", { name: "返回修改" }).click();
  await expect(page.getByLabel("希望包含的内容")).toHaveValue("例子\n公式");
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
    await page.getByRole("button", { name: "开始创作" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
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
