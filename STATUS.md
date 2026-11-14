# knowledge-show 当前项目状态

> 当前动画分支 `feat/animation-runtime-workbench` 已在合并 PR #13 的主线基础上落实动画方案 P1–P4：七幕 PN 样片、四种独立风格、真实工作台、精确修订、版本回退及同源 MP4 导出。正式生成入口消费当前已发布脚本并经过实际浏览器检查后发布；本轮未付费调用模型验收新主题。

## 当前可用状态

- **默认分支**：`main`。
- **知识层主线状态**：首版研究、创意、核验、SQLite 状态管理、Streamlit 检验页、KnowledgePackage JSON 导出及 16:9 计费前校验已进入 `main`。知识层不再是待集成分支。
- **知识包交付**：KnowledgePackage 以 `{artifact_id}-r{revision}.json` 写入 `KNOWLEDGE_EXPORT_DIR`，通过原子发布、回读和 Schema 校验后才标记运行完成；已发布版本不会被不同内容覆盖。脚本消费者约定读取精确 ArtifactRef，不访问知识层 SQLite。
- **共享契约**：`evidence.kind=internal_review` 和 `ProductionScript.scenes[].events[].anchor` 可选布尔字段均已进入主线（PR #6）。`true` 固定关键呈现时刻，缺失或 `false` 保持名义时间；不要求每条脚本必须有锚点。PR #10 已合并，将可选 `selectable_elements` 和 `render_element` 修订锚点纳入主线。PR #2 仍开着且要求强制锚点，与现行语义不同；PR #3 仍开着，其 v0.3 提示词已由 PR #6 引入。旧 PR 的不同语义仍待维护者处理。
- **人工检验页**：有密钥时用户预览使用在线生成并要求确认可能产生调用费用；无密钥时只提供固定主题离线示例，其他主题在运行前被拒绝。开发者诊断仍可切换 Mock / Real API；页面打开不会自动调用模型。
- **自动验证**：`.venv` 中 83 项知识层测试通过；`contracts/validate_contracts.py` 通过，覆盖五份 Schema、五份连贯样例、负向用例、可选锚点、可选元件索引、`render_element` 版本校验和非推荐方向切换。四份历史 ProductionScript 通过新版 Schema。另以本机已发布 `KP_P_LOCAL_KNOWLEDGE_REVIEW-r2`（项目 `P_LOCAL_KNOWLEDGE_REVIEW`，16:9、目标 165000ms）构造临时 ProjectState，并用 `PS001-r1` 固定结构 Mock 完成引用 Smoke：方向 `DIR_977f3a7e4dcf7665`，锚点事件 `EV06@125000ms` 映射到动画内部事件，0 次 API 调用。此检查不验证语义生成质量或实际播放命中。合并后脚本测试 10 项、工作流集成测试 3 项、知识层 83 项、前端单测 10 项均通过；契约校验和包含 P0 预览页的前端生产构建通过。Playwright 的 19 项 E2E 全部通过，包括动画 Seek/身份、当前帧边界、样式隔离、快速 Seek 取消、播放暂停及既有创作页回归。本机通过 `LD_LIBRARY_PATH=/tmp/knowledge-show-browser-deps/root/usr/lib/x86_64-linux-gnu` 提供 Chromium 系统库；未配置系统库时 Chromium 无法启动。PR #9 的前端构建、7 项逻辑测试和 11 项 Chromium 浏览器测试通过，覆盖五种屏宽、字段保留、共享实体转场、降级与失焦暂停。当前流场分支又通过生产构建、10 项逻辑测试和 15 项 Chromium 浏览器测试，覆盖关键姿态、等待态连续运动、快速往返、失焦暂停与装饰避让。
- **真实 API 验收**：三项主题均生成通过校验的知识包：基础六面骰定义（3 个候选方向，5 次模型调用）、进阶自注意力机制（1 个候选方向，3 次调用）、带明确 `focus` 与 `must_include` 的骰子概率（1 个候选方向，5 次调用）。合计 13 次模型调用、36,468 tokens、约 83.69 秒；均未触发 Search / Fetch。费用金额未作估算。
- **前端创作与工作台**：React 创作页已消费真实知识→脚本任务，并可显式发起动画制作、恢复进度；资源检查通过才开放工作台。时间轴消费实际 script/Manifest/元件索引，支持精确 Seek、缩放平移、拖入反馈、真实 bbox、定向修改、旧版回退和 MP4 下载。网页美术与四种视频风格隔离，固定样片模式明确标注。API Key 不持久化。
- **跨层能力边界**：工作流持久化 ProjectState revision JSON，按精确 KnowledgePackage 引用选择方向并运行至 ProductionScript 发布；上游知识包或方向变化时清除失效的下游当前引用，脚本可幂等复用。当前分支增加本地 HTTP API：可创建/恢复项目、启动和查询任务、读取精确产物、更新方向并取回动画交接输入。API Key 不写入项目、任务快照或前端持久化。真实模型脚本验收尚未执行；`script_writer.md` 仍由独立脚本执行器读取。
- **动画生成与发布**：`backend/src/animation/` 提供受控矢量场景生成、不可覆盖资源及检查后 CAS 发布；旧候选 API 仍仅接收候选。当前预览重验精确脚本、资源内容和检查回执。PN 离线生产仅匹配原样本；其他主题需要模型。自然语言局部修改只重做选中场景，保留稳定 ID 与脚本时刻；涉及知识/叙事约束的反馈另存上游请求，尚不自动重跑上游。
- **完整样本与视频**：PN v2 七幕、165 秒；发布 r1→S02 减速 r2，仅 S02 资源变化，回退/恢复成功。实际 MP4 为 H.264、1280×720、24fps、3960 帧、165.000 秒、约 4.6MB；七个采样帧对照 SSIM 0.988581–0.993574。没有配音或音效。导出复用纯视频 Player，不包含编辑覆盖物。运行与限制见 `docs/work/frontend/animation/运行时与首幕预览.md`。
- **本轮验证**：`npm run build`、`npm test`（13 项）、Playwright（28 项，含通用矢量场景及首幕局部速度修订）、`PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests --import-mode=importlib -q`（116 项）和 `contracts/validate_contracts.py` 均通过。实际浏览器发布、局部修订、回退、整片编码和 ffprobe 检查已执行；新主题付费模型视觉验收未执行。
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
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 真实创作任务、动画生成交接、独立风格播放器、真实工作台及同源视频导出已接通 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 已提供 ProjectState 编排、任务 API、动画检查后发布与定向修订；知识/脚本上游反馈仍仅接收。现行契约含可选事件锚点、元件索引和渲染元件锚点 |

## 下一次集成重点

- 经用户明确同意后，对已发布 KnowledgePackage 复用知识并进行一次有成本边界的真实脚本验收；本次未执行。
- 动画资源须通过实际浏览器检查才开放预览；新主题与自定义美术仍需逐片审核，固定 PN 样片不替代通用生成验收。
- 对新的真实主题继续验收知识机制、关键帧和运动质量，现有完整 PN 样本已验证预览与导出。
- 稳定元件与局部动画修订已经接通；后续上游反馈需要知识/脚本层执行器消费，不在动画层静默改写。

## 活动任务

- 当前后端任务：`docs/tasks/open/backend/主工作流交接补全执行方案.md`，分支 `feat/non-animation-mainline`。阶段 A–E 与本地 Mock/浏览器检查已完成；真实模型脚本验收因方案要求先取得用户明确同意而未运行。动画扩展已在当前分支实现；任务保留在 open，等待负责人验收。
- 动画任务：`docs/tasks/open/frontend/动画层与工作台接入执行方案.md`，当前落实 P0–P4，已完成完整固定样本的实际发布、修订、回退与 MP4 导出。保留在 open 等待负责人视觉与产品验收。
- 已归档任务方案：跨层契约修订与分支整合（PR #6）、编辑器元件定位契约（PR #10）以及前端视觉相关方案已移至 `docs/tasks/closed/`。PR #10 的契约变更已进入 `main`；动画工作台与导出已由当前 P1–P4 实现接通。
- 前序知识层任务已按 PR #5 集成进 `main`；脚本提示词源分支仅定向引入了所需文件，没有合并其余历史提交。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
