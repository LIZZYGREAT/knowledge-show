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
