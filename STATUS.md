# knowledge-show 当前项目状态

> 当前快照区分默认分支与未集成的模块分支。知识层已在 `feat/knowledge-layer-implementation` 实现并验证，尚未合并到 `main`；脚本、动画和跨层工作流仍按实际代码确认。

## 当前可用状态

- **默认分支**：`main`。
- **知识层工作分支**：`feat/knowledge-layer-implementation`，包含可运行的 Research / Creative / Verifier 工作流、Search/Fetch、项目级 SQLite 研究库、KnowledgePackage 校验与导出，以及本地 Streamlit 检验页。
- **知识层验证**：使用仓库 `.venv` 运行 54 项知识层测试与契约校验；真实 DeepSeek 验收覆盖生日悖论、物理（创意优先与直观演示）、Attention 进阶和自定义方向。部分网页 Fetch 返回 404 时会记录失败，并且不把 Search 摘要当作来源证据。
- **尚未集成**：脚本 Agent、动画运行时、共享工作流/API、端到端动态预览与视频导出。
- **检查入口**：

  ```bash
  PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
  .venv/bin/python contracts/validate_contracts.py
  ```

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 在 `feat/knowledge-layer-implementation` 实现并验证，等待集成确认 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 基础目录，具体脚本工作流待实现 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 基础目录，尚未确认运行能力 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 共享区；本次未修改公共 Schema |

## 下一次集成重点

- 将知识层接入 `ProjectState` 工作流，再使用现有 Mock 契约联调脚本层与动画层。
- 保持 `contracts/接口契约与协作规范.md` 和 `contracts/schemas/` 为跨阶段交接依据；字段或状态语义变更仍需协商，并同步 Schema、示例、生产方与消费方。
- 真实动画预览与导出功能实现后，分别检查预览和成片一致性。

## 活动任务

- 任务：`docs/tasks/open/backend/知识层实现方案.md`。
- 工作分支：`feat/knowledge-layer-implementation`；知识层实现和验收已完成，尚未合并，任务文件仍待负责人确认后再移入 `closed/`。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
