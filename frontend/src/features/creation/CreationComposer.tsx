import { IdeaSeed } from "../landing/LivingFlowScene";
import { type FormEvent, useRef } from "react";
import { depths, modes, type Draft } from "../../common/creation";
const examples = [
  ["生日悖论", "为什么只要 23 个人，就很可能出现相同的生日？"],
  ["注意力机制", "AI 的注意力机制，是怎样理解一句话的？"],
  ["时间的方向", "时间为什么不能倒流？"],
] as const;

function FlourishDivider() {
  return (
    <div className="creation-flourish" aria-hidden="true">
      <svg viewBox="0 0 900 72" preserveAspectRatio="none">
        <path d="M0 43 C115 15 192 63 305 38 S492 19 578 40 744 66 900 29" />
        <path d="M0 51 C124 29 202 71 321 47 S487 31 583 49 764 70 900 39" />
        <path className="flourish-gold" d="M205 48 C292 29 355 29 431 39 S572 52 655 37" />
        <path className="flourish-sprig" d="M686 36 C721 29 744 20 765 8 M729 27 C722 17 711 15 703 17 C709 25 718 29 729 27 M744 20 C743 10 749 4 758 2 C758 11 754 17 744 20 M716 30 C705 28 697 32 693 40 C703 41 711 37 716 30" />
        <circle cx="179" cy="50" r="2.5" />
        <circle cx="672" cy="38" r="2" className="flourish-dot-gold" />
      </svg>
    </div>
  );
}

function ModeOrnament() {
  return (
    <svg className="mode-ornament" viewBox="0 0 260 28" aria-hidden="true">
      <path d="M2 17 C46 4 73 25 112 13 S184 4 258 14" />
      <path d="M109 13 C121 8 126 3 129 1 M122 9 C119 3 113 2 109 3 C112 8 117 10 122 9 M132 7 C132 2 136 0 141 1 C139 5 136 7 132 7" />
      <circle cx="220" cy="11" r="1.8" />
    </svg>
  );
}
export function CreationComposer({
  draft,
  onChange,
  onSubmit,
  onDemo,
  error,
}: {
  draft: Draft;
  onChange: (value: Draft) => void;
  onSubmit: () => void;
  onDemo: () => void;
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
    <main className="composer">
      <div className="composer-heading">
        <p className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p>
        <h1>从一个问题开始。</h1>
        <p>你负责好奇，我们让它成为故事。</p>
      </div>
      <FlourishDivider />
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
              e.target.style.height = `${Math.max(100, e.target.scrollHeight)}px`;
            }}
            placeholder="例如：为什么只要 23 个人，就很可能出现相同的生日？"
            rows={3}
            required
          />
          <div className="topic-examples">
            <span>试试</span>
            {examples.map(([label, text]) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  change("topic", text);
                  topicRef.current?.focus();
                }}
              >
                {label} ↗
              </button>
            ))}
          </div>
        </div>
        <div className="form-columns">
          {field(
            "focus",
            "有没有特别想讲的？",
            "例如：我想重点讲讲，直觉为什么会在这里出错。",
          )}
          <fieldset>
            <legend>希望怎么讲？</legend>
            <div className="choices">
              {modes.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={draft.creative_mode === value}
                  onClick={() => change("creative_mode", value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <ModeOrnament />
            {draft.creative_mode === "custom" && (
              <label className="field custom-field">
                你的讲述方式
                <textarea
                  required
                  value={draft.creative_mode_notes}
                  onChange={(e) =>
                    change("creative_mode_notes", e.target.value)
                  }
                  placeholder="描述你希望怎样讲述"
                  rows={2}
                />
              </label>
            )}
          </fieldset>
        </div>
        <details>
          <summary>
            更多创作偏好 <span>选填，让作品更像你的想法</span>
          </summary>
          <div className="preferences">
            <fieldset>
              <legend>知识深度</legend>
              <div className="choices">
                {depths.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={draft.knowledge_depth === value}
                    onClick={() => change("knowledge_depth", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field">
              美术风格偏好
              <input
                value={draft.art_style}
                onChange={(e) => change("art_style", e.target.value)}
                placeholder="例如：纸张质感、克制的线条与暖色"
              />
            </label>
            {field(
              "creative_idea",
              "你的创意",
              "例如：从一个生活中的小误会讲起",
              true,
            )}
            {field("must_include", "想出现的内容", "一个贴近日常的例子")}
            {field("must_avoid", "希望避开的内容", "过于复杂的公式")}
          </div>
        </details>
        <div className="form-bottom">
          <span className="quiet">16:9 横版 · 约 3 分钟</span>
          <button className="primary" type="submit">
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
        <span>开发联调</span> 生成服务尚未接入。可以先体验界面。
        <button className="text-button" onClick={onDemo}>
          查看流程演示 ↗
        </button>
      </aside>
    </main>
  );
}
