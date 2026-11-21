import { useEffect, useMemo, useRef, useState } from "react";
import { AnimationPlayer } from "../../animation/runtime/AnimationPlayer";
import { createVectorScene } from "../../animation/runtime/VectorScene";
import type { FrameBounds, SelectableElement } from "../../animation/runtime/SceneTypes";
import { profiles } from "../../animation/styles/profiles";
import {
  COMPONENT_CATALOG,
  type ComponentId,
} from "../../animation/templates/componentLibrary";
import {
  buildComponentPreview,
  buildTemplateDemo,
} from "../../animation/templates/templateDemos";
import "./template-showcase.css";

function LiveVectorStage({
  sceneKey,
  build,
}: {
  sceneKey: string;
  build: () => ReturnType<typeof createVectorScene>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<AnimationPlayer | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(12000);
  const [playing, setPlaying] = useState(true);
  const [elements, setElements] = useState<SelectableElement[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [bounds, setBounds] = useState<FrameBounds | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const def = build();
    setDurationMs(def.durationMs);
    const player = new AnimationPlayer(host, def);
    playerRef.current = player;
    setElements(player.getSelectableElements());
    setSelectedId("");
    setBounds(null);

    const unsubscribe = player.subscribe((next, active) => {
      setTimeMs(next);
      setPlaying(active);
      if (selectedRef.current) {
        setBounds(player.getElementBounds(selectedRef.current));
      }
      if (!active && next >= def.durationMs - 20) {
        // Gentle loop for showcase viewing
        void player.seekAndWaitForFrame(0).then(() => player.play()).catch(() => {});
      }
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      void player.seekAndWaitForFrame(Math.round(def.durationMs * 0.55));
    } else {
      player.play();
    }

    return () => {
      unsubscribe();
      player.destroy();
      playerRef.current = null;
    };
  }, [sceneKey, build]);

  async function seek(ms: number) {
    const player = playerRef.current;
    if (!player) return;
    try {
      await player.seekAndWaitForFrame(ms);
      if (selectedRef.current) {
        setBounds(player.getElementBounds(selectedRef.current));
      }
    } catch {
      // ignore superseded seek
    }
  }

  return (
    <div className="tpl-stage-wrap">
      <div className="tpl-video-bezel">
        <div className="tpl-video-frame">
          <div ref={hostRef} className="tpl-video-host" />
          {bounds && (
            <div
              className="tpl-selection-box"
              style={{
                left: `${bounds.x * 100}%`,
                top: `${bounds.y * 100}%`,
                width: `${bounds.width * 100}%`,
                height: `${bounds.height * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      <div className="tpl-transport">
        <button
          type="button"
          className="tpl-play-btn"
          onClick={() => {
            const p = playerRef.current;
            if (!p) return;
            if (playing) p.pause();
            else p.play();
          }}
        >
          {playing ? "❚❚ 暂停" : "▶ 播放"}
        </button>
        <input
          type="range"
          aria-label="预览时间轴"
          min={0}
          max={durationMs}
          step={50}
          value={Math.min(durationMs, Math.round(timeMs))}
          onChange={(e) => {
            playerRef.current?.pause();
            void seek(Number(e.target.value));
          }}
        />
        <output className="tpl-timecode">
          {(timeMs / 1000).toFixed(1)}s / {(durationMs / 1000).toFixed(1)}s
        </output>
      </div>

      <div className="tpl-inspect-strip">
        <span className="tpl-inspect-label">可框选组件对象：</span>
        <div className="tpl-inspect-chips">
          <button
            type="button"
            className={`tpl-obj-chip ${selectedId === "" ? "is-active" : ""}`}
            onClick={() => {
              setSelectedId("");
              selectedRef.current = "";
              setBounds(null);
            }}
          >
            无高亮
          </button>
          {elements.slice(0, 10).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tpl-obj-chip ${selectedId === item.id ? "is-active" : ""}`}
              onClick={() => {
                setSelectedId(item.id);
                selectedRef.current = item.id;
                setBounds(playerRef.current?.getElementBounds(item.id) ?? null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TemplateShowcase({
  onUseTemplate,
}: {
  onUseTemplate: (styleName: string, sampleTopic?: string) => void;
}) {
  const [tab, setTab] = useState<"demos" | "components">("demos");
  const [selectedStyleId, setSelectedStyleId] = useState(profiles[1].id);
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentId>("metric-bars");

  const activeProfile =
    profiles.find((p) => p.id === selectedStyleId) ?? profiles[0];
  const activeDemo = useMemo(
    () => buildTemplateDemo(selectedStyleId),
    [selectedStyleId],
  );
  const activeComponentPreview = useMemo(
    () => buildComponentPreview(selectedComponent, selectedStyleId),
    [selectedComponent, selectedStyleId],
  );
  const activeComponentMeta =
    COMPONENT_CATALOG.find((c) => c.id === selectedComponent) ??
    COMPONENT_CATALOG[0];

  const demoBuilder = useMemo(
    () => () => createVectorScene(activeDemo.scene, activeDemo.resource),
    [activeDemo],
  );
  const componentBuilder = useMemo(
    () => () =>
      createVectorScene(
        activeComponentPreview.scene,
        activeComponentPreview.resource,
      ),
    [activeComponentPreview],
  );

  return (
    <main className="tpl-page page-enter">
      <div className="tpl-header">
        <div>
          <p className="eyebrow">STYLE TEMPLATES &amp; COMPONENT LAB</p>
          <h1>画风模板与 1:1 组件展厅</h1>
          <p>
            下方所有画面均由真实视频引擎 1:1 实时渲染——你可以直接预览 4
            套画风的成片质感、切换 8 类常用知识动画组件，并一键套用到你的创作中。
          </p>
        </div>
        <div className="tpl-mode-tabs" role="tablist" aria-label="展厅视图切换">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "demos"}
            className={`tpl-tab ${tab === "demos" ? "is-active" : ""}`}
            onClick={() => setTab("demos")}
          >
            1:1 模板整片 Demo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "components"}
            className={`tpl-tab ${tab === "components" ? "is-active" : ""}`}
            onClick={() => setTab("components")}
          >
            8 大知识组件库
          </button>
        </div>
      </div>

      {/* 4 Visual Template Selector Cards */}
      <section className="tpl-style-grid" aria-label="选择视频画风模板">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedStyleId;
          const demo = buildTemplateDemo(profile.id);
          return (
            <button
              key={profile.id}
              type="button"
              className={`tpl-style-card ${isSelected ? "is-selected" : ""}`}
              onClick={() => setSelectedStyleId(profile.id)}
            >
              <div
                className="tpl-style-preview"
                style={{ background: profile.palette.background }}
              >
                <span
                  className="tpl-preview-block"
                  style={{
                    background: profile.palette.material,
                    borderColor: profile.palette.shade,
                  }}
                />
                <span
                  className="tpl-preview-orb"
                  style={{ background: profile.palette.red }}
                />
                <span
                  className="tpl-preview-orb second"
                  style={{ background: profile.palette.blue }}
                />
                <span
                  className="tpl-preview-bar"
                  style={{ background: profile.palette.gold }}
                />
              </div>
              <div className="tpl-style-meta">
                <div className="tpl-style-title-row">
                  <strong>{profile.name}</strong>
                  <span>{profile.id}</span>
                </div>
                <p>{demo.tagline}</p>
              </div>
            </button>
          );
        })}
      </section>

      {tab === "demos" ? (
        <section className="tpl-workbench-layout">
          <div className="tpl-stage-column">
            <LiveVectorStage
              sceneKey={`demo-${selectedStyleId}`}
              build={demoBuilder}
            />
          </div>
          <aside className="tpl-spec-panel">
            <p className="eyebrow">TEMPLATE SPECIFICATION</p>
            <h2>{activeProfile.name}</h2>
            <p className="tpl-spec-intent">{activeProfile.intent}</p>

            <div className="tpl-spec-block">
              <h3>材质与光影语言</h3>
              <div className="tpl-tag-list">
                {activeProfile.materials.map((m) => (
                  <span key={m} className="tpl-tag">
                    {m}
                  </span>
                ))}
                <span className="tpl-tag is-warm">{activeProfile.lighting}</span>
              </div>
            </div>

            <div className="tpl-spec-block">
              <h3>动态节奏特征</h3>
              <p>{activeProfile.motionCharacter}</p>
            </div>

            <div className="tpl-spec-block">
              <h3>模板色板（Hex）</h3>
              <div className="tpl-palette-row">
                {Object.entries(activeProfile.palette).map(([key, color]) => (
                  <div key={key} className="tpl-swatch" title={`${key}: ${color}`}>
                    <i style={{ background: color }} />
                    <span>{key}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tpl-spec-actions">
              <button
                type="button"
                className="primary"
                onClick={() => onUseTemplate(activeProfile.name)}
              >
                使用「{activeProfile.name}」创作 →
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  onUseTemplate(activeProfile.name, activeDemo.sampleTopic)
                }
              >
                用同款示例主题试做
              </button>
            </div>
          </aside>
        </section>
      ) : (
        <section className="tpl-components-layout">
          <aside className="tpl-comp-sidebar" aria-label="选择知识动画组件">
            {COMPONENT_CATALOG.map((comp, idx) => (
              <button
                key={comp.id}
                type="button"
                className={`tpl-comp-item ${selectedComponent === comp.id ? "is-active" : ""}`}
                onClick={() => setSelectedComponent(comp.id)}
              >
                <span className="tpl-comp-num">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{comp.name}</strong>
                  <small>{comp.category}</small>
                </div>
              </button>
            ))}
          </aside>

          <div className="tpl-comp-stage">
            <div className="tpl-comp-banner">
              <div>
                <span className="tpl-comp-cat">{activeComponentMeta.category}</span>
                <h2>{activeComponentMeta.name}</h2>
                <p>
                  {activeComponentMeta.summary} · 常见场景：
                  {activeComponentMeta.useCase}
                </p>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => onUseTemplate(activeProfile.name)}
              >
                套用「{activeProfile.name}」去创作 →
              </button>
            </div>
            <LiveVectorStage
              sceneKey={`comp-${selectedComponent}-${selectedStyleId}`}
              build={componentBuilder}
            />
          </div>
        </section>
      )}
    </main>
  );
}
