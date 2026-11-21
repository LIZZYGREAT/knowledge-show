# Knowledge.Show(me) 产品宣传片（纯 JS 脚本渲染）

独立于主前端工程的 16:9 产品宣传片项目（全长 **62.5 秒**，原生 **1920×1080** 矢量/Canvas 脚本逐帧渲染 + **Web Audio** 程序化同步配乐），严格遵循 `docs/work/design-principles.md`、`docs/work/design/产品理念与工作流共识.md` 及现有前端视觉体系（暖白 `#f8faf7` / 墨绿 `#122926` / 青绿 `#0f967d` / 暖金 `#f2a94b` / 折光 K 字标）。

## 分幕结构（62.5 秒）

| 时段 | 章节 | 画面与产品理念 |
| --- | --- | --- |
| `00:00 – 00:05` | **好奇火花** | 暗夜知识星群与 8 个好奇问题汇聚成金色火花爆发——「好奇心，是所有好故事的开始」 |
| `00:05 – 00:12` | **告别 PPT** | 传统静态幻灯片被划掉并碎裂成青绿流光，三条有机丝带横扫而出——「让知识，动起来。」 |
| `00:12 – 00:17.5` | **品牌登场** | 丝带螺旋聚合成 `BrandLogo` 折光棱镜 K 字标，浮现 `Knowledge.Show(me)` 并收纳为左上角标 |
| `00:17.5 – 00:25.5` | **01 知识探索** | 只需输入一个问题并选择创作模式，知识星座与用户语义事件气泡自然生长，沉淀可靠知识标签 |
| `00:25.5 – 00:31.5` | **02 脚本编排** | 知识标签飞入时间主线与四幕卡片，画面/文字/事件三轨同步推进，播放头推进并推进到动画舞台 |
| `00:31.5 – 00:45.0` | **03 动画呈现** | 呼应首页剧场的三组直观动态演绎：**骰子概率分布（36 种组合飞入钟形柱图）**、**三棱镜色散波动**、**PN 结正反偏置阀门** |
| `00:45.0 – 00:51.5` | **04 工作台微调** | 呼应真实动画工作台：画布直接框选 `#bar-sum-7` 柱体，输入自然语言意见，仅局部重绘该元件并升级至 `v2` |
| `00:51.5 – 00:55.5` | **05 一键导出** | 点击「导出 MP4」，双环同源渲染进度完成交付，丝带蓄力收束 |
| `00:55.5 – 01:02.5` | **品牌收尾** | 丝带舒展、K 字标与 `Knowledge.Show(me)` 定格、五步链路胶囊依次点亮 |

## 目录结构

```text
promo/
├── index.html          # 独立影院播放器（实时 60fps Canvas + 同步 Web Audio 配乐）
├── render.mjs          # Node + Playwright 无头离线导出脚本（关键帧 / 视频 / WAV 配乐）
├── src/
│   ├── core.js         # 品牌色、缓动、噪声、发光、丝带、逐字动效与 BrandLogo 绘制
│   ├── audio.js        # 120 BPM 确定性 Web Audio 离线合成配乐与音效（与画面逐拍对齐）
│   ├── scenes-intro.js # 共享背景/微尘/丝带 + 好奇火花 / 告别 PPT / 品牌登场
│   ├── scenes-flow.js  # 章节导航 + 01 知识探索 / 02 脚本编排
│   ├── scenes-show.js  # 03 动画呈现（骰子概率 / 棱镜色散 / PN 结阀门）
│   ├── scenes-finish.js# 04 工作台微调 / 05 一键导出 / 品牌收尾 Finale
│   └── main.js         # 确定性渲染入口、交互播放控制与 window.__PROMO__ 导出桥接
└── output/             # 渲染输出目录（关键帧、视频与配乐）
```

## 浏览器实时预览（推荐，自带同步配乐）

在 `promo/` 目录启动任意静态 HTTP 服务即可观看：

```bash
cd promo
python3 -m http.server 8765
```

浏览器打开 `http://127.0.0.1:8765/`：
- 点击画面或按 `Space`：播放 / 暂停（同时播放同步合成配乐）
- 左右方向键：快进 / 后退 2 秒；`M` 静音；`F` 全屏；`R` 重播
- 底部章节按钮可一键跳转任意一幕

## 离线逐帧导出

依赖仓库已安装的 `frontend/node_modules/playwright` 与 FFmpeg：

```bash
# 1. 快速截取全片 16 个关键帧到 output/keyframes/
node render.mjs --keyframes --width 1280 --height 720

# 2. 导出完整视频与同步配乐 soundtrack.wav
node render.mjs --fps 30 --width 1280 --height 720

# 3. 导出全高清 1080p（若系统安装完整 ffmpeg，自动封装 H.264 + AAC 的 .mp4）
node render.mjs --fps 30 --width 1920 --height 1080
```

> 若系统安装了完整 `ffmpeg`（含 `libx264` 与 `aac`），脚本会自动将 `soundtrack.wav` 封装为带声音的 `output/knowledge-show-promo.mp4`。若仅使用 Playwright 自带的精简 `ffmpeg-linux`，会导出 VP9 视频 `output/knowledge-show-promo.webm` 并将完整配乐保存为 `output/soundtrack.wav`，之后在任意装有完整 FFmpeg 的环境执行：
> `ffmpeg -i output/knowledge-show-promo.webm -i output/soundtrack.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest output/knowledge-show-promo.mp4`
