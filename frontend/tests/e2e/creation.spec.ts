import { test, expect, type Page } from "@playwright/test";

async function prepareConnectedPage(page: Page) {
  await page.route("**/api/model/test", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("API Key", { exact: true }).fill("sk-e2e-recovery-key");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("连接成功");
  await page.getByRole("button", { name: "本次使用" }).click();
}

async function openTopic(page: Page, topic: string) {
  await page.getByRole("button", { name: "开始创作" }).click();
  await page.getByLabel("你想让大家了解什么？").fill(topic);
}

async function confirmTopic(page: Page) {
  await page.getByRole("button", { name: "开始创作", exact: false }).click();
  await page.getByRole("button", { name: "确认，开始制作" }).click();
}
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
  await page.route("**/api/model/test", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: false }),
    }),
  );
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
  await expect(page.getByRole("status")).toContainText("密钥无法使用");
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

test("real task UI resumes a published script and waits for animation", async ({
  page,
}) => {
  const secret = "sk-e2e-only-secret";
  await page.route("**/api/model/test", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true }),
    }),
  );
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        project_id: "P_E2E",
        project_revision: 1,
        project: { project_id: "P_E2E", revision: 1 },
      }),
    }),
  );
  await page.route("**/api/projects/P_E2E/jobs", (route) =>
    route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "JOB_E2E", status: "running" }),
    }),
  );
  await page.route("**/api/jobs/JOB_E2E", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        job_id: "JOB_E2E",
        project_id: "P_E2E",
        status: "script_ready",
        current_stage: "animation",
        stages: {
          knowledge: "completed",
          script: "completed",
          animation: "pending",
        },
        message: "脚本准备完成，等待动画制作。",
        project_revision: 4,
        artifacts: {
          knowledge_package: { artifact_id: "KP_E2E", revision: 1 },
          production_script: { artifact_id: "PS_E2E", revision: 1 },
        },
        error_code: null,
      }),
    }),
  );
  await page.route("**/api/projects/P_E2E/production-script**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        core_message: "两枚骰子的点数和有不同的组合数。",
        total_duration_ms: 165000,
        scenes: [{ scene_id: "SC01", objective: "理解组合数量" }],
      }),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "开始创作" }).click();
  await page.getByLabel("你想让大家了解什么？").fill("骰子概率");
  await page.getByRole("button", { name: "开始创作", exact: false }).click();
  await page.getByRole("button", { name: "确认，开始制作" }).click();
  await page.getByLabel("API Key", { exact: true }).fill(secret);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("连接成功");
  await page.getByRole("button", { name: "本次使用" }).click();
  await page.getByRole("button", { name: "确认，开始制作" }).click();

  await expect(
    page.getByRole("heading", { name: "讲述主线已经准备好。" }),
  ).toBeVisible();
  await expect(page.getByText("等待动画制作", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "两枚骰子的点数和有不同的组合数。" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /预览|工作台/ })).toHaveCount(0);
  const stored = await page.evaluate(() =>
    sessionStorage.getItem("knowledge-show:active-task"),
  );
  expect(stored).toContain("JOB_E2E");
  expect(stored).not.toContain(secret);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "讲述主线已经准备好。" }),
  ).toBeVisible();
  const restoredSession = await page.evaluate(
    () => sessionStorage.getItem("knowledge-show:active-task") ?? "",
  );
  expect(restoredSession).toContain("JOB_E2E");
  expect(restoredSession).not.toContain(secret);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByLabel("API Key", { exact: true })).toHaveValue("");
});

test("changed preferences create a new project after a job start failure", async ({
  page,
}) => {
  const createdInputs: Record<string, unknown>[] = [];
  const jobProjects: string[] = [];
  await prepareConnectedPage(page);
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    createdInputs.push(body.user_input);
    const id = `P_CHANGED_${createdInputs.length}`;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ project_id: id, project_revision: 1, project: { project_id: id, revision: 1 } }),
    });
  });
  await page.route("**/api/projects/P_CHANGED_1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        project_id: "P_CHANGED_1",
        revision: 1,
        brief: { user_input: createdInputs[0] },
      }),
    }),
  );
  await page.route("**/api/projects/P_CHANGED_*/jobs", async (route) => {
    const projectId = route.request().url().split("/").at(-2)!;
    jobProjects.push(projectId);
    if (jobProjects.length === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "temporarily_unavailable", message: "模拟启动失败" } }),
      });
      return;
    }
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "JOB_CHANGED", status: "running" }),
    });
  });
  await page.route("**/api/jobs/JOB_CHANGED", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        job_id: "JOB_CHANGED",
        project_id: "P_CHANGED_2",
        status: "running",
        current_stage: "knowledge",
        stages: { knowledge: "running", script: "pending", animation: "pending" },
        message: "正在探索知识与讲述方向",
        project_revision: 1,
        artifacts: {},
        error_code: null,
      }),
    }),
  );

  await openTopic(page, "时间的方向");
  await confirmTopic(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("模拟启动失败");
  await page.getByRole("button", { name: "返回修改" }).click();
  await page.getByLabel("有没有特别想讲的？").fill("熵增如何决定方向");
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  await page.getByLabel("你的讲述方式").fill("从冰块融化讲起");
  await page.getByText("更多创作偏好", { exact: false }).click();
  await page.getByRole("button", { name: "深入一点", exact: true }).click();
  await page.getByLabel("想出现的内容").fill("一个生活例子");
  await confirmTopic(page);

  await expect(page.locator(".generation-topic")).toContainText("时间的方向");
  expect(createdInputs).toHaveLength(2);
  expect(createdInputs[0]).toEqual({
    topic: "时间的方向",
    creative_mode: "auto",
    knowledge_depth: "balanced",
  });
  expect(createdInputs[1]).toMatchObject({
    topic: "时间的方向",
    focus: "熵增如何决定方向",
    creative_mode: "custom",
    creative_mode_notes: "从冰块融化讲起",
    knowledge_depth: "advanced",
    must_include: ["一个生活例子"],
  });
  expect(jobProjects).toEqual(["P_CHANGED_1", "P_CHANGED_2"]);
});

test("unchanged request reuses its project after a job response is lost", async ({
  page,
}) => {
  let projectCreates = 0;
  const jobProjects: string[] = [];
  await prepareConnectedPage(page);
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    projectCreates += 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        project_id: "P_RETRY",
        project_revision: 1,
        project: { project_id: "P_RETRY", revision: 1 },
      }),
    });
  });
  const snapshot = {
    topic: "生日悖论",
    creative_mode: "auto",
    knowledge_depth: "balanced",
  };
  await page.route("**/api/projects/P_RETRY", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        project_id: "P_RETRY",
        revision: 1,
        brief: { user_input: snapshot },
      }),
    }),
  );
  await page.route("**/api/projects/P_RETRY/jobs", async (route) => {
    jobProjects.push("P_RETRY");
    if (jobProjects.length === 1) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "JOB_RETRY", status: "running" }),
    });
  });
  await page.route("**/api/jobs/JOB_RETRY", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        job_id: "JOB_RETRY",
        project_id: "P_RETRY",
        status: "running",
        current_stage: "knowledge",
        stages: { knowledge: "running", script: "pending", animation: "pending" },
        message: "正在探索知识与讲述方向",
        project_revision: 1,
        artifacts: {},
        error_code: null,
      }),
    }),
  );

  await openTopic(page, "生日悖论");
  await confirmTopic(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("连接本地创作服务");
  await page.getByRole("button", { name: "返回修改" }).click();
  await confirmTopic(page);
  await expect(page.locator(".generation-topic")).toContainText("生日悖论");
  expect(projectCreates).toBe(1);
  expect(jobProjects).toEqual(["P_RETRY", "P_RETRY"]);
});

test("refresh restores the full saved user input from the project", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "knowledge-show:active-task",
      JSON.stringify({ projectId: "P_RESTORE", jobId: "", topic: "原主题" }),
    );
  });
  await page.route("**/api/projects/P_RESTORE", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        project_id: "P_RESTORE",
        revision: 1,
        brief: {
          user_input: {
            topic: "时间的方向",
            focus: "熵增",
            creative_mode: "custom",
            creative_mode_notes: "从冰块融化讲起",
            knowledge_depth: "advanced",
            creative_idea: "从直觉反差开始",
            art_style: "纸张质感",
            must_include: ["例子", "公式"],
            must_avoid: ["复杂术语"],
          },
        },
      }),
    }),
  );
  await page.goto("/");
  await expect(page.getByLabel("你想让大家了解什么？")).toHaveValue("时间的方向");
  await expect(page.getByLabel("有没有特别想讲的？")).toHaveValue("熵增");
  await expect(page.getByLabel("你的讲述方式")).toHaveValue("从冰块融化讲起");
  await page.getByText("更多创作偏好", { exact: false }).click();
  await expect(page.getByRole("button", { name: "深入一点", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("美术风格偏好")).toHaveValue("纸张质感");
  await expect(page.getByLabel("想出现的内容")).toHaveValue("例子\n公式");
  await expect(page.getByLabel("希望避开的内容")).toHaveValue("复杂术语");
  await expect(page.getByLabel("你的创意", { exact: true })).toHaveValue("从直觉反差开始");
});

test("script read failure can be retried without starting another job", async ({
  page,
}) => {
  let projectCreates = 0;
  let jobsStarted = 0;
  let scriptReads = 0;
  await prepareConnectedPage(page);
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    projectCreates += 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        project_id: "P_SCRIPT_READ",
        project_revision: 1,
        project: { project_id: "P_SCRIPT_READ", revision: 1 },
      }),
    });
  });
  await page.route("**/api/projects/P_SCRIPT_READ/jobs", async (route) => {
    jobsStarted += 1;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "JOB_SCRIPT_READ", status: "running" }),
    });
  });
  await page.route("**/api/jobs/JOB_SCRIPT_READ", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        job_id: "JOB_SCRIPT_READ",
        project_id: "P_SCRIPT_READ",
        status: "script_ready",
        current_stage: "animation",
        stages: { knowledge: "completed", script: "completed", animation: "pending" },
        message: "脚本准备完成，等待动画制作。",
        project_revision: 3,
        artifacts: {
          production_script: { artifact_id: "PS_READ", revision: 1 },
        },
        error_code: null,
      }),
    }),
  );
  await page.route("**/api/projects/P_SCRIPT_READ/production-script**", async (route) => {
    scriptReads += 1;
    if (scriptReads === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "temporarily_unavailable", message: "暂时无法读取脚本" } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        core_message: "热量会自然流向更冷的物体。",
        total_duration_ms: 165000,
        scenes: [{ scene_id: "SC01", objective: "理解热量方向" }],
      }),
    });
  });

  await openTopic(page, "热量流动");
  await confirmTopic(page);
  await expect(page.getByRole("heading", { name: "讲述主线已经准备好。" })).toBeVisible();
  await expect(page.locator(".current-action")).toContainText("暂时无法读取脚本");
  await page.getByRole("button", { name: "重新读取脚本" }).click();
  await expect(page.getByRole("heading", { name: "热量会自然流向更冷的物体。" })).toBeVisible();
  expect(projectCreates).toBe(1);
  expect(jobsStarted).toBe(1);
  expect(scriptReads).toBe(2);
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
    const theatre = await page.locator(".flow-theatre").boundingBox();
    const artwork = await page.locator(".flow-artwork").boundingBox();
    expect(artwork!.height / theatre!.height).toBeGreaterThan(0.65);
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
  await expect(page.locator(".living-flow-scene")).toBeVisible();
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
  await expect(page.locator(".living-flow-scene")).toHaveAttribute(
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
test("flow scene grows continuously and pauses on blur", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator(".living-flow-scene");
  await expect
    .poll(async () => Number(await stage.getAttribute("data-pose")))
    .toBeGreaterThan(0.1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(stage).toHaveAttribute("data-paused", "true");
  const paused = await stage.getAttribute("data-pose");
  await page.waitForTimeout(180);
  expect(await stage.getAttribute("data-pose")).toBe(paused);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(stage).toHaveAttribute("data-paused", "false");
  await expect
    .poll(async () => Number(await stage.getAttribute("data-pose")))
    .toBeGreaterThan(Number(paused));
});

test("flow key poses have a substantial, distinct silhouette and a static review mode", async ({ page }) => {
  const paths: string[] = [];
  for (const pose of [0.5 / 5.5, 3 / 5.5, 1]) {
    await page.goto(`/?flow-pose=${pose}`);
    await expect(page.locator(".living-flow-scene")).toHaveAttribute("data-paused", "true");
    const body = page.locator(".flow-body");
    const path = (await body.getAttribute("d"))!;
    expect(path).not.toMatch(/NaN|Infinity/);
    paths.push(path);
    const bounds = await body.boundingBox();
    expect(bounds!.width).toBeGreaterThan(15);
    if (pose > 0.5) {
      const scene = await page.locator(".flow-artwork").boundingBox();
      expect(bounds!.width).toBeGreaterThan(scene!.width * 0.55);
      expect(bounds!.height).toBeGreaterThan(scene!.height * 0.5);
    }
  }
  expect(new Set(paths).size).toBe(3);
});

test("silhouette and attached motes continue moving after the opening settles", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator(".living-flow-scene");
  await expect(stage).toHaveAttribute("data-settled", "true", { timeout: 12000 });
  const path = await page.locator(".flow-body").getAttribute("d");
  const mote = await page.locator(".flow-motes circle").first().getAttribute("cx");
  await expect.poll(() => page.locator(".flow-body").getAttribute("d")).not.toBe(path);
  await expect.poll(() => page.locator(".flow-motes circle").first().getAttribute("cx")).not.toBe(mote);
});

test("ornaments stay decorative while focus, textarea resize and preferences change", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "开始创作" }).click();
  const topic = page.getByLabel("你想让大家了解什么？");
  await topic.fill("一个很长的问题\n".repeat(12));
  await topic.focus();
  await page.getByText("更多创作偏好", { exact: false }).click();
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  await page.getByLabel("你的讲述方式").fill("像散步一样讲述");
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const result = await page.locator(".composer").evaluate(el => {
      const ornaments = [...el.querySelectorAll(".editorial-ornament")];
      const fields = [...el.querySelectorAll("input, textarea, button, summary, label, h1")];
      const overlap = ornaments.filter(ornament => {
        const a = ornament.getBoundingClientRect();
        if (!a.width || !a.height) return false;
        return fields.some(field => {
          const b = field.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        });
      });
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        hidden: ornaments.every(node => !!node.closest('[aria-hidden="true"]')),
        passive: ornaments.every(node => getComputedStyle(node).pointerEvents === "none"),
        overlap: overlap.map(node => node.getAttribute("class")),
      };
    });
    expect(result).toEqual({ overflow: false, hidden: true, passive: true, overlap: [] });
    await expect(topic).toHaveValue("一个很长的问题\n".repeat(12));
  }
});

test("early navigation and rapid return keep only one shared seed and preserve input", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始创作" }).click();
  await page.getByLabel("你想让大家了解什么？").fill("往返时保留好奇心");
  await page.getByRole("button", { name: "knowledge.show 首页" }).click();
  await expect(page.locator(".living-flow-scene")).toBeVisible();
  await page.getByRole("button", { name: "开始创作" }).click();
  await expect(page.locator(".idea-seed")).toHaveCount(1);
  await expect(page.getByLabel("你想让大家了解什么？")).toHaveValue("往返时保留好奇心");
  await expect(page.locator("#main-content")).toHaveAttribute("data-transition", "idle");
});
