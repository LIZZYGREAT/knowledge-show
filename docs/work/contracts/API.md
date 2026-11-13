# 对外 API 与跨阶段契约入口

> 当前仓库已拥有**跨阶段数据契约**，但尚未确认使用哪种 API 传输协议或具体服务端点。本文是对接导航与后续端点登记处，**不重复定义数据字段**。

## 一、现行权威契约

| 位置（从仓库根目录起） | 作用 |
| --- | --- |
| `contracts/跨阶段接口契约与协作规范.md` | 各阶段职责、对象语义、修改权限、版本与修订流程 |
| `contracts/schemas/*.schema.json` | 五类标准数据对象的机器可读约束 |
| `contracts/examples/*.example.json` | ProjectState、KnowledgePackage、ProductionScript、AnimationManifest、RevisionRequest 的 Mock 数据 |
| `contracts/validate_contracts.py` | Schema 与跨阶段一致性检查 |
| `docs/work/architecture.md` | 数据流及目录到模块的映射 |

其中 `ProjectState` 保存用户需求、已确认方向和当前产物引用；`KnowledgePackage` 为知识层输出；`ProductionScript` 为脚本层输出；`AnimationManifest` 为动画层输出；`RevisionRequest` 负责反馈。字段和类型请直接查 Schema。

## 二、API 端点登记（待实际实现后填写）

当前 `backend/src/api/` 仍为占位目录，尚未确定 HTTP、WebSocket 或其他传输方式；**不在文档中预设路径或成功响应**。

| 对接行为 | 逻辑输入 / 输出 | 传输端点 | 实施状态 |
| --- | --- | --- | --- |
| 创建/更新项目 | `ProjectState.brief` → `ProjectState` | 待定 | 未实现 |
| 生成知识候选与知识包 | `ProjectState` → `KnowledgePackage` | 待定 | 未实现 |
| 确定/调整创作方向 | 方向 ID + 项目版本 → 更新后的 `ProjectState` | 待定 | 未实现 |
| 生成脚本 | 项目状态 + 知识包引用 → `ProductionScript` | 待定 | 未实现 |
| 生成预览产物 | 项目状态 + 脚本引用 → `AnimationManifest` | 待定 | 未实现 |
| 提交反馈与修订 | `RevisionRequest` → 受影响产物的新版本 | 待定 | 未实现 |
| 确认与导出 | 已确认动画产物 → 视频文件 | 待定 | 未实现 |

真实 API 确认后，此处仅补方法、路径、鉴权（如需）、异步状态、错误语义和负责人；请求/响应对象引用 Schema，不另抄一份字段表。

## 三、变更与验证

1. 共享数据对象的新增、删除或破坏性语义修改，先与受影响模块负责人协商。
2. **先更新 `contracts/schemas/`、示例、校验以及语义文档**，再同步生产者和消费者实现，避免产生两套权威定义。
3. 在仓库根目录执行 `python contracts/validate_contracts.py`，并检查调用方与 Mock 是否仍然匹配。未执行时不得宣称通过。
4. 已发布产物通过 `artifact_id + revision` 引用，不允许悄悄覆盖其他模块依赖的版本。
5. API 传输层与核心数据契约区分维护；不为简单的 Mock 交接强行建立复杂网络接口。
