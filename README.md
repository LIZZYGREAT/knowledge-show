# knowledge-show

> 面向普通创作者的 AI 知识短视频制作项目。当前 `main` 仍以基础骨架和接口契约为主；知识层首版、体验修订和联调前最小修订分别位于 `feat/knowledge-layer-implementation`、`feat/knowledge-cost-efficiency-ux`、`feat/knowledge-handoff-readiness`，尚未集成脚本、动画和共享工作流。

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

仓库已包含五类 **跨阶段数据契约**、连贯 Mock 示例及校验脚本。知识层工作分支可运行完整研究、创意、核验与知识包交付，也提供本地检验页；脚本层、动画预览、跨层工作流和视频导出仍未集成。以 [STATUS.md](STATUS.md) 为准。

在仓库根目录激活 `.venv` 后，可运行知识层测试和契约校验：

```bash
PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
.venv/bin/python contracts/validate_contracts.py
```

知识层本地检验页在仓库根目录 `.env` 配有密钥时默认使用 Real API，并要求确认本次在线生成可能产生调用费用；没有密钥时只提供明确标注的固定主题离线示例。页面打开不会自动调用模型。开发者诊断可手动切换 Mock 与 Real API。密钥由 `python-dotenv` 自动加载，不提交到版本控制：

```bash
PYTHONPATH=backend/src STREAMLIT_SERVER_ADDRESS=127.0.0.1 STREAMLIT_SERVER_PORT=8501 .venv/bin/python -m streamlit run backend/src/knowledge/devtools/review_app.py
```

联调前修订分支的 79 项知识层测试和契约校验已通过；真实 API 验收覆盖基础定义、进阶自注意力机制和带 `focus` / `must_include` 的骰子概率主题。脚本、动画、工作流协调器、全链路应用启动和视频导出尚未实现。

## 目录与文档入口

| 路径 | 当前作用 |
| --- | --- |
| `AGENTS.md` | Agent 接手、授权、修改与交付约定 |
| `STATUS.md` | 当前状态、负责人、阻塞及下次集成 |
| `backend/src/knowledge/`、`backend/src/script/` | 知识和脚本的独立开发工作区 |
| `backend/src/workflow/`、`backend/src/api/` | 待实现的共享编排与对接入口 |
| `frontend/src/features/`、`frontend/src/animation/` | 用户流程与动画实现工作区 |
| `contracts/schemas/` | **唯一机器可读契约**（五类 JSON Schema） |
| `contracts/examples/` | Mock 联调样例 |
| `contracts/validate_contracts.py` | Schema 与跨对象一致性校验 |
| `contracts/接口契约与协作规范.md` | 跨阶段接口、权限、修订语义的权威说明 |
| `docs/work/contracts/API.md` | 对接入口与传输 API 的登记处（当前未锁定 HTTP 端点） |
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
