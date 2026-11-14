# knowledge.show 前端

独立的 React + TypeScript + Vite 创作界面。当前产品与表单原则见 `docs/tasks/open/frontend/前端视觉与交互设计.md`；首页知识剧场按 `../docs/tasks/open/frontend/首页知识剧场动画设计与实施方案.md` 实现；创作页保留既有装饰与表单。运行于本地，无需启动 Streamlit。

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

- 暖白、墨绿视觉 Token；首页 `CuriosityStage` 保留青绿流体开场，流体收拢后通过柔和的不规则墨晕揭开纸艺骰子演示，再展开 36 个有序组合、六组和为 7 的高亮和数量分布，最后收回流体。14.5 秒循环共用 `useFlowMotion` 时间源；不包含波纹、旋转螺旋或后加的三维骰子版本。失焦、离屏或页面隐藏时暂停，减少动画直接展示结论。旧 `FlowArtwork` 仅在可见转场中绘制，旧 `LivingFlowScene` 保留；首页演示不连接生产层或外部 API。
- 创作页使用独立的 `EditorialOrnament` 装饰组件：标题两侧枝叶、宽幅波纹分隔、主题区尾纹、模式花边与展开偏好的收尾。装饰随布局流动、不接收指针事件；主题聚焦时金线轻微展开，手机隐藏边角并保留短波纹和小芽。
- 暖金凝结点以唯一 `idea-seed` 身份在首页与主题输入旁共享；View Transition 不可用或减少动效时仍可直接进入表单，品牌顶栏独立保留。
- 品牌独立使用 Georgia / Times New Roman 字族和统一基线；中文标题保留本机展示字体回退，不分发字体。首页容器最大 1500px，创作页 1380px；高级偏好采用“深度 / 单行美术偏好、整行创意、并排包含 / 避开”栅格，手机自然单列。
- 主题示例、独立细化方向、六种讲述方式、自定义说明、更多偏好、轻量确认、返回保留输入。
- `toUserInput` 生成符合现行 `ProjectState.brief.user_input` 的字段，空选填项省略，希望包含/避开按行拆分并去重。`auto` 保留给协调器解析，不在前端伪造 `effective`；约定的生产默认值为 16:9、165000ms。
- 原生 dialog 设置抽屉，焦点约束、Escape 关闭与焦点恢复；连接测试是用户显式触发的一次真实请求。密钥默认遮掩，仅组件/Context 内存保存，无浏览器持久化、URL、日志或自动请求。
- 正式创作提交 `user_input` 创建 ProjectState，再启动知识→脚本任务。页面通过本地 `/api` 代理轮询任务并读取精确 ProductionScript；刷新后在当前浏览器标签会话恢复 project/job 标识，API Key 不持久化。
- ProductionScript 发布后可显式发起动画制作；刷新会恢复制作状态。只有实际浏览器检查和精确资源加载成功后才开放工作台；Key 仅用于本次模型请求。
- 明确标识的流程演示，手动推进可复现事件，最多四条事件气泡，失败停止动效、可重试、返回保留输入。演示不会调用 API、生成文件或开放工作台。

## 动画制作与工作台

先启动本地后端，方法见 [API 对接登记](../docs/work/contracts/API.md)。正式流程在脚本发布后点击“开始制作动画”，制作完成进入 `/workbench.html?project_id=...`。该入口和独立 HTML 共用一个 Adapter/Player，场景、clip 与对象轨道全部来自当前脚本、Manifest 和资源；支持拖动、缩放、胶囊反馈、当前帧 bbox、局部修改、版本回退与实际 MP4 下载。

无需模型的开发样片：`/workbench.html?demo=pn`。它明确标注固定 PN 样片，不代替用户项目；四种视频风格独立于网页主题。纯视频入口 `/animation-render.html` 同时供工作台 iframe 与导出使用，不带编辑覆盖物。原 `/animation-preview.html` 保留单幕研发检查。

导出需要已构建的 `dist/`、Playwright Chromium、FFmpeg 和 ffprobe。可配置 `ANIMATION_FFMPEG` / `ANIMATION_FFPROBE` 的绝对路径；未安装时返回真实失败，不生成假下载。完整离线验收、运行时约束与实测结果见 [动画运行说明](../docs/work/frontend/animation/运行时与首幕预览.md)。没有配音和音效。

当前验证包括生产构建、概率分布与循环连续性逻辑测试、首页及创作页与真实工作台浏览器回归；具体计数以 STATUS 为准。

开发服务器可使用 `/?stage-pose=0`、`/?stage-pose=0.11`、`/?stage-pose=0.53`、`/?stage-pose=0.68276`、`/?stage-pose=1` 固定检查流体、墨晕衔接、组合、结论与循环边界；参数值为 0–1，仅在 Vite 开发模式生效。正常入口连续播放，正式构建忽略此参数。

当前 WSL 环境缺少浏览器系统库，验证时将 libnspr4、libnss3、libasound2 与中文字体解包到 `/tmp` 并通过 `LD_LIBRARY_PATH` / `FONTCONFIG_FILE` 使用；这些属于本机测试环境，不进入项目依赖或产物。其他环境按 Playwright 的运行库要求准备。

目前浏览器自动检查覆盖 Chromium；Windows 本机中文字体、Safari 及真实移动设备仍需人工验收。
