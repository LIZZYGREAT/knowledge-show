# main 跨层契约修订与分支整合执行方案

> **任务类型**：跨层接口修复 / 脚本文件整合 / 最小联调 / Git 集成  
> **审查日期**：2026-11-14  
> **仓库**：`LIZZYGREAT/knowledge-show`  
> **审查基线**：`main@5e351e0c28f21ef57c355b38d6fafff057153add`  
> **待整合分支**：`feat/script-prompt@b0826da9ef85e42792c8a0a015aed3678632dd15`  
> **建议存放路径**：`docs/tasks/open/backend/main跨层契约修订与分支整合执行方案.md`  
> **任务状态**：待执行；本文是给 Codex 和双方负责人使用的实施方案，不代表修改、测试或合并已经完成。

## 一、目标与当前事实

本轮目标是让已经合并进 `main` 的**知识层**与队友已有的**脚本试验成果**按同一套契约对接，补齐必要的共享语义、文件整合、测试和项目状态记录，为随后接入动画层提供可用输入。

**本轮明确排除动画视觉效果问题**：不审查或重做 PN 结等试片的视觉语言、对象呈现、动画审美及组件设计；不实现动画渲染器或产品正式前端。不要借本任务重构 Research、Creative、Verifier、ResearchStore 或增加额外 Agent。

已从仓库确认：

- PR #4（`docs/first-video-attempt`）和 PR #5（`feat/knowledge-16x9-closeout`）**已合并进 main**，无需重复合并。
- `backend/src/knowledge/` 已有可运行的完整知识层业务代码；`brief.effective.aspect_ratio` 默认 **16:9**，正式入口对其他比例进行计费前拒绝。
- 知识层按 `${KNOWLEDGE_EXPORT_DIR}/{artifact_id}-r{revision}.json` 发布经过校验的版本文件；脚本层应读取指定的 `artifact_id + revision`，不接触 SQLite。
- `docs/work/backend/script/trials/` 已有四组历史 `ProjectState`、`KnowledgePackage` 和 `ProductionScript` 样例；这些**9:16 历史试验原样保留**，不能当作当前 16:9 成片制作输入。
- 当前 `main` 的 `backend/src/script/` 仍是骨架，**没有可复用的脚本生成执行器**；`frontend/src/animation/` 和 `backend/src/workflow/` 也未形成正式业务链路。
- 队友的 `feat/script-prompt` 相对当前 `main` **落后 41 个提交、超前 2 个提交，实际仅新增 `backend/src/script/prompts/script_writer.md`**。整分支 Merge/Rebase 没有收益，容易引入无关冲突。
- 该 v0.3 提示词和历史试点都使用 `events[].anchor: true`，但 `contracts/schemas/production-script.schema.json` 当前事件对象设置 `additionalProperties: false`，**未定义 `anchor`**，存在真实契约冲突。
- `README.md`、`STATUS.md`、`docs/work/architecture.md` 仍把已合并的知识层描述为“位于独立分支、尚未合并”，当前事实已变化。

## 二、工作范围与负责人

| 工作项 | 主要文件 | 建议负责人 | 本轮交付边界 |
| --- | --- | --- | --- |
| A. `anchor` 正式契约 | `contracts/schemas/production-script.schema.json`、`contracts/接口契约与协作规范.md`、`contracts/validate_contracts.py`、相关测试 | 双方确认后由集成人执行 | 使现有脚本事件语义可以正式交付 |
| B. v0.3 提示词引入 | `backend/src/script/prompts/script_writer.md` | 脚本层负责人确认，集成人可做文件引入 | **只引入明确需要的文件**，不整分支合并 |
| C. 脚本最小消费入口 | `backend/src/script/`、`backend/tests/script/` | **队友／脚本层负责人** | 读取明确的知识包版本与已选方向，产出可校验脚本；不得越界替其做大架构 |
| D. 16:9 最小跨层联调 | `backend/tests/integration/` 或一份轻量可重复的本地检查脚本 | 双方配合 | 验证 JSON 交接和脚本引用；动画侧待具备运行时后另做播放验收 |
| E. 项目状态同步 | `README.md`、`STATUS.md`、`docs/work/architecture.md` | 集成人 | 记录“合并完成”与“端到端尚未完成”的区别 |

`contracts/` 是双方共用接口。实施 A 前应将 `anchor` 的可选类型、时间语义与对方确认；其他跨模块共享字段一律不得自行扩写。

## 三、修改 A：将事件时间锚点纳入正式契约（P0）

### 1. 具体修改

在 `contracts/schemas/production-script.schema.json` 的 `scenes[].events[].properties` 中，仅新增一个**可选**字段：

```json
"anchor": { "type": "boolean" }
```

放在事件字段的 `properties` 中，**不加入 `required`**，继续保留 `additionalProperties: false`。

明确含义：

- `anchor=true`：该事件的关键呈现时刻需要与脚本计划时间精确对齐，绝对时刻为 `scene.start_ms + event.offset_ms`。
- `anchor` 缺失或为 `false`：按普通事件处理，动画可在所属场景内做合理时间调整；**不改变**场景的固定开始时间和时长。
- `anchor` 标记的是该事件的**关键发生时刻**，不要求整个事件持续时间固定。若具体动作内部含多个时间点，脚本应指出哪个是需要命中的关键动作；本轮不扩展多锚点子事件 Schema。
- 只为真正需要精确同步的揭示/对比事件使用，**不机械要求每场或每条视频必须包含锚点**。

在 `contracts/接口契约与协作规范.md` 的 ProductionScript `events[]` 描述位置加入以上约定，同时说明：当前 `AnimationManifest` 仅记录片段与脚本事件关联，**无法单靠 Schema 证明实际渲染帧命中锚点**；这一项留给动画运行时的播放/时间轴测试验证。本轮不为了锚点额外增加时间轴引擎或复杂约束。

### 2. 校验与回归

在现有 `contracts/validate_contracts.py` 或对应的轻量单测中增加：

1. 事件携带 `anchor: true` → 通过 Schema。
2. 事件不带 `anchor` → 原契约仍通过。
3. 事件携带 `anchor: "true"`（字符串）或非法类型 → 被 Schema 拒绝。
4. 原有跨阶段 Mock、知识引用、时间连续覆盖和负向用例继续通过。
5. 对 `docs/work/backend/script/trials/` 下四份历史 ProductionScript 单独执行新版 **ProductionScript Schema** 校验，确认 `anchor` 冲突消除；如还发现其他实际字段冲突，单独记录，不以删字段伪造通过。

历史脚本标注的 `9:16`、其内容、事件和锚点不得批量改写；不要把它们作为 16:9 新视频的测试用 Brief。

## 四、修改 B：定向整合队友脚本提示词 v0.3（P0）

### 1. 只取需要的文件

建议从当前 `main` 新建集成任务分支，定向引入文件，而不是 `git merge origin/feat/script-prompt`：

```bash
git status --short
git fetch origin main feat/script-prompt
git switch main
git pull --ff-only origin main
git switch -c fix/cross-layer-script-handoff

git restore --source=origin/feat/script-prompt -- backend/src/script/prompts/script_writer.md
git status --short
git diff --stat
```

**前提**：工作树干净、队友同意在本任务使用其 v0.3 提示词；如果已有未提交内容，先确认归属和保存，不使用 `reset --hard`、`clean -fd`。若该提示词分支有更新，以最新提交重新核实 Diff，避免覆盖队友之后的改动。

### 2. 与正式契约对齐

引入后检查 `script_writer.md`：

- 使用 `ProjectState`、`KnowledgePackage` 中的**真实字段**；`knowledge_package_ref` 使用发布后的 `artifact_id`、`revision`，不从文件名自行推测版本。
- `direction_id`：优先 `ProjectState.decisions.direction_id`，无明确决策时采用 `recommended_direction_id`。
- `anchor` 与修改 A 一致；不要在 JSON Schema 不允许时要求模型输出该字段。允许只有确有关键节点时才设置锚点。
- `scenes[].knowledge_refs`、事件级引用、用户明确要求、知识单元 `conditions` 和事实约束仍按既有契约处理；`importance=core` 是选材提示，不是逐条出镜的硬要求。
- 原提示词的**首现身份指认、文字与画面分工、关键节点节拍等已被队友确认的原则**，不因本次合并而任意改写。若需改提示词内容，优先由脚本层负责人确认并实施。
- 首版 `brief.effective.aspect_ratio` 默认为 **16:9**，提示词只读取该配置；不得继承历史脚本中的 9:16 画面描述。

这里的交付含义是：**脚本层有了可复用的提示词源文件**。仅复制这份 Markdown 并不等于“已经实现脚本 Agent”；不可在 `STATUS.md` 中混淆这两件事。

## 五、修改 C：最小脚本输入与版本交接（P0，队友负责）

如果队友尚未实现脚本生成执行入口，本轮联调至少需要一条简单路径：

```text
ProjectState（16:9）
    + 已发布 KnowledgePackage ArtifactRef
    + 已选 direction_id
          ↓
在共享导出目录读取对应 {artifact_id}-r{revision}.json
          ↓
脚本层按当前提示词生成 ProductionScript
          ↓
JSON Schema / 引用 / 场景时间检查
          ↓
可交给动画层的 ProductionScript JSON
```

建议由队友自行实现 `backend/src/script/` 中一个最小入口；具体函数名由队友决定，**本方案不预设尚不存在的 API、CLI 命令、HTTP 路径或状态服务**。

这个入口只需保证：

1. 知识包来自已发布的版本化 JSON；路径由共享导出目录配置 + 精确 ArtifactRef 定位，脚本层**不直接访问 SQLite**。
2. `ProductionScript.knowledge_package_ref` 与读入文件的版本完全一致；版本变化不自动跟随“最新”。
3. 所选方向来自项目决策，必要时回退推荐方向；`ProductionScript.direction_id` 和实际选材一致。
4. 生成的知识引用只使用已核验知识；注意原知识包的 `conditions` 与真正非空的 `required_knowledge_refs`。默认空数组不得被解释成“必须讲完全部核心知识”。
5. 任何结构错误或版本不一致先在研发侧给出清楚诊断；普通用户界面仅收到自然、可理解的成功或失败状态。
6. 不为了这项任务建设独立脚本服务、消息队列或复杂调度框架。

如果脚本层生成器尚在开发，**集成人可以先用固定的合法 ProductionScript 做无 API 成本的消费端 Mock**，但必须标记“Mock 契约联调”，不能声称真实模型脚本生成已经打通。

## 六、修改 D：16:9 最小纵向联调（P0）

联调分两个阶段，以防等待动画运行时造成不必要的阻塞：

### 阶段一：不依赖动画运行时的契约与交接 Smoke

- 用 `contracts/examples/project-state.example.json` 或 `build_brief()` 构造 **16:9** 当前正式输入。若采用本地固定样例，明确它是 Mock，不调用 DeepSeek。
- 使用一个已发布的知识包 JSON，验证 `artifact_id`、`revision` 与 `ProjectState.artifacts.knowledge_package` 一致；尚无完整协调器时，可以由一个本地试验脚本明确传入该引用，**不要假装共享工作流已经存在**。
- 将该知识包交给脚本层，使用确定的方向生成或加载一份 ProductionScript；检验 Schema、时间轴与知识引用。
- 补一次**非推荐方向**选择的契约检查，确认不会把推荐方向专有知识误认为全局 required。
- 验证 `anchor=true` 在脚本 JSON 中可读且语义清楚，动画消费端能够获取 `scene_id`、事件 ID 与绝对锚点时间。
- 输出简短的测试记录：输入、产物引用、方向、检查结果、是否调用真实模型。

### 阶段二：已有动画运行时后进行的最小播放交接

- 由动画负责人使用一条新的 16:9 ProductionScript 制作最小可播放片段，核对实际播放时长、场景边界、锚点时刻和资源引用。
- 生成对应 `AnimationManifest` 并验证脚本版本引用与片段的时间覆盖关系。
- 如果动画代码尚未在仓库中，明确记录为**待对接**，不为了让测试“变绿”而创建假冒的播放结果。
- 此阶段**只验证数据与时间对接**，不涉及试片视觉效果修订。

> 注意：`contracts/validate_contracts.py` 验证的是现有契约样例及引用不变量，并不自动检验 `docs/work/backend/script/trials/` 的所有历史脚本，也不代替动画实际播放验收。

## 七、修改 E：修复 main 已合并但文档滞后的描述（P1）

**文件**：`README.md`、`STATUS.md`、`docs/work/architecture.md`，必要时更新 `docs/work/logs/CHANGELOG.md`。

只改实际状态，不重写产品理念：

- 将知识层“尚在独立分支/尚未合并”改成“**已进入 main**”。
- 将知识层已实现与尚未实现的边界分开：`Research/Creative/Verifier/SQLite/Streamlit/JSON 导出` 已有正式代码；完整 `script/workflow/api/animation` 业务仍未接通。
- 将 PR #4 的试点文件与正式脚本生成器区别开，明确历史 9:16 试验保留而首版正式产物 16:9。
- 当前测试计数不得机械照抄旧分支的 79/83 项；以**本次实际运行**的结果更新状态。
- 任务完成并经负责人确认后，再将本任务文件从 `docs/tasks/open/` 移到 `docs/tasks/closed/`；不要在已关闭任务正文里追加新的执行日志。

旧的 `docs/work/backend/script/trials/`、旧实验数据、历史 Commit、知识包 revision、原图片/视频实验说明不改。

## 八、Git 集成与合并步骤

### 1. 准备与差异审查

```bash
git fetch origin
git status --short
git branch --show-current
git log --oneline -5 origin/main

git diff --stat origin/main...origin/feat/script-prompt
```

**预期**：脚本提示词分支相对当前 main 主要只新增 `backend/src/script/prompts/script_writer.md`；若差异与本文不符，先核对新的分支状态，再决定引入范围。

### 2. 在任务分支分步落地并提交

建议按两个可独立检查的增量 Commit：

```text
Commit 1：fix(contracts): support optional script event anchors
    - Schema + 契约语义 + 校验 / 测试

Commit 2：chore(integration): import script prompt and align main status
    - 定向引入 v0.3 提示词 + 文档 + 必要的联调 Mock
```

若队友继续实现脚本生成器，建议**由其独立 PR**交付，避免双方同时修改 `backend/src/script/`。在自己的工作树中无需等待对方修改动画代码才能完成第一轮提交。

### 3. 合并前同步 main、验证和检查 Diff

```bash
git fetch origin
git merge origin/main

git diff --check
git status --short
git diff --stat origin/main...HEAD

PYTHONPATH=backend/src .venv/bin/python -m pytest backend/tests/knowledge -q
.venv/bin/python contracts/validate_contracts.py
```

如果已新增脚本层或集成测试，再运行对应的真实测试命令；不能假设这些尚未实现的测试当前存在。执行后记录实际通过数、失败项及是否使用外部 API。

**重点复核**：

- 只引入 v0.3 所需文件，没有把旧分支的 README/契约等回退到历史状态。
- Schema 对 `anchor` 可选布尔值开放，对其他未知字段仍拒绝。
- 现有示例和旧历史 trials 数据没有被改写成新 16:9 版本。
- 版本化 KnowledgePackage 导出、`internal_review`、`required_knowledge_refs` 和 16:9 默认值没有回归。
- 新脚本若生成成功，保留精确上游知识包引用，并且 `direction_id` 与实际选择一致。

### 4. PR 审查与落 main

1. 推送任务分支并建立 PR，标题可使用：`fix: align script anchor contract and cross-layer handoff`。
2. PR 描述只写：新增/修改文件、共享字段影响、脚本层接入方式、实际测试结果、尚未完成的动画/工作流部分。
3. `contracts/` 的修改需脚本层负责人确认；发生冲突时逐文件检查，**不得覆盖队友的脚本/动画成果**。
4. 双方确认后再由人执行 Squash/Merge 或通过 GitHub PR 合并；Agent 不擅自合并 main、强推或清理他人分支。
5. 合并后从最新 main 重新检查相关路径和契约，通知队友使用已发布的新 `anchor` 语义和新的正式脚本输入；关闭已确认完成的任务。

> PR #4、#5 已经在 main；**不要重复合并这些分支**。`feat/script-prompt` 因大幅落后而仅定向取文件，随后即可由队友自行决定是否归档旧分支。

## 九、验收表与收尾标准

| 验收项 | 预期结果 | 验收方式 |
| --- | --- | --- |
| 正式 Schema 接受锚点 | `anchor: true/false` 可选且类型正确 | Schema 正负用例 |
| 脚本提示词 v0.3 进入 main | 指定路径存在，内容来源可追溯 | Git Diff / 文件检查 |
| 当前示例契约不回归 | 五类 Schema、连贯 Mock 与原有负向用例通过 | `contracts/validate_contracts.py` |
| 历史脚本可做字段校验 | 试点脚本的 `anchor` 不再被拒绝 | 独立 Schema 验证；不修改历史 9:16 文件 |
| 知识层不回归 | 现有知识层测试通过 | `pytest backend/tests/knowledge` |
| 16:9 新输入可交接 | 当前 Brief、知识包引用、方向与新脚本一致 | 无 API 成本 Smoke / 有条件的一次真实生成 |
| 非推荐方向可用 | 无推荐方向的额外强制知识冲突 | Mock 联调 |
| 动画交接状态如实描述 | 运行时未实现则明确待接；实现后再做真实播放验证 | 状态记录 / 后续样片验收 |
| main 文档准确 | 不再声称知识层尚未合并，也不宣称完整视频系统已实现 | README / STATUS / architecture Diff |
| 合并范围受控 | PR 只含本任务文件，双方确认共享契约 | PR 审核 |

**最终建议**：先完成 `anchor` 契约和 v0.3 提示词定向整合，立刻进行一次不花 API 费用的跨层 Mock 验证；脚本层生成器和动画运行时分别按负责人现有进度接入。到这里优先推进能实际运行的产品链路，避免继续围绕知识层审查机制、额外搜索或新框架增加成本。
