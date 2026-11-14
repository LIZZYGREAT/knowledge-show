export const modes = [
  ["auto", "交给 AI"],
  ["creative", "创意脑洞"],
  ["visual_explain", "直观看懂"],
  ["knowledge_dense", "干货精讲"],
  ["story", "故事悬念"],
  ["custom", "自定义"],
] as const;
export const depths = [
  ["intro", "轻松了解"],
  ["balanced", "讲清原理"],
  ["advanced", "深入一点"],
] as const;
export type Draft = {
  topic: string;
  focus: string;
  creative_mode: (typeof modes)[number][0];
  creative_mode_notes: string;
  knowledge_depth: (typeof depths)[number][0];
  creative_idea: string;
  art_style: string;
  must_include: string;
  must_avoid: string;
};
export const initialDraft: Draft = {
  topic: "",
  focus: "",
  creative_mode: "auto",
  creative_mode_notes: "",
  knowledge_depth: "balanced",
  creative_idea: "",
  art_style: "",
  must_include: "",
  must_avoid: "",
};

export function fromUserInput(input: Record<string, unknown>): Draft {
  const text = (field: string) => {
    const value = input[field];
    if (value === undefined) return "";
    if (typeof value !== "string") throw new Error(`创作项目的 ${field} 格式不正确。`);
    return value;
  };
  const choice = <T extends readonly (readonly [string, string])[]>(
    field: string,
    options: T,
    fallback: T[number][0],
  ): T[number][0] => {
    const value = input[field];
    if (value === undefined) return fallback;
    const match = options.find(([key]) => key === value);
    if (!match) throw new Error(`创作项目的 ${field} 暂不支持恢复。`);
    return match[0];
  };
  const lines = (field: string) => {
    const value = input[field];
    if (value === undefined) return "";
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
      throw new Error(`创作项目的 ${field} 格式不正确。`);
    return value.join("\n");
  };

  const topic = text("topic");
  if (!topic.trim()) throw new Error("创作项目中没有可恢复的主题。");
  return {
    topic,
    focus: text("focus"),
    creative_mode: choice("creative_mode", modes, initialDraft.creative_mode),
    creative_mode_notes: text("creative_mode_notes"),
    knowledge_depth: choice("knowledge_depth", depths, initialDraft.knowledge_depth),
    creative_idea: text("creative_idea"),
    art_style: text("art_style"),
    must_include: lines("must_include"),
    must_avoid: lines("must_avoid"),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function sameUserInput(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

export function toUserInput(draft: Draft) {
  if (!draft.topic.trim()) throw new Error("先写下你想讲的主题。");
  if (draft.creative_mode === "custom" && !draft.creative_mode_notes.trim())
    throw new Error("请描述一下你的自定义讲述方式。");
  const text = (value: string) => value.trim() || undefined;
  const lines = (value: string) =>
    value.trim()
      ? [
          ...new Set(
            value
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ]
      : undefined;
  // effective belongs to the coordinator; do not resolve auto or invent its choice here.
  return Object.fromEntries(
    Object.entries({
      topic: draft.topic.trim(),
      focus: text(draft.focus),
      creative_mode: draft.creative_mode,
      creative_mode_notes:
        draft.creative_mode === "custom"
          ? text(draft.creative_mode_notes)
          : undefined,
      knowledge_depth: draft.knowledge_depth,
      creative_idea: text(draft.creative_idea),
      art_style: text(draft.art_style),
      must_include: lines(draft.must_include),
      must_avoid: lines(draft.must_avoid),
    }).filter(([, v]) => v !== undefined),
  );
}
