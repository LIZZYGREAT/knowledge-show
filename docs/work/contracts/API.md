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

API Key 由显式操作提交。模型连接测试会实际请求 DeepSeek；生成任务在知识层 LLM、Search/Fetch 与脚本层客户端中逐请求注入该 Key。密钥不进入 `.env`、ProjectState、Job 快照或前端存储。HTTP 错误只返回有限错误码和用户文案；后台任务日志只记录 Job ID、失败阶段、公开错误码和异常类型，不记录密钥、原始异常内容或 traceback。

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
| 查询预览就绪状态 | 当前 Manifest 与真实可加载资源状态 | `GET /api/projects/{project_id}/preview` | 检查当前精确版本、资源内容和真实播放器检查回执；通过才返回 ready 与工作台/bundle URL |
| 接收动画 Manifest 候选 | Schema、脚本引用、场景/事件覆盖与本地资源文件 → 候选回执 | `POST /api/projects/{project_id}/animation-manifest` | 仅接收候选，不直接发布当前引用；正式发布使用下列生成入口 |
| 发起动画制作 | `{expected_project_revision, style_id?, custom_profile?, api_key?}` → 动画任务编号 | `POST /api/projects/{project_id}/animations` | 后台构思/验证/实际渲染，CAS 发布；失败保留旧版 |
| 动画制作状态 | 安全文案、当前预览与任务 | `GET /api/projects/{project_id}/animations/status`、`GET /api/projects/{project_id}/animations/jobs/{job_id}` | 刷新恢复；服务重启标记 interrupted |
| 获取已检查场景资源 | 精确动画版本 → 内部 bundle | `GET /api/projects/{project_id}/animations/{artifact_id}/r{revision}/bundle` | 重验不可覆盖文件、资源与检查回执；附当前 ProjectState revision 供提交反馈 |
| 风格档案 | 四套视频独立美术档案 | `GET /api/animation/styles` | 支持 auto/custom，不决定知识对象或事件 |
| 执行定向修订 | `{request: RevisionRequest, api_key?}` → 新动画或 upstream_required | `POST /api/projects/{project_id}/animations/revise` | 校验版本与锚点；只重做选中场景，涉知识/时间的请求另存上游路由 |
| 历史与回退 | 精确 ArtifactRef 与 expected_project_revision | `GET /api/projects/{project_id}/animations/versions`、`POST /api/projects/{project_id}/animations/activate` | 仅激活仍匹配当前脚本/brief 且已检查的旧版 |
| 接收修订请求 | Schema-valid `RevisionRequest` + 精确目标版本和可解析锚点 → `received` 回执 | `POST /api/projects/{project_id}/revision-requests` | 校验当前精确 ArtifactRef；实体锚点从正式已发布的 KnowledgePackage、ProductionScript 或经过播放器检查的 AnimationManifest 解析，时间范围不得越界。候选 Manifest 不作为已发布文件。只持久化回执，不自动执行修订，上游反馈由动画修订入口另行路由 |
| 导出视频 | `{artifact_ref}` → 导出任务编号 | `POST /api/projects/{project_id}/animations/export` | 当前已检查版本；同一 Player 逐帧截图与 FFmpeg 编码 |
| 导出进度和下载 | 实际帧数、编码状态、完成后下载 URL | `GET /api/projects/{project_id}/animations/exports/{export_id}`、`GET /api/projects/{project_id}/animations/exports/{export_id}/video` | ffprobe 确认时长和尺寸后才开放 MP4；重启中断需重新导出 |

脚本任务的 `script_ready` 只表示合法 ProductionScript 已发布，动画阶段保持 `pending`，不表示视频已生成。任务响应只含过滤后的用户语义，不回传模型调用明细或 traceback。

本地启动：

```bash
PYTHONPATH=backend/src .venv/bin/python -m uvicorn api.app:app --host 127.0.0.1 --port 8000
cd frontend && npm run dev
```

动画生成状态为 queued/running/completed/failed/interrupted；候选和失败版本不替换当前成果。内部 bundle/StyleProfile 是动画实现细节，不是第六份公共 Schema。新主题需要本次 API Key；精确匹配 PN 历史样本可离线生成。导出需要先构建前端，并安装 Chromium、FFmpeg、ffprobe。配音和音效尚未接入。

## 三、变更与验证

1. 共享数据对象的新增、删除或破坏性语义修改，先与受影响模块负责人协商。
2. **先更新 `contracts/schemas/`、示例、校验以及语义文档**，再同步生产者和消费者实现，避免产生两套权威定义。
3. 在仓库根目录执行 `python contracts/validate_contracts.py`，并检查调用方与 Mock 是否仍然匹配。未执行时不得宣称通过。
4. 已发布产物通过 `artifact_id + revision` 引用，不允许悄悄覆盖其他模块依赖的版本。
5. API 传输层与核心数据契约区分维护；不为简单的 Mock 交接强行建立复杂网络接口。
