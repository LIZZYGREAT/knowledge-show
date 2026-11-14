# knowledge.show 前端

已合入 `main` 的 React + TypeScript + Vite 创作界面，按 `docs/tasks/open/frontend/前端视觉与交互设计.md` 和 `前端视觉问题审查与重构方案.md` 实现。运行于本地，无需启动 Streamlit。

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

- 暖白、墨绿视觉 Token；纸艺小剧场以同一张纸的展开、折痕抬起和深绿实体移动建立前后空间。`PaperShape` / `paperPose` 独立渲染姿态，`usePaperMotion` 控制一次开场；完成后停止逐帧更新，失焦、离屏或隐藏时暂停，卸载时清理。
- 仅深绿实体以唯一 `idea-seed` 身份在首页与主题输入旁共享，700ms 移动缩放后错峰显示表单；品牌顶栏独立保留。不支持 View Transitions 时直接切换，减少动画模式显示稳定姿态。
- 品牌独立使用 Georgia / Times New Roman 字族和统一基线；中文标题保留本机展示字体回退，不分发字体。首页容器最大 1500px，创作页 1380px；高级偏好采用“深度 / 单行美术偏好、整行创意、并排包含 / 避开”栅格，手机自然单列。
- 主题示例、独立细化方向、六种讲述方式、自定义说明、更多偏好、轻量确认、返回保留输入。
- `toUserInput` 生成符合现行 `ProjectState.brief.user_input` 的字段，空选填项省略，希望包含/避开按行拆分并去重。`auto` 保留给协调器解析，不在前端伪造 `effective`；约定的生产默认值为 16:9、165000ms。
- 原生 dialog 设置抽屉，焦点约束、Escape 关闭与焦点恢复；密钥默认遮掩，仅组件/Context 内存保存，无浏览器持久化、URL、日志或自动请求。
- 明确标识的流程演示，手动推进可复现事件，最多四条事件气泡，失败停止动效、可重试、返回保留输入。演示不会调用 API、生成文件或开放工作台。
- 知识层 `on_event` 的前端映射（`phase` / `event_type`），仅 `delivery.completed` 对应知识包发布；未知事件忽略，后台原始 summary/error 不直接呈现。脚本和动画采用局部 UI 演示事件，不作为公共消息契约。

## 待接入依赖

正式 React 前端尚无统一任务 API、脚本/动画事件流及可加载预览。共享契约提供可选元件索引和渲染元件锚点，但 React 流程尚未消费这些数据，也没有可查询 bbox 的动画运行时。

设置抽屉为本地连接服务预留 `testConnection(key, signal)` 注入点；应用尚未提供该实现，因此连接测试会明确报告未接入，不能标为成功。未来实现必须遵守取消/超时、最小测试请求、不记录密钥与响应错误脱敏的要求。连接成功仅应用于后续请求；生产任务须捕获开始时的凭证快照。

真实生成需协调器接收 `toUserInput`、补全 `brief.effective`、发布精确产物引用并提供事件订阅/重试。前端没有定时伪造完成的生产路径。动画阶段的普通完成事件被状态逻辑拒绝；工作台交接仍需先校验已发布 `AnimationManifest`、解析 `preview_ref`、确认实际媒体能加载，再携带 project_id 和精确 ArtifactRef 进入工作台。当前没有视频导出或产品内编辑器，不将品牌场景当作视频预览。独立时间轴原型见下节。

本次验证通过 `npm run build`、`npm test`（7 项）、`npm run test:e2e`（11 项，含 375/768/1280/1440/1920px、字段保留、实体转场、降级和失焦暂停）和根目录 `.venv/bin/python contracts/validate_contracts.py`。另将 `toUserInput` 的实际输出送入权威 user_input Schema 校验通过。已在连续动画前查看起始 / 展开 / 稳定三张关键姿态；最终对照了 1440、1920 和 375px 的首页与展开偏好的创作页截图，并检查真实开场与转场中间帧，未发现横向溢出或文字与主体遮挡，页面无 JavaScript 运行错误。1920px 创作区有效宽度由约 904px 增至 1268px；孤立半行改为完整三行分组；SVG 内装饰文字与旧螺旋样式已移除。

当前 WSL 环境缺少浏览器系统库，验证时将 libnspr4、libnss3、libasound2 与中文字体解包到 `/tmp` 并通过 `LD_LIBRARY_PATH` / `FONTCONFIG_FILE` 使用；这些属于本机测试环境，不进入项目依赖或产物。其他环境按 Playwright 的运行库要求准备。

目前浏览器自动检查覆盖 Chromium；Windows 本机中文字体、Safari 及真实移动设备仍需人工验收。

## 独立时间轴编辑器原型

仓库还包含一个不属于 React 路由的静态原型，使用硬编码章节和动画轨道演示时间轴外观。它不读取 `ProjectState`、`ProductionScript` 或 `AnimationManifest`，也不生成真实修订请求；轨道位置和胶囊只用于本地 UI 演示，不是跨层元件身份。

```bash
cd frontend/src/features/revision
python3 serve.py
```

打开 `http://127.0.0.1:16339/editor`。页面中的视频由单独检出的 `world-execute-me-lyric-mv` 项目提供，默认目录在仓库根目录下；也可通过 `MV_ROOT` 指定。该目录不在当前仓库中，因此未配置时视频预览不可用。服务默认只绑定 `127.0.0.1`；若开发者明确需要局域网访问，可设置 `EDITOR_HOST=0.0.0.0`，并使用本机局域网地址打开页面。

当前没有动画运行时的 `getElementBounds` 能力，所以本原型不提供真实画面框选。公共契约已定义可选 `selectable_elements` 和 `render_element` 锚点；实际帧寻址、包围盒查询、编辑器高亮和导出隔离仍待动画运行时接入后联调。
