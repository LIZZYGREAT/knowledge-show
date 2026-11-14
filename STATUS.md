# knowledge-show 当前项目状态

> `main` 已包含知识层首版（PR #5）、跨层脚本契约（PR #6）、React 创作体验（PR #7）、独立时间轴编辑器原型（PR #8）、视觉重构（PR #9）以及脚本工作流与固定 PN 结 S01 动画 P0 预览（PR #12，已合并）。当前工作分支 `feat/non-animation-mainline` 在此基础上已集成本地任务 API、React 创作页的知识→脚本任务接入、精确脚本动画交接、Manifest 候选校验和修订请求接收。通用动画播放器、工作台联动、自动修订和视频导出尚未接通；候选 Manifest 不会被发布为项目当前动画。

## 当前可用状态

- **默认分支**：`main`。
- **知识层主线状态**：首版研究、创意、核验、SQLite 状态管理、Streamlit 检验页、KnowledgePackage JSON 导出及 16:9 计费前校验已进入 `main`。知识层不再是待集成分支。
- **知识包交付**：KnowledgePackage 以 `{artifact_id}-r{revision}.json` 写入 `KNOWLEDGE_EXPORT_DIR`，通过原子发布、回读和 Schema 校验后才标记运行完成；已发布版本不会被不同内容覆盖。脚本消费者约定读取精确 ArtifactRef，不访问知识层 SQLite。
- **共享契约**：`evidence.kind=internal_review` 和 `ProductionScript.scenes[].events[].anchor` 可选布尔字段均已进入主线（PR #6）。`true` 固定关键呈现时刻，缺失或 `false` 保持名义时间；不要求每条脚本必须有锚点。PR #10 已合并，将可选 `selectable_elements` 和 `render_element` 修订锚点纳入主线。PR #2 仍开着且要求强制锚点，与现行语义不同；PR #3 仍开着，其 v0.3 提示词已由 PR #6 引入。旧 PR 的不同语义仍待维护者处理。
- **人工检验页**：有密钥时用户预览使用在线生成并要求确认可能产生调用费用；无密钥时只提供固定主题离线示例，其他主题在运行前被拒绝。开发者诊断仍可切换 Mock / Real API；页面打开不会自动调用模型。
- **自动验证**：`.venv` 中 83 项知识层测试通过；`contracts/validate_contracts.py` 通过，覆盖五份 Schema、五份连贯样例、负向用例、可选锚点、可选元件索引、`render_element` 版本校验和非推荐方向切换。四份历史 ProductionScript 通过新版 Schema。另以本机已发布 `KP_P_LOCAL_KNOWLEDGE_REVIEW-r2`（项目 `P_LOCAL_KNOWLEDGE_REVIEW`，16:9、目标 165000ms）构造临时 ProjectState，并用 `PS001-r1` 固定结构 Mock 完成引用 Smoke：方向 `DIR_977f3a7e4dcf7665`，锚点事件 `EV06@125000ms` 映射到动画内部事件，0 次 API 调用。此检查不验证语义生成质量或实际播放命中。合并后脚本测试 10 项、工作流集成测试 3 项、知识层 83 项、前端单测 10 项均通过；契约校验和包含 P0 预览页的前端生产构建通过。Playwright 的 19 项 E2E 全部通过，包括动画 Seek/身份、当前帧边界、样式隔离、快速 Seek 取消、播放暂停及既有创作页回归。本机通过 `LD_LIBRARY_PATH=/tmp/knowledge-show-browser-deps/root/usr/lib/x86_64-linux-gnu` 提供 Chromium 系统库；未配置系统库时 Chromium 无法启动。PR #9 的前端构建、7 项逻辑测试和 11 项 Chromium 浏览器测试通过，覆盖五种屏宽、字段保留、共享实体转场、降级与失焦暂停。当前流场分支又通过生产构建、10 项逻辑测试和 15 项 Chromium 浏览器测试，覆盖关键姿态、等待态连续运动、快速往返、失焦暂停与装饰避让。
- **真实 API 验收**：三项主题均生成通过校验的知识包：基础六面骰定义（3 个候选方向，5 次模型调用）、进阶自注意力机制（1 个候选方向，3 次调用）、带明确 `focus` 与 `must_include` 的骰子概率（1 个候选方向，5 次调用）。合计 13 次模型调用、36,468 tokens、约 83.69 秒；均未触发 Search / Fetch。费用金额未作估算。
- **前端创作界面**：React / TypeScript / Vite 应用已由 PR #7 进入 `main`，PR #9 完成首轮视觉重构，提供创作表单、内存密钥设置抽屉和明确标注的手动流程演示；PR #11 将首页改为连续回卷的青绿流带，并为创作页增加枝叶、波纹和花边。生产任务的真实连接、事件流和从成果交接工作台仍未接入；当前动画预览是独立研发入口，不会被创作流程冒充为用户成片。前端历史分支已检查五种屏宽、关键姿态、表单保留、共享节点、失焦暂停及装饰避让；Windows 字体和真实移动设备仍待人工验收。
- **前端创作界面**：React / TypeScript / Vite 应用提供创作表单、内存 API Key 设置和明确标注的手动流程演示。当前工作分支已将正式提交接入本地项目与任务 API；页面可轮询知识/脚本阶段、恢复项目和任务，并在脚本就绪时明确显示等待动画。API Key 只在发起请求时使用，不写入 session/local storage。工作台尚未消费真实 Manifest。
- **编辑器原型**：PR #8 合入独立 HTML 时间轴原型；数据来自硬编码 `CHAPTERS` / `ANIM_TRACKS`，不消费真实 `AnimationManifest`。`serve.py` 可本地展示原型；P0 预览已有独立播放与当前帧 bbox，但尚未接入编辑器选择、高亮覆盖或正式 `RevisionRequest`。
- **跨层能力边界**：工作流持久化 ProjectState revision JSON，按精确 KnowledgePackage 引用选择方向并运行至 ProductionScript 发布；上游知识包或方向变化时清除失效的下游当前引用，脚本可幂等复用。当前分支增加本地 HTTP API：可创建/恢复项目、启动和查询任务、读取精确产物、更新方向并取回动画交接输入。API Key 不写入项目、任务快照或前端持久化。真实模型脚本验收尚未执行；`script_writer.md` 仍由独立脚本执行器读取。
- **动画与修订交接**：动画负责人可从 `/handoff/animation` 获取当前精确脚本；提交的 Manifest 候选需通过 Schema、脚本/场景/事件引用、时间覆盖和本地资源路径校验，并保存在项目当前产物引用之外。因通用播放器尚未适配，该候选不会更新 `ProjectState.artifacts.animation_manifest`，预览 API 仍返回 `not_ready`。RevisionRequest 按现有 Schema、项目 revision 和精确目标产物版本校验后持久化；当前只确认接收，不自动修改任何成果。
- **动画 P0 试作**：`frontend/animation-preview.html` 提供独立研发预览，播放固定 PN v2 脚本 S01（15s），支持播放、Seek、当前帧元件边界查询与销毁。视频舞台样式隔离；该预览尚未接入 React 工作台、当前生产脚本或已发布 AnimationManifest。
- **本次主工作流交接验证**：`PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/api backend/tests/script backend/tests/integration -q` 通过（21 项）；`.venv/bin/python contracts/validate_contracts.py` 通过；API 模块编译通过；前端 `npm run build`、`npm test`（10 项）和 Playwright E2E（20 项）通过。本地 Uvicorn `/api/health` 返回 `{"status":"ok"}`。本次未发起真实模型请求。
- **检查入口**：

  ```bash
  PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
  .venv/bin/python contracts/validate_contracts.py
  ```

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 首版与 16:9 配置已进入 `main`，83 项测试通过 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 当前分支已实现模型客户端、结构化生成、有限修复、校验和不可覆盖版本发布；真实模型验收待做 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | React 创作任务已连接本地 API；P0 固定场景播放器和研发预览已集成；通用 Manifest 播放、真实工作台和正式视频仍待实现 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 当前分支有 ProjectState 编排、本地任务 API、精确动画交接、候选 Manifest 校验和 RevisionRequest 接收；自动修订未实现。现行契约含可选事件锚点、元件索引和渲染元件锚点 |

## 下一次集成重点

- 经用户明确同意后，对已发布 KnowledgePackage 复用知识并进行一次有成本边界的真实脚本验收；本次未执行。
- 动画负责人实现通用 Manifest 播放适配并发布当前 AnimationManifest 后，再将真实 ProductionScript 场景、播放头与工作台选择接入；在此之前候选资源不开放为用户预览。
- 完成多场景播放器和 Manifest 适配后，验证锚点实际播放时刻、片段覆盖及预览与导出一致性。
- 将稳定元件 ID 与当前帧 bbox 接入编辑器选择和高亮；修订请求目前只接收保存，需后续实现按层路由和局部重做。

## 活动任务

- 当前后端任务：`docs/tasks/open/backend/主工作流交接补全执行方案.md`，分支 `feat/non-animation-mainline`。阶段 A–E 与本地 Mock/浏览器检查已完成；真实模型脚本验收因方案要求先取得用户明确同意而未运行。完整动画运行时、工作台、自动修订和视频导出仍是后续工作；任务保留在 open，等待负责人验收。
- 动画任务：`docs/tasks/open/frontend/动画层与工作台接入执行方案.md`，当前落实 P0 固定 PN S01 预览；生产构建通过，4 项动画 Playwright 用例及 15 项既有前端 E2E 均通过。等待首幕效果验收后进入 P1。
- 已归档任务方案：跨层契约修订与分支整合（PR #6）、编辑器元件定位契约（PR #10）以及前端视觉相关方案已移至 `docs/tasks/closed/`。PR #10 的契约变更已进入 `main`；动画工作台联调仍由当前 P1 任务继续推进。
- 前序知识层任务已按 PR #5 集成进 `main`；脚本提示词源分支仅定向引入了所需文件，没有合并其余历史提交。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
