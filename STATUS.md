# knowledge-show 当前项目状态

> 当前快照区分默认分支与未集成的模块分支。知识层首版在 `feat/knowledge-layer-implementation`；成本效率与用户体验修订在 `feat/knowledge-cost-efficiency-ux`，尚未合并到 `main`。脚本、动画和跨层工作流仍按实际代码确认。

## 当前可用状态

- **默认分支**：`main`。
- **知识层工作分支**：`feat/knowledge-layer-implementation` 实现首版；`feat/knowledge-cost-efficiency-ux` 补充风险驱动核验、有限补证、用户预览/开发者诊断分层和自然语言失败提示。
- **知识层验证**：使用仓库 `.venv` 运行 62 项知识层测试与契约校验。当前修订分支真实 DeepSeek 验收中，“真空中的光速精确值”主题通过 KnowledgePackage 校验，7 次模型调用、2 次 Search、2 次 Fetch，耗时约 50.44 秒。其他验收输入曾遇到模型 JSON/字段格式无效和来源 Fetch 404；均保留为失败，没有将未核验内容交付。
- **待协商限制**：公共契约仍没有 `internal_review` 证据类型。纯基础知识虽可进行低风险轻量核查，但若没有真实来源或可复核推导，当前不能组成合法 KnowledgePackage；本分支没有单方面修改共享 Schema。
- **尚未集成**：脚本 Agent、动画运行时、共享工作流/API、端到端动态预览与视频导出。
- **检查入口**：

  ```bash
  PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
  .venv/bin/python contracts/validate_contracts.py
  ```

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 首版与成本效率/体验修订分别在 `feat/knowledge-layer-implementation`、`feat/knowledge-cost-efficiency-ux` 验证，等待集成确认 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 基础目录，具体脚本工作流待实现 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 基础目录，尚未确认运行能力 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 共享区；本次未修改公共 Schema |

## 下一次集成重点

- 将知识层接入 `ProjectState` 工作流，再使用现有 Mock 契约联调脚本层与动画层。
- 保持 `contracts/接口契约与协作规范.md` 和 `contracts/schemas/` 为跨阶段交接依据；字段或状态语义变更仍需协商，并同步 Schema、示例、生产方与消费方。
- 真实动画预览与导出功能实现后，分别检查预览和成片一致性。

## 活动任务

- 当前任务：`docs/tasks/open/backend/知识层成本效率与用户体验修订方案.md`。
- 工作分支：`feat/knowledge-cost-efficiency-ux`；修订与验证已完成，尚未合并。公共 `internal_review` 证据语义仍待共享接口负责人协商；任务文件仍待负责人确认后再移入 `closed/`。
- 前序任务：`docs/tasks/open/backend/知识层实现方案.md` 在 `feat/knowledge-layer-implementation` 完成首版，等待集成与任务关闭确认。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
