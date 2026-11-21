/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 真实前端 DOM 桥接层（Layer 2: #stage-ui）
 * 严格对齐真实组件结构：CreationComposer.tsx / GraduatedStageBar.tsx / editor-layout.html (Workbench)
 * 关键规则：零 CSS transition，全部状态由 window.__renderFrame 确定性逐帧驱动，与 Camera2D 共享变换矩阵
 */

import { STAGE_W, STAGE_H } from "../config/tokens.js";
import { clamp, lerp } from "../core/math.js";

/**
 * 工作台与创作页的关键像素坐标常量（1920x1080 舞台世界坐标）
 * 供各幕场景定位「棱片」落点与 Layer 1 视频画幅无缝对齐
 */
export const UI_GEOMETRY = {
  // 第二幕 CreationComposer 关键坐标
  composer: {
    cardRect: { x: 350, y: 120, w: 1220, h: 820 },
    cursorStart: { x: 434, y: 404 }, // 与第一幕光标落平无缝对齐（中央经相机平移对齐）
    modeVisualCenter: { x: 1094, y: 656 },
    submitBtnCenter: { x: 1396, y: 868 },
  },
  // 第二幕 GraduatedStageBar 关键坐标
  stageBar: {
    rect: { x: 240, y: 400, w: 1440, h: 260 },
    rulerY: 576,
    rulerLeft: 280,
    rulerRight: 1640,
  },
  // 第四幕 Workbench 真实布局坐标（精确 16:9 画幅占比 64.2%）
  workbench: {
    topbarH: 64,
    chatX: 1456,
    chatW: 464,
    frameRect: { x: 112, y: 82, w: 1232, h: 693 }, // 1232 / 693 = 16 / 9, 64.17% 宽
    timelineY: 794,
    timelineH: 286,
    exportBtnCenter: { x: 1838, y: 32 },
    versionPillCenter: { x: 378, y: 32 },
    sendBtnCenter: { x: 1688, y: 974 },
    inputBoxCenter: { x: 1688, y: 846 },
    timelineNodeCenter: { x: 890, y: 952 },
  },
};

const BRAND_MARK_SVG = `
<svg width="26" height="26" viewBox="0 0 100 100" fill="none" aria-hidden="true">
  <rect x="3" y="3" width="94" height="94" rx="26" fill="#FFFDF9" stroke="#12948D" stroke-opacity="0.26" stroke-width="2.6"/>
  <path d="M21 23.5c0-4.3 3.4-7.5 7.8-7.5 2.8 0 4.6 2 4.6 4.8v58.4c0 2.8-1.8 4.8-4.6 4.8-4.4 0-7.8-3.2-7.8-7.5Z" fill="#12575c"/>
  <path d="M36.8 47.4L50.8 17.8c1.8-3.8 6.8-4.7 10-1.8l25.8 27c2.7 2.8.7 6.4-3.4 6.4H38.6c-1.6 0-2.4-.7-1.8-2Z" fill="#17A79F"/>
  <path d="M36.8 52.6L50.8 82.2c1.8 3.8 6.8 4.7 10 1.8l25.8-27c2.7-2.8.7-6.4-3.4-6.4H38.6c-1.6 0-2.4.7-1.8 2Z" fill="#4E7CF6"/>
  <path d="M59.5 39.5Q59.5 50 70 50q-10.5 0-10.5 10.5Q59.5 50 49 50q10.5 0 10.5-10.5Z" fill="#ffffff"/>
  <circle cx="59.5" cy="50" r="2.6" fill="#F2994A"/>
</svg>`;

const COMPOSER_MODES = [
  ["auto", "交给 AI"],
  ["creative", "创意脑洞"],
  ["visual_explain", "直观看懂"],
  ["knowledge_dense", "干货精讲"],
  ["story", "故事悬念"],
  ["custom", "自定义"],
];

export class FrontendStage {
  constructor(mountEl) {
    this.root = mountEl;
    this._buildDom();
  }

  _buildDom() {
    this.root.innerHTML = `
      <div class="ui-camera-plane" id="ui-camera-plane">
        <!-- 1. 第二幕真实创作入口：CreationComposer -->
        <section class="ks-composer-layer" id="ui-composer" style="display:none">
          <div class="ks-composer-card">
            <div class="ks-composer-head">
              <div class="ks-brand-pill">
                ${BRAND_MARK_SVG}
                <span>CREATOR'S DESK · FROM QUESTION TO FILM</span>
              </div>
              <h1 class="ks-composer-h1">从一个问题开始。</h1>
              <p class="ks-composer-sub">你负责好奇，我们把背后的机制做成值得看完的动态画面。</p>
            </div>

            <div class="ks-topic-label-row">
              <span class="ks-topic-label">你想让大家了解什么？</span>
              <span class="ks-required-pill">必填</span>
            </div>
            <div class="ks-topic-box" id="ui-topic-box">
              <span id="ui-topic-text"></span><span class="ks-caret" id="ui-topic-caret"></span>
            </div>

            <div class="ks-composer-grid">
              <div class="ks-studio-card">
                <div class="ks-field-label">有没有特别想讲的？</div>
                <div class="ks-field-fake">重点呈现不同波长在玻璃界面的减速与偏折分叉，少堆公式。</div>
              </div>
              <div class="ks-studio-card">
                <div class="ks-field-label">希望怎么讲？</div>
                <div class="ks-mode-grid" id="ui-mode-grid">
                  ${COMPOSER_MODES.map(
                    ([id, label]) =>
                      `<div class="ks-mode-pill" data-mode="${id}">${label}</div>`
                  ).join("")}
                </div>
                <div class="ks-mode-desc" id="ui-mode-desc">以可持续追踪的视觉对象与因果机制演示为核心，一眼看懂原理</div>
              </div>
            </div>

            <div class="ks-composer-foot">
              <div class="ks-foot-hint">美学基调：纸艺编辑风 · 16:9 宽屏动态短片</div>
              <div class="ks-primary-btn" id="ui-composer-submit">开始探索与创作 →</div>
            </div>
          </div>
        </section>

        <!-- 2. 第二幕真实刻度条：GraduatedStageBar -->
        <section class="ks-stagebar-layer" id="ui-stagebar" style="display:none">
          <div class="ks-stagebar-card">
            <div class="ks-sb-top">
              <div class="ks-sb-steps">
                <div class="ks-sb-step" id="sb-step-k">
                  <span class="ks-sb-node" id="sb-node-k">✓</span>
                  <div>
                    <div class="ks-sb-title">知识探索 <em class="ks-sb-pill" id="sb-pill-k">已核验</em></div>
                    <div class="ks-sb-range">0% – 33% · 主题核验与核心洞察</div>
                  </div>
                </div>
                <div class="ks-sb-step" id="sb-step-s">
                  <span class="ks-sb-node" id="sb-node-s">02</span>
                  <div>
                    <div class="ks-sb-title">脚本编排 <em class="ks-sb-pill" id="sb-pill-s">编排中</em></div>
                    <div class="ks-sb-range">33% – 66% · 分幕编排与节奏设计</div>
                  </div>
                </div>
                <div class="ks-sb-step" id="sb-step-a">
                  <span class="ks-sb-node" id="sb-node-a">03</span>
                  <div>
                    <div class="ks-sb-title">动画呈现 <em class="ks-sb-pill" id="sb-pill-a">待开始</em></div>
                    <div class="ks-sb-range">66% – 100% · 动态渲染与画面质检</div>
                  </div>
                </div>
              </div>
              <div class="ks-sb-percent"><strong id="sb-pct">52</strong><span>%</span></div>
            </div>

            <div class="ks-sb-ruler">
              <div class="ks-sb-track">
                <div class="ks-sb-fill" id="sb-fill" style="width:52%">
                  <span class="ks-sb-head"></span>
                </div>
              </div>
              <div class="ks-sb-ticks" id="sb-ticks">
                ${Array.from({ length: 31 }, (_, i) => {
                  const major = i === 0 || i === 10 || i === 20 || i === 30;
                  return `<span class="ks-sb-tick ${major ? "is-major" : ""}" data-idx="${i}"></span>`;
                }).join("")}
              </div>
              <div class="ks-sb-labels">
                <span>起点</span>
                <span>知识就绪 · 33%</span>
                <span>脚本定稿 · 66%</span>
                <span>成片就绪 · 100%</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. 第四幕真实可编辑工作台：Workbench (严格对齐 editor-layout.html) -->
        <section class="ks-workbench-layer" id="ui-workbench" style="display:none">
          <!-- Topbar -->
          <header class="wb-topbar" id="wb-topbar">
            <div class="wb-brand">
              ${BRAND_MARK_SVG}
              <div class="wb-title">Knowledge<span class="wb-dot">.</span><span class="wb-show">Show</span><span class="wb-paren">(</span><em class="wb-me">me</em><span class="wb-paren">)</span></div>
            </div>
            <div class="wb-badge wb-version" id="wb-version-pill">v1 · 纸艺编辑风</div>
            <div class="wb-badge">16:9 · 1080P</div>
            <div class="wb-badge">白光经过棱镜，为何散出彩虹？</div>
            <div class="wb-badge wb-style-pill">视频画风 · paper-editorial</div>
            <div class="wb-spacer"></div>
            <div class="wb-btn wb-pick-on">点选对象: 开</div>
            <div class="wb-btn">版本回退</div>
            <div class="wb-btn wb-primary" id="wb-export-btn">导出 MP4</div>
          </header>

          <!-- 左侧舞台背景壳（中间留出精确透明孔给 Layer 1 Canvas 画幅） -->
          <div class="wb-stage-shell" id="wb-stage-shell">
            <div class="wb-frame-bezel" id="wb-frame-bezel">
              <div class="wb-frame-tag" id="wb-frame-tag">S04 · 彩虹色散定格 · <span id="wb-frame-ver">v1</span></div>
            </div>
            <div class="wb-playbar">
              <span class="wb-play-icon">▶</span>
              <span class="wb-time-code" id="wb-time-code">01:36 / 02:45</span>
              <span class="wb-fps-chip">60 fps</span>
            </div>
          </div>

          <!-- 底部真实多轨时间轴 -->
          <div class="wb-timeline" id="wb-timeline">
            <div class="wb-tl-head">
              <span class="wb-tl-tag">时间轴</span>
              <div class="wb-tabs">
                <span class="wb-tab">场景</span>
                <span class="wb-tab on">动画</span>
              </div>
              <div class="wb-sel-chip" id="wb-tl-chip" style="opacity:0">对象 · prism-spectrum-waves · 连续多帧</div>
              <div class="wb-tl-meta">确定性时间驱动 · 预览即成片</div>
            </div>
            <div class="wb-tl-body">
              <div class="wb-ruler">
                <span>0:00</span><span>0:30</span><span>1:00</span><span>1:30</span><span>2:00</span><span>2:30</span>
              </div>
              <div class="wb-tracks">
                <div class="wb-track">
                  <div class="wb-track-label">分幕结构</div>
                  <div class="wb-track-lane">
                    <div class="wb-clip" style="left:2%;width:18%">S01 悬念引入</div>
                    <div class="wb-clip" style="left:21%;width:24%">S02 微观波列</div>
                    <div class="wb-clip" style="left:46%;width:26%">S03 边界分叉</div>
                    <div class="wb-clip is-active" style="left:73%;width:25%">S04 彩虹全貌</div>
                  </div>
                </div>
                <div class="wb-track">
                  <div class="wb-track-label">视觉对象</div>
                  <div class="wb-track-lane">
                    <div class="wb-clip obj-lock" style="left:6%;width:86%">glass-prism-body（已锁定）</div>
                    <div class="wb-clip obj-target" id="wb-track-waves" style="left:48%;width:48%">
                      <span>prism-spectrum-waves</span>
                      <span class="wb-keyframe-diamond" id="wb-kf-node" style="left:44%"></span>
                    </div>
                  </div>
                </div>
                <div class="wb-track">
                  <div class="wb-track-label">视觉参数</div>
                  <div class="wb-track-lane">
                    <div class="wb-clip obj-param" id="wb-track-param" style="left:52%;width:40%">波长起伏对比 · 手绘角度刻度</div>
                  </div>
                </div>
                <div class="wb-playhead" id="wb-playhead" style="left:66%"></div>
              </div>
            </div>
          </div>

          <!-- 右侧真实 Co-Director 对话修订侧栏 -->
          <aside class="wb-chat" id="wb-chat">
            <div class="wb-chat-head">
              <strong>对话修改</strong>
              <span>CO-DIRECTOR</span>
            </div>

            <div class="wb-msgs" id="wb-msgs">
              <div class="wb-msg ai">
                <span class="who">工作台</span>
                直接点选画面中的对象即可绑定连续帧区间；未选中的元素保持锁定，修改只作用于你关心的局部细节。
              </div>
              <div class="wb-msg me" id="wb-msg-user" style="display:none">
                <span class="who">创作者</span>
                <span class="wb-inline-chip">prism-spectrum-waves</span>
                拉大红光与紫光的波长起伏对比，并在折射边界补上手绘角度刻度
              </div>
              <div class="wb-msg ai" id="wb-msg-ai-done" style="display:none">
                <span class="who">工作台 · v2 已生成</span>
                已完成局部精修：仅更新 <code>prism-spectrum-waves</code> 红紫波长振幅并补绘 <code>θ_red &lt; θ_violet</code> 刻度弧；棱镜主体与其余五道色光保持原样。
              </div>
            </div>

            <div class="wb-inspector" id="wb-inspector" style="opacity:0">
              <div class="wb-insp-top">
                <span class="wb-insp-title">prism-spectrum-waves</span>
                <span class="wb-insp-lock">其余 6 项已锁定</span>
              </div>
              <div class="wb-insp-meta">红紫折射波束 · 7 股水彩波列</div>
              <div class="wb-insp-scopes">
                <span class="wb-scope">当前幕</span>
                <span class="wb-scope is-on">连续多帧</span>
                <span class="wb-scope">当前时刻</span>
                <span class="wb-scope is-attach">已引用 ✓</span>
              </div>
            </div>

            <div class="wb-input" id="wb-chat-input">
              <span class="wb-inline-chip" id="wb-input-chip" style="display:none">prism-spectrum-waves ×</span>
              <span id="wb-input-text"></span><span class="ks-caret" id="wb-input-caret" style="display:none"></span>
            </div>

            <div class="wb-btn wb-primary wb-send-btn" id="wb-send-btn">应用局部修订</div>
            <div class="wb-status" id="wb-status">选择框仅用于编辑定位，不进入最终导出画面。</div>
          </aside>
        </section>
      </div>
    `;

    this.el = {
      plane: this.root.querySelector("#ui-camera-plane"),
      composer: this.root.querySelector("#ui-composer"),
      topicBox: this.root.querySelector("#ui-topic-box"),
      topicText: this.root.querySelector("#ui-topic-text"),
      topicCaret: this.root.querySelector("#ui-topic-caret"),
      modePills: Array.from(this.root.querySelectorAll(".ks-mode-pill")),
      composerSubmit: this.root.querySelector("#ui-composer-submit"),

      stagebar: this.root.querySelector("#ui-stagebar"),
      sbStepK: this.root.querySelector("#sb-step-k"),
      sbStepS: this.root.querySelector("#sb-step-s"),
      sbStepA: this.root.querySelector("#sb-step-a"),
      sbPillS: this.root.querySelector("#sb-pill-s"),
      sbPct: this.root.querySelector("#sb-pct"),
      sbFill: this.root.querySelector("#sb-fill"),
      sbTicks: Array.from(this.root.querySelectorAll(".ks-sb-tick")),

      workbench: this.root.querySelector("#ui-workbench"),
      wbTopbar: this.root.querySelector("#wb-topbar"),
      wbStageShell: this.root.querySelector("#wb-stage-shell"),
      wbTimeline: this.root.querySelector("#wb-timeline"),
      wbChat: this.root.querySelector("#wb-chat"),
      wbVersionPill: this.root.querySelector("#wb-version-pill"),
      wbFrameVer: this.root.querySelector("#wb-frame-ver"),
      wbFrameTag: this.root.querySelector("#wb-frame-tag"),
      wbTimeCode: this.root.querySelector("#wb-time-code"),
      wbExportBtn: this.root.querySelector("#wb-export-btn"),
      wbTlChip: this.root.querySelector("#wb-tl-chip"),
      wbTrackWaves: this.root.querySelector("#wb-track-waves"),
      wbKfNode: this.root.querySelector("#wb-kf-node"),
      wbTrackParam: this.root.querySelector("#wb-track-param"),
      wbPlayhead: this.root.querySelector("#wb-playhead"),
      wbInspector: this.root.querySelector("#wb-inspector"),
      wbInput: this.root.querySelector("#wb-chat-input"),
      wbInputChip: this.root.querySelector("#wb-input-chip"),
      wbInputText: this.root.querySelector("#wb-input-text"),
      wbInputCaret: this.root.querySelector("#wb-input-caret"),
      wbSendBtn: this.root.querySelector("#wb-send-btn"),
      wbMsgUser: this.root.querySelector("#wb-msg-user"),
      wbMsgAiDone: this.root.querySelector("#wb-msg-ai-done"),
      wbStatus: this.root.querySelector("#wb-status"),
    };
  }

  /**
   * 每帧开始前先隐藏所有真实 UI 层，并同步相机矩阵
   */
  syncCamera(camera) {
    this.el.plane.style.transform = camera.toCssTransform(STAGE_W, STAGE_H);
  }

  hideAll() {
    this.el.composer.style.display = "none";
    this.el.stagebar.style.display = "none";
    this.el.workbench.style.display = "none";
  }

  /**
   * 驱动第二幕 CreationComposer 状态
   */
  renderComposer({
    visible = false,
    alpha = 1,
    scale = 1,
    typedText = "",
    caretVisible = true,
    activeMode = "auto",
    hoverMode = null,
    submitPressed = false,
  } = {}) {
    if (!visible || alpha <= 0.005) {
      this.el.composer.style.display = "none";
      return;
    }
    this.el.composer.style.display = "block";
    this.el.composer.style.opacity = clamp(alpha).toFixed(4);
    this.el.composer.style.transform = `scale(${scale.toFixed(4)})`;

    this.el.topicText.textContent = typedText;
    this.el.topicCaret.style.opacity = caretVisible ? "1" : "0";
    this.el.topicBox.classList.toggle("is-focused", typedText.length > 0 || caretVisible);

    for (const pill of this.el.modePills) {
      const m = pill.dataset.mode;
      pill.classList.toggle("is-selected", m === activeMode);
      pill.classList.toggle("is-hover", m === hoverMode);
    }
    this.el.composerSubmit.classList.toggle("is-pressed", submitPressed);
  }

  /**
   * 驱动第二幕 GraduatedStageBar 状态
   */
  renderStageBar({ visible = false, alpha = 1, progress = 0.52, translateY = 0 } = {}) {
    if (!visible || alpha <= 0.005) {
      this.el.stagebar.style.display = "none";
      return;
    }
    const p = clamp(progress);
    this.el.stagebar.style.display = "block";
    this.el.stagebar.style.opacity = clamp(alpha).toFixed(4);
    this.el.stagebar.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;

    const pct = Math.round(p * 100);
    this.el.sbPct.textContent = String(pct);
    this.el.sbFill.style.width = `${(p * 100).toFixed(2)}%`;

    this.el.sbStepK.className = "ks-sb-step state-completed";
    this.el.sbStepS.className = `ks-sb-step ${p >= 0.66 ? "state-completed" : "state-running"}`;
    this.el.sbPillS.textContent = p >= 0.66 ? "已定稿" : "编排中";
    this.el.sbStepA.className = `ks-sb-step ${p >= 0.66 ? "state-running" : "state-pending"}`;

    const total = 30;
    for (let i = 0; i <= total; i++) {
      const passed = p + 0.004 >= i / total && p > 0.005;
      this.el.sbTicks[i].classList.toggle("is-passed", passed);
    }
  }

  /**
   * 驱动第四幕 & 第五幕 Workbench 真实工作台状态
   */
  renderWorkbench({
    visible = false,
    alpha = 1,
    chromeReveal = 1, // [0, 1] 四周面板顺着纸缘浮现
    sweepClipX = 0, // [0, 1920] 第五幕标尺自左向右拂过，隐去工作台外壳
    version = "v1",
    versionFlip = 0, // [0, 1] v1 -> v2 清脆翻转
    selected = false,
    inspectorAlpha = 0,
    inputChip = false,
    inputText = "",
    inputCaret = false,
    inputFocused = false,
    sendPressed = false,
    showUserMsg = false,
    showAiDoneMsg = false,
    playheadPct = 66,
    kfNodePct = 44,
    timeCode = "01:36 / 02:45",
    exportPressed = false,
    statusText = "选择框仅用于编辑定位，不进入最终导出画面。",
  } = {}) {
    if (!visible || alpha <= 0.005) {
      this.el.workbench.style.display = "none";
      return;
    }
    this.el.workbench.style.display = "block";
    this.el.workbench.style.opacity = clamp(alpha).toFixed(4);

    // 第五幕标尺扫屏裁切：标尺左侧的工作台面板优雅隐去
    if (sweepClipX > 0.5) {
      this.el.workbench.style.clipPath = `inset(0 0 0 ${Math.min(STAGE_W, sweepClipX).toFixed(1)}px)`;
    } else {
      this.el.workbench.style.clipPath = "none";
    }

    // 退镜入台时，四边面板沿纸缘柔滑浮现
    const cr = clamp(chromeReveal);
    this.el.wbTopbar.style.transform = `translate3d(0, ${lerp(-64, 0, cr).toFixed(2)}px, 0)`;
    this.el.wbTopbar.style.opacity = cr.toFixed(4);
    this.el.wbTimeline.style.transform = `translate3d(0, ${lerp(180, 0, cr).toFixed(2)}px, 0)`;
    this.el.wbTimeline.style.opacity = cr.toFixed(4);
    this.el.wbChat.style.transform = `translate3d(${lerp(240, 0, cr).toFixed(2)}px, 0, 0)`;
    this.el.wbChat.style.opacity = cr.toFixed(4);
    this.el.wbStageShell.style.opacity = cr.toFixed(4);

    // 版本号纸签翻转
    const isV2 = version === "v2";
    this.el.wbVersionPill.textContent = isV2 ? "v2 · 局部精修" : "v1 · 纸艺编辑风";
    this.el.wbVersionPill.classList.toggle("is-v2", isV2);
    if (versionFlip > 0 && versionFlip < 1) {
      const sy = Math.abs(Math.cos(versionFlip * Math.PI));
      this.el.wbVersionPill.style.transform = `scaleY(${Math.max(0.08, sy).toFixed(3)})`;
    } else {
      this.el.wbVersionPill.style.transform = "none";
    }
    this.el.wbFrameVer.textContent = isV2 ? "v2" : "v1";
    this.el.wbTimeCode.textContent = timeCode;

    // 选中状态与时间轴高亮
    this.el.wbTlChip.style.opacity = selected ? "1" : "0";
    this.el.wbTrackWaves.classList.toggle("is-selected", selected);
    this.el.wbTrackParam.classList.toggle("is-v2", isV2);
    this.el.wbPlayhead.style.left = `${clamp(playheadPct, 4, 96).toFixed(2)}%`;
    this.el.wbKfNode.style.left = `${clamp(kfNodePct, 12, 86).toFixed(2)}%`;

    // 对象检视器与输入框
    this.el.wbInspector.style.opacity = clamp(inspectorAlpha).toFixed(4);
    this.el.wbInspector.style.display = inspectorAlpha > 0.02 ? "block" : "none";
    this.el.wbInputChip.style.display = inputChip ? "inline-flex" : "none";
    this.el.wbInputText.textContent = inputText;
    this.el.wbInputCaret.style.display = inputCaret ? "inline-block" : "none";
    this.el.wbInput.classList.toggle("is-focused", inputFocused);
    this.el.wbSendBtn.classList.toggle("is-pressed", sendPressed);
    this.el.wbExportBtn.classList.toggle("is-pressed", exportPressed);

    this.el.wbMsgUser.style.display = showUserMsg ? "block" : "none";
    this.el.wbMsgAiDone.style.display = showAiDoneMsg ? "block" : "none";
    this.el.wbStatus.textContent = statusText;
  }
}
