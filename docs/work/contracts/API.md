# 对外 API 与跨阶段契约入口

> 本文登记本地前后端已实现的 HTTP 对接；跨阶段正式数据仍以 `contracts/schemas/` 为准。传输响应不复制 ProjectState 或产物 Schema。

## 一、现行权威契约

| 位置（从仓库根目录起） | 作用 |
| --- | --- |
| `contracts/接口契约与协作规范.md` | 各阶段职责、对象语义、修改权限、版本与修订流程 |
| `contracts/schemas/*.schema.json` | 五类标准数据对象的机器可读约束 |
| `contracts/examples/*.example.json` | ProjectState、KnowledgePackage、ProductionScript、AnimationManifest、RevisionRequest 的 Mock 数据 |
| `contracts/validate_contracts.py` | Schema 与跨阶段一致性检查 |
| `docs/work/architecture.md` | 数据流及目录到模块的映射 |

其中 `ProjectState` 保存用户需求、已确认方向和当前产物引用；`KnowledgePackage` 为知识层输出；`ProductionScript` 为脚本层输出；`AnimationManifest` 为动画层输出；`RevisionRequest` 负责反馈。字段和类型请直接查 Schema。

## 二、本地 HTTP 端点

服务入口为 `backend/src/api/app.py` 的 `api.app:app`，本地开发绑定 `127.0.0.1:8000`。Vite 将 `/api` 代理到该地址。服务只允许回环请求，并只接受本地开发 Origin；不用于公开互联网或多用户部署。

API Key 由显式操作提交。模型连接测试会实际请求 DeepSeek；生成任务在知识层 LLM、Search/Fetch 与脚本层客户端中逐请求注入该 Key。密钥不进入 `.env`、ProjectState、Job 快照或前端存储。HTTP 错误只返回有限错误码和用户文案，服务日志不记录密钥和原始异常。

| 对接行为 | 逻辑输入 / 输出 | 传输端点 | 实施状态 |
| --- | --- | --- | --- |
| 本机服务存活检查 | 无 → `{status: "ok"}`；不测试模型凭证 | `GET /api/health` | 已实现 |
| 显式测试模型连接 | `{api_key}` → `{connected}`；一次低用量真实请求 | `POST /api/model/test` | 已实现 |
| 创建项目 | `{user_input}` → 完整 ProjectState 与 revision | `POST /api/projects` | 已实现 |
| 恢复项目 | 项目 ID → 当前 ProjectState | `GET /api/projects/{project_id}` | 已实现 |
| 启动/复用脚本任务 | `{target: "script", api_key, regenerate?}` → Job ID | `POST /api/projects/{project_id}/jobs` | 已实现；后台跑知识→脚本，单项目任务互斥 |
| 查询任务 | Job ID → 安全状态、阶段文案与已发布 ArtifactRef | `GET /api/jobs/{job_id}` | 已实现；轮询；重启时未完成任务标记 `interrupted` |
| 读取当前精确知识包 | `{artifact_id, revision}` → `KnowledgePackage` | `GET /api/projects/{project_id}/knowledge-package` | 已实现；不自动替换为最新版 |
| 读取当前精确脚本 | `{artifact_id, revision}` → `ProductionScript` | `GET /api/projects/{project_id}/production-script` | 已实现；重验上下游引用 |
| 确定创作方向 | `{direction_id, expected_project_revision}` → ProjectState | `POST /api/projects/{project_id}/direction` | 已实现；方向变化会使脚本/动画引用失效 |
| 动画输入交接 | 项目配置、精确脚本 ArtifactRef 与完整脚本 | `GET /api/projects/{project_id}/handoff/animation` | 已实现；无脚本为 `awaiting_script`，有脚本但无动画为 `awaiting_animation` |
| 发布动画 Manifest / 进入真实预览 | 已校验 Manifest 与可加载资源 → 当前 AnimationManifest | 待定 | 未实现；固定 PN P0 预览不是本项目的正式视频 |
| 接收修订请求 | 精确目标 ArtifactRef → `RevisionRequest` 回执 | 待定 | 未实现；没有自动修订执行器 |
| 确认与导出 | 已确认动画产物 → 视频文件 | 待定 | 未实现 |

脚本任务的 `script_ready` 只表示合法 ProductionScript 已发布，动画阶段保持 `pending`，不表示视频已生成。任务响应只含过滤后的用户语义，不回传模型调用明细或 traceback。

本地启动：

```bash
PYTHONPATH=backend/src .venv/bin/python -m uvicorn api.app:app --host 127.0.0.1 --port 8000
cd frontend && npm run dev
```

真实 API 确认后，此处仅补方法、路径、鉴权（如需）、异步状态、错误语义和负责人；请求/响应对象引用 Schema，不另抄一份字段表。

## 三、变更与验证

1. 共享数据对象的新增、删除或破坏性语义修改，先与受影响模块负责人协商。
2. **先更新 `contracts/schemas/`、示例、校验以及语义文档**，再同步生产者和消费者实现，避免产生两套权威定义。
3. 在仓库根目录执行 `python contracts/validate_contracts.py`，并检查调用方与 Mock 是否仍然匹配。未执行时不得宣称通过。
4. 已发布产物通过 `artifact_id + revision` 引用，不允许悄悄覆盖其他模块依赖的版本。
5. API 传输层与核心数据契约区分维护；不为简单的 Mock 交接强行建立复杂网络接口。
