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

- 暖白、墨绿视觉 Token；首页以青绿丝绸般的回卷流带为主体，同一参数曲面驱动生长、收尖、褶皱、高光、细纹和流动微粒。`flowGeometry` 在紧弯处限制带宽，避免纹理翻折裂口；移动端减少曲面采样和微粒。`useFlowMotion` 控制开场、持续等待与失焦/离屏暂停，减少动效时直接显示完整静态姿态。
- 创作页使用独立的 `EditorialOrnament` 装饰组件：标题两侧枝叶、宽幅波纹分隔、主题区尾纹、模式花边与展开偏好的收尾。装饰随布局流动、不接收指针事件；主题聚焦时金线轻微展开，手机隐藏边角并保留短波纹和小芽。
- 暖金凝结点以唯一 `idea-seed` 身份在首页与主题输入旁共享；View Transition 不可用或减少动效时仍可直接进入表单，品牌顶栏独立保留。
- 品牌独立使用 Georgia / Times New Roman 字族和统一基线；中文标题保留本机展示字体回退，不分发字体。首页容器最大 1500px，创作页 1380px；高级偏好采用“深度 / 单行美术偏好、整行创意、并排包含 / 避开”栅格，手机自然单列。
- 主题示例、独立细化方向、六种讲述方式、自定义说明、更多偏好、轻量确认、返回保留输入。
- `toUserInput` 生成符合现行 `ProjectState.brief.user_input` 的字段，空选填项省略，希望包含/避开按行拆分并去重。`auto` 保留给协调器解析，不在前端伪造 `effective`；约定的生产默认值为 16:9、165000ms。
- 原生 dialog 设置抽屉，焦点约束、Escape 关闭与焦点恢复；连接测试是用户显式触发的一次真实请求。密钥默认遮掩，仅组件/Context 内存保存，无浏览器持久化、URL、日志或自动请求。
- 正式创作提交 `user_input` 创建 ProjectState，再启动知识→脚本任务。页面通过本地 `/api` 代理轮询任务并读取精确 ProductionScript；刷新后在当前浏览器标签会话恢复 project/job 标识，API Key 不持久化。
- ProductionScript 发布后展示脚本主旨、场景数和时长，并明确“等待动画制作”。没有正式且可播放的 AnimationManifest 时不开放视频预览或工作台。
- 明确标识的流程演示，手动推进可复现事件，最多四条事件气泡，失败停止动效、可重试、返回保留输入。演示不会调用 API、生成文件或开放工作台。

## 尚待动画层接入

本地后端启动方式及实际端点见 [API 对接登记](../docs/work/contracts/API.md)。当前前端没有持久保存密钥；模型连接与生成只会在明确提交后发生。后台诊断、异常栈和模型原始消息不会直接显示给普通用户。

当前没有通用 AnimationManifest 播放适配器、多场景预览、工作台修订 UI 或视频导出。后端的动画交接接口会返回当前精确 ProductionScript；动画资源尚未就绪时，普通页面保持等待状态，不把品牌场景或固定 PN P0 样例当作当前项目的成片。修订请求接口只接收并保存 Schema-valid 请求，不表示已经执行修改。

当前已通过 `npm run build`、`npm test`（10 项）及 Playwright E2E（20 项 Chromium）。浏览器回归覆盖响应式布局、表单保留、流程演示、真实任务的 API Mock、刷新恢复、密钥不落盘、等待动画状态，以及动画 P0 Seek、对象身份、暂停和样式隔离。E2E 在本机需为 Chromium 配置系统库；其他环境按 Playwright 的运行库要求准备。

开发服务器可使用 `/?flow-pose=0.0909`、`/?flow-pose=0.5455`、`/?flow-pose=1` 固定检查初始、高光和完整姿态；参数仅在 Vite 开发模式生效，值为 0–1，正式构建忽略此参数。正常入口不带参数，连续播放完整动画。

当前 WSL 环境缺少浏览器系统库，验证时将 libnspr4、libnss3、libasound2 与中文字体解包到 `/tmp` 并通过 `LD_LIBRARY_PATH` / `FONTCONFIG_FILE` 使用；这些属于本机测试环境，不进入项目依赖或产物。其他环境按 Playwright 的运行库要求准备。

目前浏览器自动检查覆盖 Chromium；Windows 本机中文字体、Safari 及真实移动设备仍需人工验收。

## 动画 P0 独立预览

启动 Vite 后访问 `/animation-preview.html`，可播放 PN v2 固定脚本的 S01（0–15s）、拖动时间并检查对象边界。视频美术在 Shadow DOM 中独立渲染；此入口仅为研发试作。实现范围、稳定 ID、Seek 取消和 P1 接口见 [运行时与首幕预览](../docs/work/frontend/animation/运行时与首幕预览.md)。工作台接入与成片导出尚未实现。
