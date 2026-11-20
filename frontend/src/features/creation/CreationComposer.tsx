import { BrandLogo } from "../../components/BrandLogo";
import {
  NarrativeModeIcon,
  TopicIcon,
  WorkflowStepIcon,
} from "../../components/StudioIcons";
import { IdeaSeed } from "../landing/LivingFlowScene";
import { type FormEvent, useRef } from "react";
import { depths, modes, type Draft } from "../../common/creation";
import { profiles } from "../../animation/styles/profiles";

const examples = [
  ["birthday", "生日悖论", "为什么只要 23 个人，就很可能出现相同的生日？"],
  ["attention", "注意力机制", "AI 的注意力机制，是怎样理解一句话的？"],
  ["time", "时间的方向", "时间为什么不能倒流？"],
] as const;

const modeDescriptions: Record<(typeof modes)[number][0], string> = {
  auto: "系统会结合你的主题，自动选择最有观看吸引力的讲述节奏",
  creative: "放大反直觉现象、意想不到的联系与令人眼前一亮的知识惊喜",
  visual_explain: "以可持续追踪的视觉对象与因果机制演示为核心，一眼看懂原理",
  knowledge_dense: "围绕核心问题与关键机制紧凑推进，高信息密度同时保持动态美感",
  story: "从悬念、矛盾或真实发现切入，让知识规律推动情节自然揭晓",
  custom: "用你自己的话描述节奏、氛围或叙事视角",
};

const composerSteps = [
  ["explore", "01", "提出好奇"],
  ["script", "02", "知识核验与编剧"],
  ["animate", "03", "模板动画与微调"],
] as const;

export function CreationComposer({
  draft,
  onChange,
  onSubmit,
  onDemo,
  onOpenTemplates,
  onNewProject,
  error,
}: {
  draft: Draft;
  onChange: (value: Draft) => void;
  onSubmit: () => void;
  onDemo: () => void;
  onOpenTemplates?: () => void;
  onNewProject?: () => void;
  error: string;
}) {
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const change = (key: keyof Draft, value: string) =>
    onChange({ ...draft, [key]: value });

  const field = (
    key: keyof Draft,
    label: string,
    placeholder: string,
    wide = false,
  ) => (
    <div className={`field ${wide ? "field-wide" : ""}`}>
      <label htmlFor={`preference-${key}`}>{label}</label>
      <textarea
        id={`preference-${key}`}
        value={draft[key]}
        onChange={(e) => change(key, e.target.value)}
        placeholder={placeholder}
        rows={2}
      />
    </div>
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <main className="composer page-enter">
      <div className="composer-heading">
        <div className="composer-brand-pill">
          <BrandLogo size={20} />
          <p className="eyebrow">CREATOR&apos;S DESK · FROM QUESTION TO FILM</p>
        </div>
        <h1>从一个问题开始。</h1>
        <p>你负责好奇，我们把背后的机制做成值得看完的动态画面。</p>
        <ol className="composer-journey" aria-label="创作步骤">
          {composerSteps.map(([step, num, label], idx) => (
            <li key={step} className={`composer-journey-step ${idx === 0 ? "is-current" : ""}`}>
              <span className="composer-journey-icon">
                <WorkflowStepIcon step={step} />
              </span>
              <span className="composer-journey-num">{num}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </div>
      <form onSubmit={submit}>
        <label className="topic-label" htmlFor="topic">
          <span className="topic-prompt">
            <IdeaSeed />
            你想让大家了解什么？
          </span>
          <span className="required-label">必填</span>
        </label>
        <div className={`topic-stage ${draft.topic ? "has-topic" : ""}`}>
          <textarea
            id="topic"
            ref={topicRef}
            value={draft.topic}
            onChange={(e) => {
              change("topic", e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.max(96, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="例如：为什么越睡越困？或：两个骰子为什么最容易掷出 7？"
            rows={3}
            required
          />
          <div className="topic-examples">
            <span className="examples-tag">试试灵感</span>
            {examples.map(([iconKey, label, text]) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  change("topic", text);
                  topicRef.current?.focus();
                }}
              >
                <TopicIcon topicKey={iconKey} />
                <span>{label} ↗</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-columns">
          <div className="studio-card">
            {field(
              "focus",
              "有没有特别想讲的？",
              "例如：想重点讲清原理，历史背景简单带过。",
            )}
            <p className="studio-card-hint">
              留空也没关系，系统会自动寻找最有观看张力的切入角度。
            </p>
          </div>
          <fieldset className="studio-card">
            <legend>希望怎么讲？</legend>
            <div className="choices mode-choices">
              {modes.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-label={label}
                  aria-pressed={draft.creative_mode === value}
                  onClick={() => change("creative_mode", value)}
                >
                  <span className="choice-icon" aria-hidden="true">
                    <NarrativeModeIcon mode={value} />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="mode-caption" aria-live="polite">
              {modeDescriptions[draft.creative_mode]}
            </p>
            {draft.creative_mode === "custom" && (
              <label className="field custom-field">
                你的讲述方式
                <textarea
                  required
                  value={draft.creative_mode_notes}
                  onChange={(e) =>
                    change("creative_mode_notes", e.target.value)
                  }
                  placeholder="例如：像侦探破案一样，一步步揭开答案"
                  rows={2}
                />
              </label>
            )}
          </fieldset>
        </div>

        <details
          className="preferences-drawer"
          open={Boolean(draft.art_style.trim())}
        >
          <summary>
            更多创作偏好 <span>选填 · 知识深度、画风模板与必含内容</span>
          </summary>
          <div className="preferences">
            <fieldset>
              <legend>知识深度</legend>
              <div className="choices depth-choices">
                {depths.map(([value, label], index) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={label}
                    aria-pressed={draft.knowledge_depth === value}
                    onClick={() => change("knowledge_depth", value)}
                  >
                    <span className="depth-step" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="field art-style-field">
              <label htmlFor="preference-art_style">美术风格偏好</label>
              <input
                id="preference-art_style"
                value={draft.art_style}
                onChange={(e) => change("art_style", e.target.value)}
                placeholder="可直接点下方模板，或自由描述：如手绘插画风，颜色温暖"
              />
              <div className="template-card-grid" aria-label="视频画风模板选择">
                {profiles.map((profile) => {
                  const selected = draft.art_style.includes(profile.name);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`template-mini-card ${selected ? "is-selected" : ""}`}
                      onClick={() => change("art_style", profile.name)}
                      title={profile.intent}
                    >
                      <span
                        className="template-mini-thumb"
                        style={{ background: profile.palette.background }}
                        aria-hidden="true"
                      >
                        <span style={{ background: profile.palette.red }} />
                        <i style={{ background: profile.palette.blue }} />
                      </span>
                      <span className="template-mini-info">
                        <strong>{profile.name}</strong>
                        <small>{profile.materials.slice(0, 2).join(" · ")}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              {onOpenTemplates && (
                <div className="template-link-row">
                  <span>不确定选哪套画风？</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={onOpenTemplates}
                  >
                    去 1:1 模板展厅试看动态效果 ↗
                  </button>
                </div>
              )}
            </div>
            {field(
              "creative_idea",
              "你的创意",
              "例如：为什么越睡越困？把困意做成流沙，人越睡陷得越深",
              true,
            )}
            {field("must_include", "想出现的内容", "例如：一个日常生活中的例子")}
            {field("must_avoid", "希望避开的内容", "例如：太复杂的公式和术语")}
          </div>
        </details>

        <div className="form-bottom">
          <div className="form-bottom-meta">
            {onNewProject && (
              <button
                className="text-button"
                type="button"
                onClick={onNewProject}
              >
                开始新作品
              </button>
            )}
            <span className="format-badge">16:9 横版 · 约 3 分钟</span>
          </div>
          <button className="primary composer-submit" type="submit">
            开始创作 <span>→</span>
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <aside className="development-note">
        <span>创作流程</span>
        会按你的选择完成研究、脚本与模板动画制作，并支持在工作台中逐对象微调。
        <div className="development-note-actions">
          <button className="text-button" onClick={onDemo}>
            查看流程演示 ↗
          </button>
          {onOpenTemplates && (
            <button className="text-button" onClick={onOpenTemplates}>
              画风模板与组件 ↗
            </button>
          )}
          <a className="text-button" href="/workbench.html?demo=pn">
            打开样片工作台 ↗
          </a>
        </div>
      </aside>
    </main>
  );
}
