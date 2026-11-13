# knowledge-show 文档维护规范

> 目标：新成员和 Agent 以最少阅读量找到**当前有效**的项目事实、协作规则和跨层契约。按责任维护，避免重复和文档膨胀。

## 一、权威来源与层级

| 信息 | 唯一权威位置 | 维护规则 |
| --- | --- | --- |
| 项目介绍、启动和导航 | `README.md` | 只写已确定信息，不虚构可运行命令 |
| Agent 启动、授权、交付 | `AGENTS.md` | 稳定、短而可执行 |
| 当前实现、任务与阻塞 | `STATUS.md` | 当前快照，更新重要进展即可 |
| 当前模块边界和数据流 | `docs/work/architecture.md` | 与实际代码、契约保持同步 |
| 稳定产品原则 | `docs/work/design-principles.md` | 用户确认后更新，避免随意改变 |
| 产品理念与具体体验约定 | `docs/work/design/产品理念与工作流共识.md` | 记录已确认的产品决策及尚未确定项 |
| 工程规范 | `docs/work/engineering.md` | 保持适度，不过度抽象 |
| 日常开发、测试与 Commit | `docs/work/workflow.md` | 集中维护流程规则 |
| 双人 Git 协作 | `docs/work/git-collaboration.md` | 仅规定分支、集成和权限 |
| 目录、责任与并行边界 | `docs/work/目录结构与分工.md` | 以实际仓库路径为准 |
| **跨阶段机器字段** | **`contracts/schemas/`** | 五类 Schema 的唯一机器定义 |
| 跨阶段交付与修订语义 | `contracts/跨阶段接口契约与协作规范.md` | 解释 Schema、对象所有权与版本 |
| 真实 API 端点与传输行为 | `docs/work/contracts/API.md` | 仅登记已实现对接，不复制 Schema 字段 |
| 跨层 Mock 与校验 | `contracts/examples/`、`contracts/validate_contracts.py` | 随契约同步更新 |
| 模块内部设计 | `docs/work/backend/`、`docs/work/frontend/` | 有实际复杂度时才补充 |
| 执行任务 | `docs/tasks/open/`、`docs/tasks/closed/` | 方案与已确认历史，不代表当前运行事实 |
| 可复用操作 | `docs/playbooks/` | 只有确有复用价值才维护 |
| 关键已完成变化 | `docs/work/logs/CHANGELOG.md` | 只记录已完成、已核验的里程碑 |

**事实、契约、意图分离**：代码与运行结果反映当前实现；`contracts/` 规定跨层数据语义；设计文档规定预期产品体验；任务文件规定本次要改什么。发生冲突时先核验再处理，不让过期任务覆盖真实现状。

## 二、按任务阅读，不批量扫描

1. 默认先读 `README.md`、`STATUS.md` 和指定的 `docs/tasks/open/<任务>.md`；Agent 另外遵守 `AGENTS.md`。
2. 只在涉及跨层数据时读 `contracts/` 相关 Schema、样例和语义文档；影响 API 传输时读 `docs/work/contracts/API.md`。
3. 产品或体验工作才补读 `docs/work/design-principles.md` 及相关产品文件；后端/前端具体设计按本次模块读。
4. 特定操作才检索 `docs/playbooks/`；**不要默认遍历** `docs/tasks/closed/` 或历史文档。

## 三、更新触发与责任

| 实际变化 | 更新动作 |
| --- | --- |
| 局部样式、简单 Bug、私有函数调整 | 通常不需要改正式文档 |
| 启动方式、稳定能力改变 | README / STATUS 相应条目 |
| 共享 Schema、字段或状态更新语义改变 | `contracts/schemas/`、语义说明、Mock、校验和消费方同步；先协商 |
| 新增或修改真实 HTTP/消息端点 | `docs/work/contracts/API.md` 与相关测试 |
| 重要模块边界、数据流改变 | `docs/work/architecture.md`、必要的模块文档 |
| 产品体验和目标经团队确认变更 | 更新现有产品原则与理念；不在末尾叠加补丁版本 |
| 活动任务、集成、阻塞变化 | STATUS 只留当前状态 |
| 重要已实现功能或稳定契约升级 | 可加简短 CHANGELOG，但必须已有核验结果 |

谁修改相关实现，谁检查受影响文档；跨所有权变更先与另一方确认。现行文档直接修订，不在同一目录制造多个“最终版”或“补充版”。Git 留存历史。

## 四、任务与操作手册

- 新任务参考 `docs/tasks/_TEMPLATE.md`，存入 `docs/tasks/open/`。包含目标、文件范围、合理建议、验证和结果对照。
- 任务被负责人确认完成后，从 `docs/tasks/open/` 移至 `docs/tasks/closed/`；不要在正文追加执行日志。
- 重复性操作参考 `docs/playbooks/_TEMPLATE.md`，存入 `docs/playbooks/`。只写该操作自己的步骤，不重复全局流程。
- 如果有典型可复用故障，可按需在 `docs/work/` 创建经验记录；不为一次普通失败新增永久文档。

## 五、维护完成标准

- README、AGENTS、STATUS 中引用的路径都在当前仓库存在。
- 已实现与待实现的能力明确区分。
- 合约、Mock、校验和调用方描述不互相矛盾。
- 重要的状态、版本和模块责任准确；没有因本任务而重复制造说明文件。
