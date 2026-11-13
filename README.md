# knowledge-show

> 面向普通创作者的 AI 知识短视频制作项目。当前仓库处于**基础骨架与接口契约已建立、业务功能尚未集成**的阶段；不要将文档中的目标能力理解为已经实现。

## 项目目标

用户提供知识主题及可选的细化方向、创作模式、知识深度、美术偏好等信息。系统主动探索可靠知识与有吸引力的创意方向，规划具有清晰主线的时间脚本，生成真实可播放的动态视频预览；用户可以针对内容、节奏或动画提出修改，确认后导出视频。

面向一般观众，以时长约 **2 分 30 秒至 3 分钟**的知识短视频为典型产物。重视观看吸引力、明确的知识发现，以及**具有核心视觉对象、稳定视觉重心和自然连续变化的动画表达**。不以讲完一套完整课程为目标，不能用一组文字、公式和静态卡片轮流出现的 PPT 式表现代替真正的知识动画。

主生产链路：**ProjectState → 知识层（KnowledgePackage）→ 脚本层（ProductionScript）→ 动画层（AnimationManifest）→ 预览、修订与导出**。

- **知识层**：知识研究与创意构想相互促进；统一管理研究素材、知识主张和证据，按必要风险核验，交付值得制作的方向及可靠知识。允许模型已有知识、推导和必要的外部检索共同参与研究，不预设知识条目数量，也不提前规定具体分镜。
- **脚本层**：选取可靠素材，围绕核心知识问题设计认知与事件主线，确定时间、事件和画面文字。
- **动画层**：自主设计可持续追踪的视觉对象、知识关系和连续运动，形成可引用片段及实际预览产物。
- **工作流与接口层**：维护项目状态、版本、跨层调用及局部修订路由。用户无需理解内部 Agent 分工或亲自审核知识资料。

具体分工和目录见 [目录结构与分工](docs/work/目录结构与分工.md)，产品理念见 [产品理念与工作流共识](docs/work/design/产品理念与工作流共识.md)，知识层内部工作流见 [知识层探索与创意策划](docs/work/backend/knowledge/知识层探索与创意策划.md)。

## 当前可运行范围

仓库已包含五类 **跨阶段数据契约**、连贯 Mock 示例及校验脚本，但业务模块、完整动画预览和导出功能尚未确认实现。以 [STATUS.md](STATUS.md) 为准。

当前可执行的检查（在仓库根目录）：

```bash
python -m pip install 'jsonschema>=4.18'
python contracts/validate_contracts.py
```

预期通过时输出契约校验 `PASS` 信息。以上是**已有检查命令，不代表已在当前仓库现场重新运行通过**。业务运行、前后端安装与启动命令尚未确定；实现后再更新此处。密钥只存放在非版本控制的本地配置，不提交真实凭据。

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
| `docs/work/engineering.md`、`docs/work/workflow.md` | 实现规则与日常开发验证 |
| `docs/work/documentation.md`、`docs/work/git-collaboration.md` | 文档维护及双人 Git 协作 |
| `docs/tasks/open/`、`docs/tasks/closed/` | 待执行与已确认完成的任务 |
| `docs/playbooks/` | 按需使用的操作手册 |

技术栈、接口地址、运行环境、部署方式尚未确定，不预先写入虚构命令。
