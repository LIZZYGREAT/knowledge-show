# knowledge-show 双人 Git 协作规范

> 核心目标：**低沟通成本、互不覆盖、及时集成、`main` 可运行**。本文只规定 Git 协作，模块职责见 `docs/work/目录结构与分工.md`，实现与验证见 `docs/work/workflow.md`。

## 一、分支策略

采用一个 `main` 和短生命周期任务分支。

- `main`：共享集成基线。不得将已知破坏关键流程的改动直接合入。
- 功能/修复分支：围绕一个明确的任务或可验证增量建立；例如 `feat/knowledge-package`、`feat/script-timeline`、`fix/revision-routing`、`docs/update-paths`。
- 分支不要求按成员长期划分；鼓励按模块和文件减少冲突。
- 两位成员及 Agent 不要在同一个工作树中同时修改相同文件。跨层依赖先用 `contracts/examples/` Mock 并行推进。

## 二、修改与沟通边界

| 变更类型 | 默认做法 |
| --- | --- |
| 自己负责模块内的一般实现或可逆修复 | 自主修改、验证、Commit |
| 简单文案、注释、小范围文档更新 | 可按低风险流程处理 |
| `contracts/` 的 Schema、语义、示例与校验 | **先向双方确认影响**，同步修改全部关联文件 |
| `backend/src/workflow/`、`backend/src/api/`、公共配置 | 变更前同步接口和影响范围 |
| 另一人的业务模块 | 说明理由并取得负责方确认 |
| 删除数据、重写共享历史、强推、清理其他工作区 | 必须明确授权；默认不执行 |

跨层变更的沟通应尽量短：**改什么 → 哪些调用方受影响 → 如何联调 → 谁来同步**。契约达成一致后在仓库的权威文件中更新，不维护聊天版第二套字段。

## 三、日常命令

确认工作目录没有需要保护的未提交修改后，从最新主分支创建任务分支：

```bash
git status --short
git branch --show-current
git switch main
git pull --ff-only origin main
git switch -c feat/short-description
```

预期：位于新的任务分支，基于最新 `main`。如果有未提交工作，先判断归属并保存，不要通过 `reset --hard` 或 `clean -fd` 强行切换。

完成稳定增量后：

```bash
git status --short
git add <本任务的文件路径>
git diff --cached --stat
git diff --cached
git commit -m "feat: add knowledge package validation"
```

需要共享分支时，根据团队已授权的流程再 Push；不要用未经检查的 `git add .` 提交别人或无关的修改。长任务分阶段 Commit，不要求每修改一行代码提交一次。

合并前在**任务分支**同步主分支：

```bash
git fetch origin
git merge origin/main
```

有冲突时比较双方真实改动意图，尤其不能为消除冲突直接覆盖他人负责的接口或代码。

## 四、PR 与合并

- 一般功能任务推荐 PR，便于查看 Diff、执行 CI（当其建立后）和合并；低风险无冲突修改可经团队约定简化。
- PR 描述完成的功能、受影响范围、执行过的测试及结果、共享接口是否改变。只有已经运行的测试才能标为通过。
- 改变 `contracts/`、全局状态或其他成员模块时，相关负责人需确认 Mock、Schema 与调用方协调完成。
- 可优先考虑 Squash merge，保持主分支历史简洁。**合并到 `main` 由人确认**，不授权 Agent 自主强推或删除共享分支。
- 合并后通知另一方新增的可用能力、版本和集成注意点；不需要为无共享影响的小提交编写长报告。

## 五、CI 与状态维护

当前仓库的契约校验入口为：

```bash
python contracts/validate_contracts.py
```

技术栈与 CI 确定后，可以在 `.github/workflows/` 以一个轻量入口运行契约校验、已有后端和前端必要检查。

只有发生重要集成、负责人交接或阻塞时才更新 `STATUS.md`，并按照 `docs/work/documentation.md` 修改权威文档；完整历史由 Git 保存。
