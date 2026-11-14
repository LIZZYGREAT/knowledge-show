# knowledge-show 当前项目状态

> 当前 `main` 已包含知识层首版（PR #5）、可选脚本事件锚点与 v0.3 写作提示词（PR #6）、React 创作体验（PR #7）、独立时间轴编辑器原型（PR #8）和视觉重构（PR #9）。脚本生成执行器、共享工作流、动画运行时和视频导出仍未接通。

## 当前可用状态

- **默认分支**：`main`。
- **知识层主线状态**：首版研究、创意、核验、SQLite 状态管理、Streamlit 检验页、KnowledgePackage JSON 导出及 16:9 计费前校验已进入 `main`。知识层不再是待集成分支。
- **知识包交付**：KnowledgePackage 以 `{artifact_id}-r{revision}.json` 写入 `KNOWLEDGE_EXPORT_DIR`，通过原子发布、回读和 Schema 校验后才标记运行完成；已发布版本不会被不同内容覆盖。脚本消费者约定读取精确 ArtifactRef，不访问知识层 SQLite。
- **共享契约**：`evidence.kind=internal_review` 和 `ProductionScript.scenes[].events[].anchor` 可选布尔字段均已进入主线（PR #6）。`true` 固定关键呈现时刻，缺失或 `false` 保持名义时间；不要求每条脚本必须有锚点。PR #2 仍开着且要求强制锚点，与现行语义不同；PR #3 仍开着，其 v0.3 提示词已由 PR #6 引入。未按本任务关闭或改写这两个 PR，等待维护者处理。
- **人工检验页**：有密钥时用户预览使用在线生成并要求确认可能产生调用费用；无密钥时只提供固定主题离线示例，其他主题在运行前被拒绝。开发者诊断仍可切换 Mock / Real API；页面打开不会自动调用模型。
- **自动验证**：`.venv` 中 83 项知识层测试通过；`contracts/validate_contracts.py` 通过，覆盖五份 Schema、五份连贯样例、负向用例、可选锚点、可选元件索引、`render_element` 版本校验和非推荐方向切换。四份历史 ProductionScript 通过新版 Schema。另以本机已发布 `KP_P_LOCAL_KNOWLEDGE_REVIEW-r2`（项目 `P_LOCAL_KNOWLEDGE_REVIEW`，16:9、目标 165000ms）构造临时 ProjectState，并用 `PS001-r1` 固定结构 Mock 完成引用 Smoke：方向 `DIR_977f3a7e4dcf7665`，锚点事件 `EV06@125000ms` 映射到动画内部事件，0 次 API 调用。此检查不验证语义生成质量或实际播放命中。PR #9 的前端构建、7 项逻辑测试和 11 项 Chromium 浏览器测试通过，覆盖五种屏宽、字段保留、共享实体转场、降级与失焦暂停。当前流场分支又通过生产构建、10 项逻辑测试和 15 项 Chromium 浏览器测试，覆盖关键姿态、等待态连续运动、快速往返、失焦暂停与装饰避让。
- **真实 API 验收**：三项主题均生成通过校验的知识包：基础六面骰定义（3 个候选方向，5 次模型调用）、进阶自注意力机制（1 个候选方向，3 次调用）、带明确 `focus` 与 `must_include` 的骰子概率（1 个候选方向，5 次调用）。合计 13 次模型调用、36,468 tokens、约 83.69 秒；均未触发 Search / Fetch。费用金额未作估算。
- **前端创作界面**：React / TypeScript / Vite 应用已由 PR #7 进入 `main`，PR #9 完成首轮视觉重构，提供创作表单、内存密钥设置抽屉和明确标注的手动流程演示；`feat/frontend-organic-flow` 又将首页改为连续回卷的青绿流带，并为创作页增加枝叶、波纹和花边。真实连接、任务事件流、预览及工作台交接仍依赖后端与动画模块，界面不会模拟连接成功或开放虚假成片。新分支验证了五种屏宽、关键姿态、表单保留、共享节点、失焦暂停及装饰避让；Windows 字体和真实移动设备仍待人工验收。
- **编辑器原型**：PR #8 合入独立 HTML 时间轴原型；数据来自硬编码 `CHAPTERS` / `ANIM_TRACKS`，不消费真实 `AnimationManifest`。`serve.py` 可本地展示原型；独立动画渲染目录不在此仓库，实际播放寻址、当前帧 bbox、高亮覆盖和正式 `RevisionRequest` 尚未实现。
- **未实现的跨层能力**：脚本生成执行器、工作流协调器、共享 API、动画运行时、动态预览和视频导出仍未实现。`script_writer.md` 是可复用提示词，不代表脚本 Agent 已运行。知识层可准备版本文件；将引用发布到 `ProjectState.artifacts.knowledge_package` 仍是后续协调器的工作。
- **检查入口**：

  ```bash
  PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
  .venv/bin/python contracts/validate_contracts.py
  ```

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 首版与 16:9 配置已进入 `main`，83 项测试通过 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 有 v0.3 写作提示词和跨层契约；生成执行器仍待实现 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 创作界面已在 main；首页流场与创作页装饰在 `feat/frontend-organic-flow` 重做；时间轴为独立原型，动画运行时与元件检查待实现 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 工作流/API 业务待实现；契约包含可选事件锚点，当前任务新增可选元件索引与渲染元件锚点 |

## 下一次集成重点

- 脚本层负责人实现最小消费入口：按明确 ArtifactRef 读取 JSON、遵循所选方向与 `conditions`，并输出可校验 ProductionScript；目前只有提示词和 Mock 契约样例。
- 协调器后续发布精确知识包 ArtifactRef 并将已选方向交给脚本层；不得读取知识层 SQLite。
- 动画运行时完成后，再验证锚点实际播放时刻、片段覆盖以及预览与导出一致性。
- 动画运行时实现稳定 `element_id` 登记和当前帧 bbox 查询后，再将其接入编辑器选择、高亮与精确版本的修订请求。

## 活动任务

- 前端任务：`docs/tasks/open/frontend/前端视觉重新确立方向设计方案.md`，分支 `feat/frontend-organic-flow`，基于 `main@03de6c9` 创建。已完成流场与装饰重做、设计文档同步、构建和 10 项逻辑/15 项 Chromium E2E 验证，并审阅截图及录屏；视觉效果待负责人验收，任务仍在 `open/`。
- 跨层任务：`docs/tasks/open/backend/knowledge-show-main-跨层契约修订与分支整合执行方案.md` 的实现已通过 PR #6 进入 `main`；任务仍留在 `open/`，等待负责人确认后关闭。
- 当前任务：`docs/tasks/open/backend/编辑器元件定位契约修订方案.md`，分支 `fix/editor-element-selection-contract` 从 `main@03de6c9` 创建，PR #10 已向 `main` 提交审核。共享契约语义已获确认；本轮落实稳定元件 ID 索引与精确版本锚点。当前无动画运行时，因此真实 bbox 联调仍待实现。
- 前序知识层任务已按 PR #5 集成进 `main`；脚本提示词源分支仅定向引入了所需文件，没有合并其余历史提交。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
