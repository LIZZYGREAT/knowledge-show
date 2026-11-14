# knowledge-show 当前项目状态

> `main@82c6aaa` 已合并 PR #16，包含主链路交接修复与动画运行时/工作台能力。当前首页任务分支 `feat/home-curiosity-stage` 承接 `fix/user-experience-design-review` 的体验修复；体验修复按 `docs/tasks/open/backend/用户体验与过度设计审查.md` 完成静音字幕约束、创作进度、动画恢复、分幕生成与知识必填门槛调整；新主题真实模型验收仍未执行。

## 主线与分支状态

- **main 已完成**：知识→脚本本地任务闭环、ProjectState 与精确产物版本、React 进度页、动画脚本交接及候选 Manifest 接收入口。
- **main 当前能力**：主链路修复覆盖完整需求快照与恢复、脚本摘要独立重读、动画候选绑定当前脚本/Brief、Manifest 关系约束、修订锚点解析和安全失败诊断。动画层提供受控场景生成、浏览器检查后发布、真实工作台、局部修订、版本回退及 MP4 导出。
- **生产边界**：候选 Manifest 仍不会成为当前动画；正式动画版本经真实播放器检查后以 CAS 发布。修订锚点只从当前精确、已发布的产物解析，动画候选不会作为已发布版本读取。上游知识/脚本反馈可路由保存，但不会由动画层静默改写。
- **当前限制**：PN 固定样本已覆盖完整导出；新主题模型生成仅用注入客户端验证，尚未进行付费模型视觉验收。脚本真实模型验收也未在本轮执行。配音和音效尚未接入。

## 当前可用状态

- **知识与脚本**：知识研究、创意、核验、SQLite 状态管理、KnowledgePackage 发布，以及结构化脚本生成、有限修复、契约校验和不可覆盖版本发布均已实现。知识包和脚本按精确 `artifact_id + revision` 交接；API Key 仅在显式请求中传递，不写入项目状态、任务快照或前端持久化。
- **创作与恢复**：React 创作页默认一次确认后继续到动画预览，也可选择先看脚本。刷新会核对并接管已有动画任务，不重复创建；Key 不持久化，刷新后需要时会提示重连。返回创作页保留当前项目，并提供独立的“开始新作品”。只变更美术偏好时复用已有知识与脚本，生成新的动画版本。
- **动画制作与预览**：动画服务消费当前精确脚本，并向每幕提供全片信息、邻幕目标、对应已核验知识和前序对象身份。通过校验的场景结果按输入摘要保存在项目私有缓存；结构错误只对失败幕尝试一次修正。缓存重用前重新校验；失败不会发布或覆盖旧版。自动美术档案按脚本题材选择，用户偏好直接传入场景构思。资源经真实浏览器关键帧检查后发布。
- **工作台与修订**：时间轴支持多场景 Seek、缩放平移、真实元件框选、携带精确版本的局部反馈及旧版回退。没有选中对象时允许提交全片反馈；工作台 Key 只保留在页面内存中。PN 速度类修改不需要启动模型客户端；上游知识/脚本反馈仍另存路由，不自动重跑上游。
- **知识候选门槛**：必要 Claim 列表缺失时保守地把引用知识视为必要；显式空列表不会扩成全部引用，但没有必要 Claim 的候选不能正式交付。可选 Claim 被拒时，只要核心必要 Claim 通过，仍可删去旁枝并交付。
- **固定样片导出**：PN v2 七幕、165 秒样片已实际编码为 H.264、1280×720、24fps、3960 帧；预览与视频采样帧 SSIM 为 0.988581–0.993574。没有配音或音效。导出复用纯视频 Player，不包括工作台覆盖物。运行细节见 `docs/work/frontend/animation/运行时与首幕预览.md`。
- **契约**：现行五类 Schema 和跨对象校验位于 `contracts/`。本次集成没有改变公共 Schema；动画 bundle 与风格档案仍是内部实现数据。

## PR #16 集成验证

PR #16 集成验证记录：后端 `PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests --import-mode=importlib -q`：120 项通过；`.venv/bin/python contracts/validate_contracts.py`：PASS；前端 `npm run build`：通过、`npm test`：14 项通过；Playwright E2E：32 项通过（隔离 Vite 端口 5174，Chromium 系统库通过 `LD_LIBRARY_PATH` 提供）。后端 pytest 和浏览器服务需在沙箱外执行，因为受限沙箱会阻止本地绑定端口或挂起后台线程。动画精确发布版本锚点解析有回归覆盖；候选 Manifest 仍按预期被拒绝。

## 用户体验审查分支验证

体验审查分支当时的后端动画与知识定向回归：`PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/animation/test_runtime.py backend/tests/knowledge/test_package.py -q`：32 项通过。前端 `npm run build` 通过，`npm test` 14 项通过；新增 Playwright 用例可由 `npx playwright test ... --list` 枚举（30 项）。实际 E2E 启动曾因当前环境 Chromium 缺少 `libnspr4.so` 退出，故该分支 E2E 未验证通过；不能把 PR #16 的 32 项 E2E 记录当作本分支结果。公共 Schema 未变；本轮未调用真实付费模型。

## 首页知识剧场验证

`feat/home-curiosity-stage` 首页保留流体开场，落墨后同一组平面波纹连续抬升为骰子外围的锥形螺旋，按前后深度包裹骰子并共用旋转进度。墨滴逐渐撑出三维骰面，点数随实际透视投影翻转，落定后展开组合与数量分布，最后收回墨滴和流体。16 秒循环共用可见性调度；减少动画直接展示完整结论。矩形纸卡已移除，旧 `LivingFlowScene` 保留；首页演示不影响生产动画风格、API 或公共 Schema。

前端 `npm run build` 通过，`npm test` 17 项通过；`npm run test:e2e -- --workers=2 --output=/tmp/ks-vortex-final-e2e` 36 项通过（Chromium，提供 `LD_LIBRARY_PATH` / `FONTCONFIG_FILE` / `PLAYWRIGHT_BROWSERS_PATH`）。覆盖墨滴成形、波纹抬升、骰子正面落定为 3 与 4、SVG 遮罩完整文字、暂停恢复及既有创作和工作台流程。实际截图覆盖 1440×900、1280×720、390px 手机与减少动画，以及流体、墨滴、成形、组合、结论和回环姿态；截图位于 `/tmp/ks-vortex-final-*` 与 `/tmp/ks-ink-*`。已录制两轮最终播放（`/tmp/ks-vortex-preview.mp4`），本机 5 秒抽样约 29.6 次状态更新/秒，页面无 JS 错误；该数据不代表真机性能。负责人视觉确认与 Safari / 真机验收待完成，任务留在 open。

## 责任与活动任务

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 首版、16:9 配置和 83 项知识层测试已进入 `main` |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 结构化生成、有限修复、校验和版本发布已实现；本轮未做真实模型脚本验收 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | main 已接通创作页、动画预览、真实工作台、定向修订和同源导出；当前任务分支增加连续进度、动画任务恢复与纯风格版本复用 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | main 含精确状态/产物交接、候选校验、检查后动画发布及修订锚点验证 |

- 当前任务：`docs/tasks/open/frontend/首页知识剧场动画设计与实施方案.md`，分支 `feat/home-curiosity-stage`，首页纸艺骰子剧场已实现，保留在 open 等负责人视觉确认。基于体验修复分支继续开发，没有修改生产层或公共契约。
- 体验审查：`docs/tasks/open/backend/用户体验与过度设计审查.md` 的实现由当前分支承接；没有进行付费真实模型验收。
- 后端主链路方案：`docs/tasks/open/backend/主链路收尾修订方案.md`；实现已进入 main，方案保留在 open 等负责人验收。
- 主工作流交接补全方案：`docs/tasks/open/backend/主工作流交接补全执行方案.md`；实现已进入 main，方案保留在 open 等负责人验收。
- 动画层与工作台方案：`docs/tasks/open/frontend/动画层与工作台接入执行方案.md`；固定样片 P1–P4 已实现，保留在 open 等待产品/视觉验收。

## 下一步

- 首页与既有创作流程的 Chromium 回归已在恢复本机 `/tmp` 系统库配置后实测；仍需负责人确认首页视觉效果，Safari 与真实移动设备尚未验收。
- 对新主题继续审查知识机制、关键帧、运动和美术质量；固定 PN 样片不替代新主题验收。一次真实新主题的付费生成需用户明确确认后再执行。
- 由知识/脚本执行器消费动画层保存的上游反馈；动画层不静默改写上游成果。

更新规则：仅在稳定能力、任务交接、重要阻塞或集成状态变化时更新本文件。尚未验证的功能不得写成“已完成”。
