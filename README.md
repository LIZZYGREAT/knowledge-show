# knowledge-show

> 面向普通创作者的 AI 知识短视频制作项目。`main` 已包含知识层首版（PR #5）、跨层脚本契约（PR #6）、React 创作入口（PR #7）、独立时间轴编辑器原型（PR #8）和前端视觉重构（PR #9）。当前 `feat/non-animation-mainline` 分支已加入脚本生成与工作流后端；HTTP API 和前端真实任务接入仍待完成。动画 P0 预览在独立的 `feat/animation-runtime-workbench` 分支，尚未与本分支集成。

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

仓库已包含五类 **跨阶段数据契约**、连贯 Mock 示例及校验脚本。知识层可运行完整研究、创意、核验与 KnowledgePackage JSON 交付，并提供本地检验页。当前分支的脚本层可调用 DeepSeek Responses API，也支持注入 Fake LLM；脚本发布经过 Schema、跨层引用和时间线校验，并采用不可覆盖的版本文件。工作流可持久化 ProjectState、读取精确知识包版本、登记默认方向并运行至脚本完成。尚无 HTTP API，因此前端创作入口仍是手动流程演示；脚本层尚未进行真实模型验收。独立时间轴编辑器仍使用演示数据。动画分支的 PN 首幕 P0 预览尚未并入当前分支。启动说明见 [前端说明](frontend/README.md)，状态以 [STATUS.md](STATUS.md) 为准。

在仓库根目录激活 `.venv` 后，可运行知识层测试和契约校验：

```bash
PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
.venv/bin/python contracts/validate_contracts.py
```

当前开发分支的脚本与工作流离线检查：

```bash
PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/script backend/tests/integration -q
```

知识层本地检验页在仓库根目录 `.env` 配有密钥时默认使用 Real API，并要求确认本次在线生成可能产生调用费用；没有密钥时只提供明确标注的固定主题离线示例。页面打开不会自动调用模型。开发者诊断可手动切换 Mock 与 Real API。密钥由 `python-dotenv` 自动加载，不提交到版本控制：

```bash
PYTHONPATH=backend/src STREAMLIT_SERVER_ADDRESS=127.0.0.1 STREAMLIT_SERVER_PORT=8501 .venv/bin/python -m streamlit run backend/src/knowledge/devtools/review_app.py
```

`main` 上的知识层已有 83 项测试通过；契约校验覆盖五类 Schema、连贯样例、负例、旧版本兼容和非推荐方向切换。四份历史 ProductionScript 也通过新版 Schema 校验。既有真实 API 验收覆盖基础定义、进阶自注意力机制和带 `focus` / `must_include` 的骰子概率主题。本次跨层消费 Smoke 使用已发布知识包和固定 ProjectState / ProductionScript Mock，不调用 API；它检查版本引用、方向、时间轴及锚点事件映射。PR #9 的首轮视觉重构通过了生产构建、7 项逻辑测试和 11 项 Chromium 浏览器测试。青绿流场与创作页装饰分支通过生产构建、10 项逻辑测试和 15 项 Chromium 浏览器测试，并检查了五种屏宽、关键姿态及实际开场录屏。

`feat/non-animation-mainline` 的脚本测试 10 项、工作流集成测试 3 项通过；知识层 83 项、契约校验、前端生产构建和 10 项前端单测也通过。Playwright E2E 因运行环境缺少 Chromium 所需的 `libnspr4.so` 未能启动浏览器，不能记作通过。

## 目录与文档入口

| 路径 | 当前作用 |
| --- | --- |
| `AGENTS.md` | Agent 接手、授权、修改与交付约定 |
| `STATUS.md` | 当前状态、负责人、阻塞及下次集成 |
| `backend/src/knowledge/`、`backend/src/script/` | 知识层和脚本层；当前分支已有脚本生成与正式版本发布 |
| `backend/src/workflow/` | ProjectState 版本存储与知识包到脚本的最小编排 |
| `backend/src/api/` | HTTP 服务尚未实现 |
| `frontend/src/features/`、`frontend/src/animation/` | 用户流程与动画实现工作区 |
| `frontend/src/features/revision/editor-layout.html` | 独立时间轴 UI 原型，演示数据与真实动画运行时未连接 |
| `contracts/schemas/` | **唯一机器可读契约**（五类 JSON Schema） |
| `contracts/examples/` | Mock 联调样例 |
| `contracts/validate_contracts.py` | Schema 与跨对象一致性校验 |
| `contracts/接口契约与协作规范.md` | 跨阶段接口、权限、修订语义的权威说明 |
| `docs/work/contracts/API.md` | 对接入口与传输 API 的登记处（HTTP 端点尚未实现） |
| `docs/work/architecture.md` | 当前系统边界和数据流 |
| `docs/work/design-principles.md` | 稳定的产品与设计原则 |
| `docs/work/design/产品理念与工作流共识.md` | 较完整的产品体验与流程共识 |
| `docs/work/backend/knowledge/知识层探索与创意策划.md` | 知识层内部研究、创意、核验与交付共识 |
| `docs/work/backend/知识层技术栈路线.md` | 知识层技术选型、虚拟环境、依赖与本地配置 |
| `docs/work/engineering.md`、`docs/work/workflow.md` | 实现规则与日常开发验证 |
| `docs/work/documentation.md`、`docs/work/git-collaboration.md` | 文档维护及双人 Git 协作 |
| `docs/tasks/open/`、`docs/tasks/closed/` | 待执行与已确认完成的任务 |
| `docs/playbooks/` | 按需使用的操作手册 |

知识层实现和本地开发环境见技术栈路线；其余模块的技术栈、服务接口和部署方式尚未确定，不预先写入虚构命令。
