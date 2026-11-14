# knowledge-show 当前项目状态

> 当前快照区分默认分支与未集成的模块分支。`main` 仍以基础目录和跨阶段契约为主；知识层及其修订位于独立工作分支，脚本、动画和共享工作流尚未接通。

## 当前可用状态

- **默认分支**：`main`。
- **当前知识层分支**：`feat/knowledge-16x9-closeout`，从 `feat/knowledge-handoff-readiness` 的 `de65aa6` 基点继续完成首版画幅对齐；本轮方案提交为 `fed7b3d`，代码、示例和跨层说明已完成本地验证。本分支尚未合并。
- **知识包交付**：KnowledgePackage 以 `{artifact_id}-r{revision}.json` 写入 `KNOWLEDGE_EXPORT_DIR`，通过原子发布、回读和 Schema 校验后才标记运行完成；已发布版本不会被不同内容覆盖。脚本消费者约定读取精确 ArtifactRef，不访问知识层 SQLite。
- **共享契约**：共享接口负责人已同意新增 `evidence.kind=internal_review`。本分支已同步 Schema、契约说明、示例、校验和生产逻辑。该类型只记录稳定低风险基础知识的具体内部核查；数值、时效、争议、实验及重要因果主张仍需来源或可复核推导。`required_knowledge_refs` 仅能列出所有候选方向通用的硬性知识，默认为空。
- **人工检验页**：有密钥时用户预览使用在线生成并要求确认可能产生调用费用；无密钥时只提供固定主题离线示例，其他主题在运行前被拒绝。开发者诊断仍可切换 Mock / Real API；页面打开不会自动调用模型。
- **自动验证**：当前分支 `.venv` 中 83 项知识层测试通过；`contracts/validate_contracts.py` 通过，覆盖五份 Schema、五份连贯样例、十一个负向用例和非推荐方向切换。Streamlit 离线 Mock 预览、导出文件版本命名与画幅拒绝分支均由本地测试覆盖。
- **真实 API 验收**：三项主题均生成通过校验的知识包：基础六面骰定义（3 个候选方向，5 次模型调用）、进阶自注意力机制（1 个候选方向，3 次调用）、带明确 `focus` 与 `must_include` 的骰子概率（1 个候选方向，5 次调用）。合计 13 次模型调用、36,468 tokens、约 83.69 秒；均未触发 Search / Fetch。费用金额未作估算。
- **前端创作界面**：`feat/frontend-creation-experience` 基于知识层收尾分支新增独立 React / TypeScript / Vite 应用，提供品牌轨迹动画、创作偏好、确认、内存密钥设置抽屉和明确标注的手动流程演示。运行入口见 `frontend/README.md`。真实连接、任务事件流、预览及工作台交接仍依赖后端与动画模块，界面不会模拟连接成功或开放虚假成片。生产构建、7 项逻辑测试、8 项 Chromium 浏览器测试（含五种屏宽）及既有契约校验通过；Windows 字体和真实移动设备仍待人工验收。
- **未实现的跨层能力**：脚本 Agent、工作流协调器、共享 API、动画运行时、动态预览和视频导出仍未实现。知识层会准备可读的版本文件；将引用发布到 `ProjectState.artifacts.knowledge_package` 仍是后续协调器的工作。
- **检查入口**：

  ```bash
  PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
  .venv/bin/python contracts/validate_contracts.py
  ```

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 首版、体验修订、联调前修订与 16:9 收尾均在独立分支验证，等待集成确认 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 基础目录，具体脚本工作流待实现 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 基础目录，尚未确认运行能力 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 工作流/API 业务待实现；联调前分支已按负责人同意修订知识包契约 |

## 下一次集成重点

- 协调器在确认版本 JSON 可读取后发布精确知识包 ArtifactRef，并把已选方向交给脚本层。
- 脚本层依所选方向的 `knowledge_refs` 取材，遵守知识单元 `conditions`；不要把方向内 Claim 依赖当作全局必选内容。
- 以知识包中的非推荐方向进行联调，确认 `ProductionScript.direction_id` 与项目决策一致，并精确引用同一知识包版本。
- 动画运行时完成后，分别检查实际预览和导出成片的一致性。

## 活动任务

- 前端任务：`docs/tasks/open/frontend/前端视觉与交互设计.md`，实现分支 `feat/frontend-creation-experience`。视觉骨架、表单和流程演示已实现；真实 API 连接、生成事件订阅及工作台交接等待上游能力。任务保留在 `open/`。

- 当前任务：`docs/tasks/open/backend/跨层联调收尾修订方案.md`，工作分支 `feat/knowledge-16x9-closeout`。默认画幅、早期拒绝、跨层示例和说明已完成；83 项知识层测试及契约校验通过。任务仍留在 `open/`，等待负责人确认后关闭。
- 前序任务：`docs/tasks/open/backend/知识层联调前最小修订方案.md`（分支 `feat/knowledge-handoff-readiness`）的实现、本地与真实 API 验收已完成，仍等待负责人确认后关闭；成本效率与用户体验修订及知识层实现任务位于各自功能分支，等待集成及任务关闭确认。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
