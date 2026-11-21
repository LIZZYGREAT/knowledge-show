# Knowledge.Show(me) 长视频宣传片 v2（暖纸刊物与棱片）

面向 Bilibili 首发的 16:9 确定性 JS 程序化动画宣传片（原生 **1920×1080**，**60 fps**，总长 **2 分 45 秒 / 165 秒**，同步 **48 kHz 立体声** Web Audio 离线配乐与拟音）。

以 **「暖纸刊物与动态手工坊」**（Warm Editorial Craft & Living Motion Studio）为美学底座，以源自 `BrandLogo` 的 **「棱片（The Prism-Fold）」** 贯穿五幕，以主案例 **「白光经过棱镜，为何散出彩虹？」** 串联从提问到局部精修与确定性成片的完整体验。

## 五幕结构（0:00 – 2:45）

| 幕次 | 时段 | 核心叙事与视觉机关 |
| --- | --- | --- |
| **第一幕 · 破纸而出** | `0:00 – 0:22` | 静态讲义 -> 棱片探角撬起立体书磨砂棱镜 -> 阳光与 7 股水彩波列绽放 -> `BRACKET` 捏改紫光反转钩子 -> 彩虹倒卷化作闪烁输入光标 |
| **第二幕 · 提问生光** | `0:22 – 0:52` | 真实 `CreationComposer` 逐字键入问题与选择模式 -> 棱片闭合 `PRISM` 光学拆解出 3 股知识带并弹飞误区纸签 -> 真实 `GraduatedStageBar` 拱起叙事张力弧线 -> 波峰竖划展幕 |
| **第三幕 · 万物剧场** | `0:52 – 1:32` | 微观玻璃界面 7 色波列步幅减速偏折 -> 全景水彩彩虹 -> 棱片 `FOLD` 中轴翻页切换 `paper-editorial` / `modern-graphic` / `narrative-collage` -> 肥皂泡 / PN 结 / 双骰子物理变奏弹回彩虹定格 |
| **第四幕 · 创作者主权** | `1:32 – 2:20` | 退镜显露真实 `Workbench`（64% 画幅）-> `BRACKET` 咬合 `prism-spectrum-waves` -> 自然语言修订 -> 0.9s 严格框内暖杏水墨涟漪焕新 `v2`（框外纹丝不动）-> 描图纸 `v1/v2` 对比 + 微调二连击 -> 轻点「导出 MP4」 |
| **第五幕 · 所见即成片** | `2:20 – 2:45` | 青绿—暖杏刊物标尺扫屏，优雅隐去面板舒展回 100% 精修 `v2` 成片 + 印章 `已导出 · 1080P 60fps` -> 双股流纹丝带汇聚 -> 棱片归位拼合 `BrandLogo` 与克制落版 |

## 三层混合架构

```text
promo/
├── index.html                  # 1920x1080 三层舞台（#stage-world + #stage-ui + #stage-overlay）
├── render.mjs                  # Playwright 逐帧采集 + FFmpeg H.264/AAC 高码率流式合成
└── src/
    ├── main.js                 # 全局调度、window.__renderFrame(frameIndex, fps) 与预览控制
    ├── config/
    │   ├── tokens.js           # 暖纸色板、水彩彩虹光谱物理参数、字体与三风格档案
    │   └── timeline.js         # 五幕时间轴、字幕表与 0ms 音画同步 AUDIO_CUES
    ├── core/
    │   ├── math.js             # 贝塞尔缓动、阻尼弹簧解析解、Mulberry32 确定性 PRNG
    │   ├── camera.js           # 2D 虚拟摄像机（Canvas 与 DOM 共享精确变换矩阵）
    │   └── paper.js            # 世界空间锁定微纸纹 multiply 叠层、暖光晕与刊物字幕
    ├── entities/
    │   ├── prismFold.js        # 「棱片」四态状态机（GLIDE / PRISM / FOLD / BRACKET）与游丝
    │   ├── rainbowOptics.js    # 阳光书桌纸面光学与 7 股水彩波动丝带引擎
    │   ├── inkRipple.js        # 严格裁剪在选框内的暖杏水墨纸纹涟漪
    │   └── brandLogo.js        # Knowledge.Show(me) 矢量图标组装与字标落版
    ├── ui/
    │   └── frontendStage.js    # CreationComposer / GraduatedStageBar / Workbench 真实 DOM 桥接
    ├── scenes/
    │   ├── act01_awaken.js
    │   ├── act02_discover.js
    │   ├── act03_theater.js
    │   ├── act04_workbench.js
    │   └── act05_delivery.js
    └── audio/
        └── soundEngine.js      # 48kHz 立体声 OfflineAudioContext 程序化配乐与拟音
```

## 浏览器实时预览

```bash
cd promo
python3 -m http.server 8765
```

打开 `http://127.0.0.1:8765/`：
- `Space` 播放/暂停；`←` / `→` 快退/快进 2 秒；`M` 静音；`R` 重播；底部支持五幕一键跳转。

## 离线关键帧验收与 B 站高码率 MP4 导出

```bash
# 1. 截取全片 26 个核心验收关键帧到 promo/output/keyframes-v2/
node promo/render.mjs --keyframes --width 1920 --height 1080

# 2. 仅合成 48kHz 立体声无损音轨 promo/output/promo-audio.wav
node promo/render.mjs --audio-only

# 3. 导出 B 站首发 1080P 60fps 高码率成片（CRF 15 + AAC 320k）
node promo/render.mjs --fps 60 --width 1920 --height 1080

# 4. 片段快速抽检（例如仅导出第四幕高潮片段）
node promo/render.mjs --start 92 --end 140 --fps 30 --preset fast --out act04-check.mp4
```
