# knowledge-show 当前项目状态

> 当前 `main` 已包含知识层首版及 16:9 配置（PR #5），并已通过 PR #6 纳入可选事件锚点契约和 v0.3 写作提示词。前端创作体验在 `feat/frontend-creation-experience` 独立分支准备 PR；脚本生成执行器、共享工作流和动画运行时仍未接通。

## 当前可用状态

- **默认分支**：`main`。
- **知识层主线状态**：首版研究、创意、核验、SQLite 状态管理、Streamlit 检验页、KnowledgePackage JSON 导出及 16:9 计费前校验已进入 `main`。知识层不再是待集成分支。
- **知识包交付**：KnowledgePackage 以 `{artifact_id}-r{revision}.json` 写入 `KNOWLEDGE_EXPORT_DIR`，通过原子发布、回读和 Schema 校验后才标记运行完成；已发布版本不会被不同内容覆盖。脚本消费者约定读取精确 ArtifactRef，不访问知识层 SQLite。
- **共享契约**：`evidence.kind=internal_review` 和 `ProductionScript.scenes[].events[].anchor` 可选布尔字段均已进入主线（PR #6）。`true` 固定关键呈现时刻，缺失或 `false` 保持名义时间；不要求每条脚本必须有锚点。未合并的 PR #2 提出不同的强制锚点语义，需双方协调。
- **人工检验页**：有密钥时用户预览使用在线生成并要求确认可能产生调用费用；无密钥时只提供固定主题离线示例，其他主题在运行前被拒绝。开发者诊断仍可切换 Mock / Real API；页面打开不会自动调用模型。
- **自动验证**：`.venv` 中 83 项知识层测试通过；`contracts/validate_contracts.py` 通过，覆盖五份 Schema、五份连贯样例、十三个负向用例、可选锚点和非推荐方向切换。四份历史 ProductionScript 通过新版 Schema。另以本机已发布 `KP_P_LOCAL_KNOWLEDGE_REVIEW-r2`（项目 `P_LOCAL_KNOWLEDGE_REVIEW`，16:9、目标 165000ms）构造临时 ProjectState，并用 `PS001-r1` 固定结构 Mock 完成引用 Smoke：方向 `DIR_977f3a7e4dcf7665`，锚点事件 `EV06@125000ms` 映射到动画内部事件，0 次 API 调用。此检查不验证语义生成质量或实际播放命中。前端分支已记录生产构建、7 项逻辑测试和 8 项 Chromium 浏览器测试通过；本次同步主线只改文档，未重跑前端测试。
- **真实 API 验收**：三项主题均生成通过校验的知识包：基础六面骰定义（3 个候选方向，5 次模型调用）、进阶自注意力机制（1 个候选方向，3 次调用）、带明确 `focus` 与 `must_include` 的骰子概率（1 个候选方向，5 次调用）。合计 13 次模型调用、36,468 tokens、约 83.69 秒；均未触发 Search / Fetch。费用金额未作估算。
- **前端创作界面**：`feat/frontend-creation-experience` 基于知识层收尾分支新增独立 React / TypeScript / Vite 应用，提供品牌轨迹动画、创作偏好、确认、内存密钥设置抽屉和明确标注的手动流程演示。运行入口见 `frontend/README.md`。真实连接、任务事件流、预览及工作台交接仍依赖后端与动画模块，界面不会模拟连接成功或开放虚假成片。分支已有生产构建、7 项逻辑测试、8 项 Chromium 浏览器测试（含五种屏宽）及既有契约校验通过的记录；Windows 字体和真实移动设备仍待人工验收。
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
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 基础目录，尚未确认运行能力 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 工作流/API 业务待实现；PR #6 已将可选脚本事件锚点契约与 Mock 校验纳入主线 |

## 下一次集成重点

- 脚本层负责人实现最小消费入口：按明确 ArtifactRef 读取 JSON、遵循所选方向与 `conditions`，并输出可校验 ProductionScript；目前只有提示词和 Mock 契约样例。
- 协调器后续发布精确知识包 ArtifactRef 并将已选方向交给脚本层；不得读取知识层 SQLite。
- 动画运行时完成后，再验证锚点实际播放时刻、片段覆盖以及预览与导出一致性。

## 活动任务

- 前端任务：`docs/tasks/open/frontend/前端视觉与交互设计.md`，实现分支 `feat/frontend-creation-experience`。视觉骨架、表单和流程演示已实现；本次仅同步主线并准备独立 PR，真实 API 连接、生成事件订阅及工作台交接等待上游能力。任务保留在 `open/`。
- 跨层任务：`docs/tasks/open/backend/knowledge-show-main-跨层契约修订与分支整合执行方案.md` 的实现已通过 PR #6 进入 `main`；任务仍留在 `open/`，等待负责人确认后关闭。
- 前序知识层任务已按 PR #5 集成进 `main`；脚本提示词源分支仅定向引入了所需文件，没有合并其余历史提交。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
