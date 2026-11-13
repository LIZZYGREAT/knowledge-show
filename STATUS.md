# knowledge-show 当前项目状态

> 当前快照以仓库 `main` 的基础目录和已有契约文件为依据。**产品目标与已实现能力分开记录**；实际开发状态应由负责模块的成员在合并或交接后更新。

## 当前可用状态

- **默认分支**：`main`。
- **已建立**：`backend/`、`frontend/`、`contracts/`、`docs/` 的模块化工作区；跨阶段契约的五份 JSON Schema、五份 Mock 示例和校验脚本。
- **尚未确认可运行**：知识研究 Agent、脚本 Agent、动画运行环境、前后端应用、端到端生成、视频导出。
- **当前主要限制**：业务实现目录大多仍为 `.gitkeep` 占位；尚无仓库级已验证的应用启动命令。
- **已存在的检查入口**：`python contracts/validate_contracts.py`；此状态快照不将该命令记作已在开发环境通过。

## 责任与工作区

| 工作范围 | 主要负责方 | 当前状态 |
| --- | --- | --- |
| `backend/src/knowledge/`、`backend/tests/knowledge/` | 成员 A（知识层） | 基础目录，具体 Agent 工作流待实现 |
| `backend/src/script/`、`backend/tests/script/` | 成员 B（脚本层） | 基础目录，具体脚本工作流待实现 |
| `frontend/src/animation/`、`frontend/src/features/` | 按团队当前任务认领 | 基础目录，尚未确认运行能力 |
| `backend/src/workflow/`、`backend/src/api/`、`contracts/` | 双方按任务协商 | 共享区；接口变动应先同步 |

## 下一次集成重点

- **目标**：首先使用 `contracts/examples/` 进行知识包 → 脚本 → 动画清单的 Mock 联调，再接入真实模块。
- **共享约束**：`contracts/跨阶段接口契约与协作规范.md` 与 `contracts/schemas/` 是当前阶段交接依据；如要改变字段或语义，由双方确认后同改文档、Schema、示例和校验。
- **验证**：契约校验，逐层 Mock 消费测试；实际主流程与视觉/音视频验收在实现后补充。

## 活动任务

暂无已在此状态文件登记的具体执行任务。新增时填写负责人、任务文件 `docs/tasks/open/<名称>.md`、工作分支和阻塞；完成确认后移除，不保留流水历史。

更新规则：只有形成稳定能力、任务发生交接、出现重要阻塞或完成集成时更新此文档。尚未验证的功能不得写成“已完成”。
