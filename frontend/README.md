# knowledge.show 前端

独立的 React + TypeScript + Vite 创作界面。当前产品与表单原则见 `docs/tasks/open/frontend/前端视觉与交互设计.md`；首页动态视觉与创作页装饰改版按 `前端视觉重新确立方向设计方案.md` 执行。运行于本地，无需启动 Streamlit。

```bash
cd frontend
npm ci
npm run dev
```

打开终端给出的本地地址（默认 `http://127.0.0.1:5173`）。构建产物位于忽略跟踪的 `frontend/dist/`。

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

## 已实现范围

- 暖白、墨绿视觉 Token；首页使用连续变形的青绿流带、内部流线和少量微粒，`LivingFlowScene` 独立渲染并通过 `useFlowMotion` 控制生长、等待与失焦/离屏暂停。创作页以横向波线和局部枝叶点缀表单间隙。
- 暖金凝结点以唯一 `idea-seed` 身份在首页与主题输入旁共享；View Transition 不可用或减少动效时仍可直接进入表单，品牌顶栏独立保留。
- 品牌独立使用 Georgia / Times New Roman 字族和统一基线；中文标题保留本机展示字体回退，不分发字体。首页容器最大 1500px，创作页 1380px；高级偏好采用“深度 / 单行美术偏好、整行创意、并排包含 / 避开”栅格，手机自然单列。
- 主题示例、独立细化方向、六种讲述方式、自定义说明、更多偏好、轻量确认、返回保留输入。
- `toUserInput` 生成符合现行 `ProjectState.brief.user_input` 的字段，空选填项省略，希望包含/避开按行拆分并去重。`auto` 保留给协调器解析，不在前端伪造 `effective`；约定的生产默认值为 16:9、165000ms。
- 原生 dialog 设置抽屉，焦点约束、Escape 关闭与焦点恢复；密钥默认遮掩，仅组件/Context 内存保存，无浏览器持久化、URL、日志或自动请求。
- 明确标识的流程演示，手动推进可复现事件，最多四条事件气泡，失败停止动效、可重试、返回保留输入。演示不会调用 API、生成文件或开放工作台。
- 知识层 `on_event` 的前端映射（`phase` / `event_type`），仅 `delivery.completed` 对应知识包发布；未知事件忽略，后台原始 summary/error 不直接呈现。脚本和动画采用局部 UI 演示事件，不作为公共消息契约。

## 待接入依赖

当前仓库无统一任务 API、脚本/动画事件流及可加载预览。本次不改共享 Schema 或后端模块，不创建未经协商的 HTTP 路径。

设置抽屉为本地连接服务预留 `testConnection(key, signal)` 注入点；应用尚未提供该实现，因此连接测试会明确报告未接入，不能标为成功。未来实现必须遵守取消/超时、最小测试请求、不记录密钥与响应错误脱敏的要求。连接成功仅应用于后续请求；生产任务须捕获开始时的凭证快照。

真实生成需协调器接收 `toUserInput`、补全 `brief.effective`、发布精确产物引用并提供事件订阅/重试。前端没有定时伪造完成的生产路径。动画阶段的普通完成事件被状态逻辑拒绝；工作台交接仍需先校验已发布 `AnimationManifest`、解析 `preview_ref`、确认实际媒体能加载，再携带 project_id 和精确 ArtifactRef 进入工作台。当前没有视频导出或编辑器，不将品牌场景当作视频预览。

既有表单、设置抽屉、`toUserInput` 映射与流程演示的回归记录来自前端基础改版。本次有机流场改版的构建、关键姿态、响应式截图与页面交互尚待当前任务分支完成后重新验收；旧的纸艺专用选择器也需要更新到新的视觉语义。

当前 WSL 环境缺少浏览器系统库，验证时将 libnspr4、libnss3、libasound2 与中文字体解包到 `/tmp` 并通过 `LD_LIBRARY_PATH` / `FONTCONFIG_FILE` 使用；这些属于本机测试环境，不进入项目依赖或产物。其他环境按 Playwright 的运行库要求准备。

目前浏览器自动检查覆盖 Chromium；Windows 本机中文字体、Safari 及真实移动设备仍需人工验收。
