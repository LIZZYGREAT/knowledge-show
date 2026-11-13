# 项目名称

> **用途**：人和 Agent 的项目入口。只写当前项目事实；尚未决定的事项明确标注“待定”。

## 项目概览

- **目标用户与问题**：待选题后填写。
- **最小可用流程（MVP）**：待选题后填写。
- **当前技术栈**：待定。
- **当前稳定版本**：见 [STATUS.md](./STATUS.md)。

## 启动与检查

> 技术栈确定后填写真实、可复现的命令。禁止使用未经执行的示例命令冒充已验证步骤。

- 环境要求：待定。
- 安装依赖：待定。
- 本地启动：待定。
- 最小验证：待定。
- 配置变量：待定；只提交 `.env.example`，不提交真实密钥。

## 目录与文档入口

| 路径 | 用途 |
| --- | --- |
| `AGENTS.md` | Agent 的启动、执行、授权与交付流程 |
| `STATUS.md` | 当前可用能力、进行中的任务、负责人和阻塞 |
| `tasks/open/`、`tasks/closed/` | 待执行与已确认完成的任务方案；只读取当前指定的任务 |
| `tasks/_TEMPLATE.md` | 任务执行与结果对照审查模板 |
| `docs/engineering.md` | 代码实现与质量规范 |
| `docs/workflow.md` | 小步开发、测试验证、Commit 与任务交付流程 |
| `docs/design-principles.md` | 用户维护的核心产品与设计理念 |
| `playbooks/` | 指定操作的 Codex 操作手册（例如页面截图检查），按需使用 |
| `docs/documentation.md` | 文档分层、归属与更新规则 |
| `docs/contracts/API.md` | 当前共享 API 契约或权威契约入口 |
| `docs/CHANGELOG.md` | 已完成的关键成果与重要变化 |
| `docs/architecture.md` | 项目架构设计文档 |

`docs/architecture.md` 及前后端详细文档仅在确有必要时编写；不要为了填满模板而复制源码说明。
