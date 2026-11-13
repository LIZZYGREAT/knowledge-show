# knowledge-show 开发、验证与交付流程

> 适用于双人及各自的 Agent。目标是**小步开发、每步可验证、尽快完成联调**。不要求每个小改动都写长报告、开新文档或等待审批。总入口见 `AGENTS.md`。

## 一、接手任务

1. 检查当前分支、`git status --short`、最近提交，辨识未提交修改和当前任务基线。
2. 阅读 `README.md`、`STATUS.md` 及本次指定的 `docs/tasks/open/<任务>.md`；没有明确任务时以当前用户要求为准，禁止批量遍历任务历史。
3. 根据工作内容按需阅读 `docs/work/engineering.md`、`docs/work/architecture.md`、`contracts/` 与相应模块文档。产品交互任务查看 `docs/work/design-principles.md`；特定操作才看 `docs/playbooks/`。
4. 确认本次目标、改动范围、上游依赖和验收方式。对其他成员持有的模块或共享字段进行破坏性修改前先沟通。

## 二、按可验证的增量开发

遵循“**一个完整小目标 → 实现 → 局部验证 → Diff 检查 → Commit**”的循环。

- A 知识层、B 脚本层和动画/前端工作区可各自独立推进，优先通过 `contracts/examples/` 模拟上游输入。
- 跨层采用 `ProjectState`、`KnowledgePackage`、`ProductionScript`、`AnimationManifest`、`RevisionRequest`。更改字段、版本和引用规则时，**同一任务里更新契约、样例、校验和相关消费方**。
- 保持现有所有权：个人模块自主变更，共享 `backend/src/workflow/`、`backend/src/api/`、`contracts/` 由双方协调。
- 不因小功能提前引入大框架；有清楚复用理由才抽象公共组件。

## 三、分级验证

| 改动类型 | 建议验证 |
| --- | --- |
| 文案/样式 | 目标页面实际查看、相关语法或构建检查 |
| 知识研究或候选生成 | 有代表性的输入，事实依据、边界及知识包 Schema 检查 |
| 脚本编排 | 知识引用、场景时间、叙事事件和上下游 Mock 检查 |
| 动画场景 | 实际播放、时间状态、画面布局与场景引用；必要时检查音画同步 |
| 共享字段 / 跨层对接 | Schema + Mock + 消费方测试 + 相关回归 |
| 启动/导出/集成 | 在可复现环境运行主流程 Smoke Test，确认预览与导出相符 |

目前仓库已经提供的契约校验命令：

```bash
python -m pip install 'jsonschema>=4.18'
python contracts/validate_contracts.py
```

实际执行后记录命令和结果；**没有运行不能写“已通过”**。没有业务启动命令之前，不要虚构 npm、Python 服务或渲染测试已经完成。不同风险的改动采用相应验证强度，不要求每次全量检查。

## 四、提交与共享协作

1. 完成一个稳定、可解释的工作增量且相关检查通过后及时 Commit；多阶段任务允许多次提交。
2. 提交前检查 `git diff`、`git status --short` 和 `git diff --cached`，尽量显式暂存本任务路径，避免混入队友未提交文件。
3. Commit 描述清楚动作和对象；团队可选标注 `A` / `B`，不把它作为必须符合的格式。
4. 不擅自 Push、合并或修改共享历史；按 `docs/work/git-collaboration.md` 的授权流程执行。
5. 修改跨层契约前沟通：原行为、目标行为、影响消费者、联调办法和变更时机。

## 五、阶段交付

- 对任务中的验收项逐项说明：**完成内容、变更文件、实际执行的检查和结果、尚存问题**；未验证项目明确标注。
- 只按 `docs/work/documentation.md` 同步真正被修改触发的文档。接口变更先落在 `contracts/`，API 传输变更在 `docs/work/contracts/API.md` 登记。
- 重要集成/阻塞才更新 `STATUS.md`。确认完成的任务移到 `docs/tasks/closed/`，不在任务正文追加流水。
- 保持可运行主分支；长任务在独立分支中开发，合并前同步最新 `main` 并检查接口及主流程。

