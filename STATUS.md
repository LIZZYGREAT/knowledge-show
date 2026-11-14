# knowledge-show 当前项目状态

> `main@16affe4` 已合并 PR #13，包含本地任务 API、React 创作页的知识→脚本任务接入、精确脚本动画交接、Manifest 候选校验和修订请求接收。当前分支 `fix/main-handoff-correctness` 从该 main 开始，补齐需求快照与恢复、脚本独立重读、动画候选当前性与校验、修订锚点定位和安全失败诊断；尚待集成。通用动画播放器、工作台联动、自动修订和视频导出仍属后续工作；候选 Manifest 不会被发布为项目当前动画。

## 主线与分支状态

- **main 已完成**：知识→脚本的本地任务闭环、ProjectState 与精确产物版本、React 进度页、动画脚本交接及候选接收入口均已进入 main。动画候选不会被当作已发布 Manifest 或可播放视频。
- **当前待集成**：`fix/main-handoff-correctness` 修复 A–F 主链路边界问题，包括完整用户输入快照、终态脚本单独重读、候选与当前脚本版本绑定、Manifest 关系约束、RevisionRequest 锚点解析及不泄露原异常的任务诊断。验证结果见下文。
- **后续工作**：通用 Manifest 播放、编辑器/工作台联动、局部自动修订、视频导出与一次经用户同意的真实模型验收。

## 当前可用状态

- **默认分支**：`main`。
- **知识层主线状态**：首版研究、创意、核验、SQLite 状态管理、Streamlit 检验页、KnowledgePackage JSON 导出及 16:9 计费前校验已进入 `main`。知识层不再是待集成分支。
- **知识包交付**：KnowledgePackage 以 `{artifact_id}-r{revision}.json` 写入 `KNOWLEDGE_EXPORT_DIR`，通过原子发布、回读和 Schema 校验后才标记运行完成；已发布版本不会被不同内容覆盖。脚本消费者约定读取精确 ArtifactRef，不访问知识层 SQLite。
- **共享契约**：`evidence.kind=internal_review` 和 `ProductionScript.scenes[].events[].anchor` 可选布尔字段均已进入主线（PR #6）。`true` 固定关键呈现时刻，缺失或 `false` 保持名义时间；不要求每条脚本必须有锚点。PR #10 已合并，将可选 `selectable_elements` 和 `render_element` 修订锚点纳入主线。PR #2 仍开着且要求强制锚点，与现行语义不同；PR #3 仍开着，其 v0.3 提示词已由 PR #6 引入。旧 PR 的不同语义仍待维护者处理。
- **人工检验页**：有密钥时用户预览使用在线生成并要求确认可能产生调用费用；无密钥时只提供固定主题离线示例，其他主题在运行前被拒绝。开发者诊断仍可切换 Mock / Real API；页面打开不会自动调用模型。
- **自动验证（既有记录）**：`.venv` 中 83 项知识层测试通过；`contracts/validate_contracts.py` 覆盖五份 Schema、连贯样例、负向用例、可选锚点和非推荐方向切换。此前 PR 验证过脚本、工作流、知识层、前端生产构建、逻辑测试和 Chromium 浏览器用例；更细的历史测试记录保留在 Git 历史中。本机运行 Playwright 需设置 Chromium 系统库路径。
- **真实 API 验收**：三项主题均生成通过校验的知识包：基础六面骰定义（3 个候选方向，5 次模型调用）、进阶自注意力机制（1 个候选方向，3 次调用）、带明确 `focus` 与 `must_include` 的骰子概率（1 个候选方向，5 次调用）。合计 13 次模型调用、36,468 tokens、约 83.69 秒；均未触发 Search / Fetch。费用金额未作估算。
- **前端创作界面**：React / TypeScript / Vite 应用已由 PR #7 进入 main，PR #9 完成视觉重构，PR #11 更新首页和创作页装饰；PR #13 已将正式提交接入本地项目与任务 API。页面可轮询知识/脚本阶段、恢复项目和任务，并在脚本就绪时明确显示等待动画。当前分支补齐完整偏好恢复、变化后新建项目和脚本 GET 独立重试。API Key 只在发起请求时使用，不写入 session/local storage。工作台尚未消费真实 Manifest；动画预览仍是独立研发入口。
- **编辑器原型**：PR #8 合入独立 HTML 时间轴原型；数据来自硬编码 `CHAPTERS` / `ANIM_TRACKS`，不消费真实 `AnimationManifest`。`serve.py` 可本地展示原型；P0 预览已有独立播放与当前帧 bbox，但尚未接入编辑器选择、高亮覆盖或正式 `RevisionRequest`。
- **跨层能力边界**：main 上的工作流持久化 ProjectState revision JSON，按精确 KnowledgePackage 引用选择方向并运行至 ProductionScript 发布；上游知识包或方向变化时清除失效的下游引用，脚本可幂等复用。本地 API 可创建/恢复项目、启动和查询任务、读取精确产物、更新方向并取回动画交接输入。API Key 不写入项目、任务快照或前端持久化。真实模型脚本验收尚未执行；`script_writer.md` 仍由独立脚本执行器读取。
- **动画与修订交接**：动画负责人可从 `/handoff/animation` 获取当前精确脚本；Manifest 候选经过 Schema、脚本/场景/事件引用、时间覆盖和本地资源路径校验后单独保存，不更新 `ProjectState.artifacts.animation_manifest`，预览 API 仍返回 `not_ready`。当前分支再将候选当前性绑定到精确脚本/Brief，并补齐关系校验。RevisionRequest 仍只回执 `received`；当前分支会按目标 ArtifactRef 解析可读实体锚点，无法读取正式 AnimationManifest 时拒绝渲染元件锚点，不会使用候选代替发布产物，也不自动修改成果。
- **动画 P0 试作**：`frontend/animation-preview.html` 提供独立研发预览，播放固定 PN v2 脚本 S01（15s），支持播放、Seek、当前帧元件边界查询与销毁。视频舞台样式隔离；该预览尚未接入 React 工作台、当前生产脚本或已发布 AnimationManifest。
- **本次主链路收尾修订验证**：`PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q`（83 项）、`PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/script backend/tests/integration backend/tests/api -q`（24 项）、`.venv/bin/python contracts/validate_contracts.py`（PASS）、API Python 编译、`npm run build`、`npm test`（11 项）和 Playwright E2E（24 项）均通过。Playwright 使用隔离 Vite 端口 5174，因为默认 5173 被其他本机服务占用；Chromium 库通过 `LD_LIBRARY_PATH=/tmp/knowledge-show-browser-deps/root/usr/lib/x86_64-linux-gnu` 提供。Uvicorn 在隔离端口 8011 的 `/api/health` 返回 `{"status":"ok"}`。Mock 闭环生成 `project_id=P_0f68874f7cc241b8`、`job_id=JOB_f36caf58ebb64cc3`，状态 `script_ready`，ProjectState r3 引用 `KP_P_0f68874f7cc241b8-r1` 与 `PS_P_0f68874f7cc241b8-r1`；使用 FakeServices，0 次真实模型调用。
- **检查入口**：

  ```bash
  PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
  .venv/bin/python contracts/validate_contracts.py
  ```

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 首版与 16:9 配置已进入 `main`，83 项测试通过 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | main 已有模型客户端、结构化生成、有限修复、校验和不可覆盖版本发布；真实模型验收待做 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | main 上 React 创作任务已连接本地 API；P0 固定场景播放器和研发预览已集成；通用 Manifest 播放、真实工作台和正式视频仍待实现 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | main 有 ProjectState 编排、本地任务 API、精确动画交接、候选 Manifest 校验和 RevisionRequest 接收；当前分支补充候选一致性及修订锚点核验；自动修订未实现。现行契约含可选事件锚点、元件索引和渲染元件锚点 |

## 下一次集成重点

- 经用户明确同意后，对已发布 KnowledgePackage 复用知识并进行一次有成本边界的真实脚本验收；本次未执行。
- 动画负责人实现通用 Manifest 播放适配并发布当前 AnimationManifest 后，再将真实 ProductionScript 场景、播放头与工作台选择接入；在此之前候选资源不开放为用户预览。
- 完成多场景播放器和 Manifest 适配后，验证锚点实际播放时刻、片段覆盖及预览与导出一致性。
- 将稳定元件 ID 与当前帧 bbox 接入编辑器选择和高亮；修订请求目前只接收保存，需后续实现按层路由和局部重做。

## 活动任务

- 当前后端任务：`docs/tasks/open/backend/主链路收尾修订方案.md`，分支 `fix/main-handoff-correctness`。A–F 实现、综合 Mock/契约/前端验证及相关文档更新均已完成，并随本分支提交；修订仍待集成和负责人验收。真实模型脚本验收未运行。通用动画运行时、工作台、自动修订和视频导出仍是后续工作；任务保留在 open，等待负责人验收。
- 动画任务：`docs/tasks/open/frontend/动画层与工作台接入执行方案.md`，当前落实 P0 固定 PN S01 预览；生产构建通过，4 项动画 Playwright 用例及 15 项既有前端 E2E 均通过。等待首幕效果验收后进入 P1。
- 已归档任务方案：跨层契约修订与分支整合（PR #6）、编辑器元件定位契约（PR #10）以及前端视觉相关方案已移至 `docs/tasks/closed/`。PR #10 的契约变更已进入 `main`；动画工作台联调仍由当前 P1 任务继续推进。
- 前序知识层任务已按 PR #5 集成进 `main`；脚本提示词源分支仅定向引入了所需文件，没有合并其余历史提交。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
