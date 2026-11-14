# knowledge-show

> 面向普通创作者的 AI 知识短视频制作项目。已具备本地知识→脚本任务、动画生成与实际播放检查、真实时间轴工作台、定向修订和同源 MP4 导出。动画层已验收完整 PN 固定样本；新主题通过模型生成受控矢量场景，仍需逐片审美与知识审核。

## 项目目标

用户提供知识主题及可选的细化方向、创作模式、知识深度、美术偏好等信息。系统主动探索可靠知识与有吸引力的创意方向，规划具有清晰主线的时间脚本，生成真实可播放的动态视频预览；用户可以针对内容、节奏或动画提出修改，确认后导出视频。

面向一般观众，以时长约 **2 分 30 秒至 3 分钟**的知识短视频为典型产物。重视观看吸引力、明确的知识发现，以及**具有核心视觉对象、稳定视觉重心和自然连续变化的动画表达**。不以讲完一套完整课程为目标，不能用一组文字、公式和静态卡片轮流出现的 PPT 式表现代替真正的知识动画。

主生产链路：**ProjectState → 知识层（KnowledgePackage）→ 脚本层（ProductionScript）→ 动画层（AnimationManifest）→ 预览、修订与导出**。

- **知识层**：知识研究与创意构想相互促进；统一管理研究素材、知识主张和证据，按必要风险核验，交付值得制作的方向及可靠知识。允许模型已有知识、推导和必要的外部检索共同参与研究，不预设知识条目数量，也不提前规定具体分镜。
- **脚本层**：选取可靠素材，围绕核心知识问题设计认知与事件主线，确定时间、事件和画面文字。
- **动画层**：自主设计可持续追踪的视觉对象、知识关系和连续运动，形成可引用片段及实际预览产物。
- **工作流与接口层**：维护项目状态、版本、跨层调用及局部修订路由。用户无需理解内部 Agent 分工或亲自审核知识资料。

具体分工和目录见 [目录结构与分工](docs/work/目录结构与分工.md)，产品理念见 [产品理念与工作流共识](docs/work/design/产品理念与工作流共识.md)，知识层内部工作流见 [知识层探索与创意策划](docs/work/backend/knowledge/知识层探索与创意策划.md)，知识层开发选型与环境安装见 [知识层技术栈路线](docs/work/backend/知识层技术栈路线.md)。

## 当前可运行范围

仓库包含五类跨阶段契约及校验工具。知识与脚本层按精确版本交接；动画层消费已发布脚本，生成独立风格场景，经过 Schema、引用、资源与实际浏览器检查后才发布当前 AnimationManifest。React 创作页可发起动画制作、恢复任务并进入工作台。工作台复用同一 Player，支持多场景 Seek、真实元件框选、携带精确版本的反馈、局部修订、版本回退和 MP4 导出。PN v2 固定样本已完成 165 秒实际导出；没有配音或音效。通用新主题模型入口已实现并经注入客户端验证，本轮未付费调用模型验收新主题。启动见 [API 文档](docs/work/contracts/API.md)、[前端说明](frontend/README.md) 与 [动画运行说明](docs/work/frontend/animation/运行时与首幕预览.md)，当前状态以 [STATUS.md](STATUS.md) 为准。

在仓库根目录激活 `.venv` 后，可运行知识层测试和契约校验：

```bash
PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
.venv/bin/python contracts/validate_contracts.py
```

当前开发分支的 API、脚本与工作流离线检查：

```bash
PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/api backend/tests/script backend/tests/integration -q
```

本地启动任务 API 和 React 创作页（分别在两个终端运行）：

```bash
PYTHONPATH=backend/src .venv/bin/python -m uvicorn api.app:app --host 127.0.0.1 --port 8000
cd frontend && npm run dev
```

API 端点、状态语义和本地安全边界见 [API 对接文档](docs/work/contracts/API.md)。

知识层本地检验页在仓库根目录 `.env` 配有密钥时默认使用 Real API，并要求确认本次在线生成可能产生调用费用；没有密钥时只提供明确标注的固定主题离线示例。页面打开不会自动调用模型。开发者诊断可手动切换 Mock 与 Real API。密钥由 `python-dotenv` 自动加载，不提交到版本控制：

```bash
PYTHONPATH=backend/src STREAMLIT_SERVER_ADDRESS=127.0.0.1 STREAMLIT_SERVER_PORT=8501 .venv/bin/python -m streamlit run backend/src/knowledge/devtools/review_app.py
```

`main` 上的知识层已有 83 项测试通过；契约校验覆盖五类 Schema、连贯样例、负例、旧版本兼容和非推荐方向切换。四份历史 ProductionScript 也通过新版 Schema 校验。既有真实 API 验收覆盖基础定义、进阶自注意力机制和带 `focus` / `must_include` 的骰子概率主题。本次跨层消费 Smoke 使用已发布知识包和固定 ProjectState / ProductionScript Mock，不调用 API；它检查版本引用、方向、时间轴及锚点事件映射。PR #9 的首轮视觉重构通过了生产构建、7 项逻辑测试和 11 项 Chromium 浏览器测试。青绿流场与创作页装饰分支通过生产构建、10 项逻辑测试和 15 项 Chromium 浏览器测试，并检查了五种屏宽、关键姿态及实际开场录屏。

此前脚本测试 10 项、工作流集成测试 3 项、知识层 83 项、契约校验、前端生产构建和 10 项前端单测均通过。本次交接补全另运行 API、脚本和工作流测试共 21 项、契约校验、前端生产构建、10 项前端单测及 20 项 Playwright E2E，均通过；Uvicorn 本地健康检查返回 `{"status":"ok"}`。Playwright 本机需通过 `LD_LIBRARY_PATH` 提供 Chromium 系统库。真实模型脚本验收尚未执行。

## 目录与文档入口

| 路径 | 当前作用 |
| --- | --- |
| `AGENTS.md` | Agent 接手、授权、修改与交付约定 |
| `STATUS.md` | 当前状态、负责人、阻塞及下次集成 |
| `backend/src/knowledge/`、`backend/src/script/` | 知识层和脚本层；当前分支已有脚本生成与正式版本发布 |
| `backend/src/workflow/` | ProjectState 版本存储、知识包到脚本编排、Manifest 候选和修订请求的校验接收 |
| `backend/src/api/` | 本地任务 API：项目、任务、产物、方向、动画交接、预览状态和修订请求 |
| `frontend/src/features/`、`frontend/src/animation/` | 创作流程、隔离视频舞台、多场景运行时与真实工作台 |
| `frontend/src/features/revision/editor-layout.html` | 真实时间轴工作台，与产品入口共用 Adapter 和 Player |
| `backend/src/animation/`、`frontend/scripts/render-video.mjs` | 受控场景生成、不可覆盖发布、局部修订与逐帧编码 |
| `contracts/schemas/` | **唯一机器可读契约**（五类 JSON Schema） |
| `contracts/examples/` | Mock 联调样例 |
| `contracts/validate_contracts.py` | Schema 与跨对象一致性校验 |
| `contracts/接口契约与协作规范.md` | 跨阶段接口、权限、修订语义的权威说明 |
| `docs/work/contracts/API.md` | 对接入口、已实现端点与状态语义 |
| `docs/work/architecture.md` | 当前系统边界和数据流 |
| `docs/work/design-principles.md` | 稳定的产品与设计原则 |
| `docs/work/design/产品理念与工作流共识.md` | 较完整的产品体验与流程共识 |
| `docs/work/backend/knowledge/知识层探索与创意策划.md` | 知识层内部研究、创意、核验与交付共识 |
| `docs/work/backend/知识层技术栈路线.md` | 知识层技术选型、虚拟环境、依赖与本地配置 |
| `docs/work/engineering.md`、`docs/work/workflow.md` | 实现规则与日常开发验证 |
| `docs/work/documentation.md`、`docs/work/git-collaboration.md` | 文档维护及双人 Git 协作 |
| `docs/tasks/open/`、`docs/tasks/closed/` | 待执行与已确认完成的任务 |
| `docs/playbooks/` | 按需使用的操作手册 |

知识层实现和本地开发环境见技术栈路线；当前 API 仅供本机开发使用，不是公开部署或多用户服务。
