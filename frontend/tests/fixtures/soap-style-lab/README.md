# 化学跨风格试片：仅 Mock 与渲染验收

这组研发 fixture 共用合法的 `production-script.json`：三幕、27 秒，水流经过附着油污 → 两亲分子在油水界面定向排列 → 搅动、分散、冲洗。四个 `style-*.json` 是完整的可播放 bundle，不是正式用户项目，也不代表真实模型的美术生成质量。

知识说明按 [OpenStax Chemistry 2e §11.5：Soaps and Detergents](https://openstax.org/books/chemistry-2e/pages/11-5-colloids) 核对：亲水端朝水相、亲油端朝油相，分散后的油随冲洗带走。图形数量、形状、尺度和动作是解释性抽象；局部排列不表示所有分子立即组成规则球壳，也不表示油发生化学消失。负责人仍需确认最终视觉与知识表达。

## 可复现入口

仓库根目录运行 `.venv/bin/python frontend/scripts/generate-soap-fixtures.py`，会重建四套 bundle，并经 Python `validate_program` 和 ProductionScript Schema 检查。浏览器再经同一 `validateBundle`、`AnimationPlayer`、`VectorScene` 播放。

```bash
cd frontend
npm run build
npm run dev
# 打开 http://127.0.0.1:5173/style-lab.html
node scripts/review-soap-styles.mjs --output /tmp/ks-soap-style-final
```

同屏页面支持三处关键时刻、连续 Seek、同步播放。截图脚本保存四套在 4500 / 11000 / 13500 / 22500ms 的同一时刻图像，并录制整个 27 秒播放，确认四个时钟到达 27000ms、页面无错误。它不创建动画任务。

隔离 HTTP / 工作台 / 导出验收使用一个明确的 Fake Director，不建立 ResearchStore、不连接模型，不读取真实用户项目：

```bash
# 根目录；选择一个新的空目录。服务使用本机 8000 端口。
.venv/bin/python frontend/scripts/serve-soap-acceptance.py --root /tmp/ks-soap-chain
# 恢复同一隔离验收目录可加 --resume；不覆盖其上游文件。

# 另一终端，frontend 目录；静态构建避免长时间导出被开发热更新中断。
npx vite preview --host 127.0.0.1 --port 5184 --strictPort
# 再另一终端，frontend 目录：
node scripts/check-soap-workbench.mjs --origin http://127.0.0.1:5184 --output /tmp/ks-soap-chain-review
node scripts/compare-animation-export.mjs --bundle /tmp/ks-soap-chain-review/checked-bundle.json --video /tmp/ks-soap-chain-review/soap-paper.mp4 --output /tmp/ks-soap-chain-review
```

验收 API 使用普通 ProjectState、知识包/脚本发布、动画任务、浏览器检查、修订、CAS 版本回退和导出端点。`SOAP_FAKE` 是本地 harness 标记，不是模型密钥，服务拒绝其它凭证。化学知识包只作为显式导入的固定样例。项目时长通过合法的测试 Brief 设为 27000ms，不改变产品默认 165 秒。

系统需具备 Chromium 运行库、中文字体及 FFmpeg/ffprobe；沿用主运行文档的 `LD_LIBRARY_PATH`、`FONTCONFIG_FILE`、`PLAYWRIGHT_BROWSERS_PATH`、`ANIMATION_FFMPEG`、`ANIMATION_FFPROBE`。本轮环境使用 `/tmp/knowledge-show-browser-deps/root/usr/lib/x86_64-linux-gnu`、`/tmp/knowledge-show-fonts.conf`、`/tmp/knowledge-show-browsers`，编码器位于 `/tmp/knowledge-show-export-tools/ffmpeg-7.0.2-amd64-static/`；这些本机文件不进入 Git。

## 实际视觉差异与修正

| 风格 | 对象与空间 | 可见材质 | 运动 |
| --- | --- | --- | --- |
| 纸艺编辑 | 不规则油污剪纸、浅色水层、圆形分子头 | 纸纤维与落影 | 缓入缓出、纸片轻微落定，分散小滴保持厚度 |
| 精密科学 | 油滴曲面、带轮廓的液体截面、精确圆形分子头 | 半透明渐变高光 | 平滑接近界面，分散过程连续、速度可观察 |
| 现代图形 | 偏右大几何油块、方形分子头、章节编号 | 实色和粗轮廓，背景改为中性色 | 较快落位与三次减速，图形节奏性分散 |
| 叙事拼贴 | 厨房盘子与不规则油污贴片、重叠纸层 | 印刷网点、盘沿纸层投影 | 缓入推进、带角度的接近，油滴离开盘子 |

首轮检查发现水流线盖住油滴、拼贴字幕与盘子颜色接近、现代风满屏黄色。最终将水流移到油滴上下并明确图层顺序，为拼贴字幕增加暗色底衬，现代风改用中性底色与局部高对比油块；分散小滴从整齐网格改为错落位置。没有在通用 Profile 或渲染器中加入化学专有规则。

最终对照图位于 `/tmp/ks-soap-style-final/comparison-{problem,approach,mechanism,result}.png`。每种风格的相同时刻截图为该目录下 `{style-id}-{problem,approach,mechanism,result}.png`。完整实际播放录像在 `playback/`，`playback.json` 记录四个时钟均为 27000ms、errors 为空。以完整播放而非单张图核对接近、排列、分散和带走过程。

## 运行时新增内部字段

公共五类 Schema 保持不变。下列可选字段在 `BundleTypes.ts`、Python `validate_program` 和 TS `validateVector` 同步定义/验证，在 `VectorScene` / `styleMaterial` / `interpolate` 实际执行；旧对象不携带时继续使用原默认值。

| 字段 | 范围与处理 |
| --- | --- |
| `stroke`、`strokeWidth`、`lineCap` | 六位 hex；0–30；butt/round/square，默认无描边/宽 1/butt |
| `cornerRadius`、`fillOpacity` | 0–500，默认 8；0–1，默认 1 |
| `materialKey` | flat（默认）/ paper-layer / frosted / ink-print；仅代码生成 pattern、渐变、落影，不接收外部 CSS、DOM、URL |
| `fontSize`、`fontWeight`、`textAnchor` | 8–160，默认 32；100–900，默认 400；start（默认）/middle/end；显式换行用 tspan |
| `zIndex` | -100–100，默认 0；相同值保持原始对象顺序 |
| 关键帧 `easing` | smoothstep（旧默认）/linear/ease-in-cubic/ease-out-cubic/ease-in-out-cubic；控制该帧出发的片段 |
| 关键帧 `drawProgress` | 路径专用，0–1，默认 1；标准化 pathLength/dashoffset，由 Seek 计算 |

未知字段/token、非有限数值及非有限路径指数均拒绝。defs 含稳定场景/对象前缀，每个挂载使用独立 ShadowRoot；seek 不重建材质或 SVG 节点。材质参数属于逻辑对象，框选仍使用其合并几何 bbox。导演指令列出真实支持的 JSON，缓存摘要包含完整 Profile、场景/上下文和导演指令摘要。原有单幕一次有限修复及成功幕缓存保持。

没有实现 camera、parent/group、任意路径形变、3D、着色器、音轨或自动排版引擎。样例通过协调关键帧联动对象；后续仅在实际片段需要时扩展。

## 检查结果（2026-11-15）

- `PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/animation/test_runtime.py -q`：27 项通过，含四风格 Python 校验、Fake Director、旧 PN、失败缓存及局部身份保护。
- `PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests --import-mode=importlib -q`：136 项通过。
- `.venv/bin/python contracts/validate_contracts.py`：PASS，五类契约、连贯样例和跨层校验不变。
- `cd frontend && npm run build && npm test`：构建通过，21 项单测通过。
- `cd frontend && npm run test:e2e -- --workers=2 --output=/tmp/ks-soap-final-e2e`（提供上述 Chromium 环境变量）：47 项通过。覆盖四风格确定性 Seek、真实播放、路径倒退、节点复用、同屏时钟、工作台费用交互、旧 PN 框选/跨幕、创作流程及首页回归。

实际 HTTP 工作台验收的结果保存在 `/tmp/ks-soap-static-chain-review/workflow.json`：`AM_P_SOAP_LAB r3 → r4`，只改变 S02，回退至 r3 并恢复 r4，成功下载 `/tmp/ks-soap-static-chain-review/soap-paper.mp4`。元件选择与修订后工作台截图为同目录的 `selected-oil.png` / `revised-workbench.png`。`/tmp/ks-soap-chain-final/` 保存合法上游固定样例、发布资源、浏览器检查回执与编码日志，不属于正式用户产物。

下载的 MP4 经 ffprobe 实测为 H.264、1280×720、24fps、27 秒、648 帧，无音轨。`compare-animation-export.mjs` 使用普通纯视频播放器，逐帧抽取 108 / 324 / 540 帧，与 4500 / 13500 / 22500ms 的预览比较，SSIM 分别为 **0.991112 / 0.990341 / 0.989901**，结果在 `preview-export.json`，两组 PNG 也保留在同目录。工作台选择框不进入纯视频 Player 或编码帧。本轮没有重新编码 165 秒 PN 全片；旧 PN 由既有七幕浏览器及后端版本回归覆盖。

受限沙箱中的异步 pytest 未返回，改在沙箱外实测；本机 Chromium 使用上述库/字体配置。早期长时验收遇到开发热更新和本地服务中断，最终使用静态构建页与恢复后的隔离 API 完整通过。页面错误、下载及帧比对均以最终回执为准，没有将中断尝试记为通过。

实际文件范围：`styles/profiles/profiles.json` 与 `backend/src/animation/{api,director,service}.py` 处理风格、偏好、指令/校验及缓存；`runtime/{BundleTypes,VectorScene,styleMaterial,interpolate,validateVector,validateBundle}.ts` 实现运行时；`features/revision/{Workbench.ts,editor-layout.html}` 实现费用交互；`style-lab.html`、`src/devtools/styleLab.ts`、`scripts/*soap*.{py,mjs}`、`compare-animation-export.mjs` 和本目录提供可复现验收，配套 Python/Vitest/Playwright 检查。首页实现文件与公共 Schema 未修改。

真实 DeepSeek 调用 **0 次**、费用 **0**、真实模型失败重试 **0 次**。这里只验收固定/Fake 产物和实际渲染，不声称真实生成画风已通过；一幕 8–12 秒 × 四风格的付费试验、正式 165 秒新主题、负责人视觉审核、Safari / 真机仍待进行。
