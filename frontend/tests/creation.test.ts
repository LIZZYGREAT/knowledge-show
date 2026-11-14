import { describe, expect, it } from "vitest";
import { initialDraft, toUserInput } from "../src/common/creation";
import {
  applyEvent,
  emptyProgress,
  knowledgeEvent,
} from "../src/common/progress";
describe("brief user_input boundary", () => {
  it("rejects whitespace without submitting placeholder examples", () =>
    expect(() => toUserInput({ ...initialDraft, topic: "  " })).toThrow());
  it("preserves independent preferences, omits empty values and deduplicates lists", () => {
    expect(
      toUserInput({
        ...initialDraft,
        topic: " 时间 ",
        focus: " 方向 ",
        creative_mode: "story",
        art_style: " 纸张 ",
        creative_idea: "倒叙",
        must_include: "例子\n\n公式\n例子",
        must_avoid: "术语",
      }),
    ).toEqual({
      topic: "时间",
      focus: "方向",
      creative_mode: "story",
      knowledge_depth: "balanced",
      art_style: "纸张",
      creative_idea: "倒叙",
      must_include: ["例子", "公式"],
      must_avoid: ["术语"],
    });
  });
  it("requires custom notes and never sends inactive custom text", () => {
    expect(() =>
      toUserInput({ ...initialDraft, topic: "时间", creative_mode: "custom" }),
    ).toThrow();
    expect(
      toUserInput({
        ...initialDraft,
        topic: "时间",
        creative_mode_notes: "保留的草稿",
      }),
    ).not.toHaveProperty("creative_mode_notes");
  });
});
describe("truthful event progress", () => {
  it("ignores unknown external input and never renders backend summary or error text", () => {
    expect(knowledgeEvent(null)).toBeNull();
    expect(knowledgeEvent({phase:"brief",event_type:"started"})).toBeNull();
    expect(
      knowledgeEvent({ phase: "unknown", event_type: "started" }),
    ).toBeNull();
    expect(
      knowledgeEvent({
        phase: "search",
        event_type: "started",
        summary: "sensitive raw detail",
      })?.text,
    ).toBe("正在补充关键资料");
  });
  it("completes knowledge only after published delivery and does not invent search", () => {
    const research = applyEvent(
      emptyProgress(),
      knowledgeEvent({ phase: "research", event_type: "completed" })!,
    );
    expect(research.stages).toEqual({
      knowledge: "running",
      script: "pending",
      animation: "pending",
    });
    expect(research.messages.some((m) => m.text.includes("资料"))).toBe(false);
    const delivery = applyEvent(
      research,
      knowledgeEvent({ phase: "delivery", event_type: "completed" })!,
    );
    expect(delivery.stages).toEqual({
      knowledge: "completed",
      script: "pending",
      animation: "pending",
    });
  });
  it("rejects out-of-order completion and final animation completion without media", () => {
    const start = emptyProgress();
    expect(
      applyEvent(start, { stage: "script", kind: "completed", text: "bad" }),
    ).toBe(start);
    const ready = {
      ...start,
      stages: {
        knowledge: "completed",
        script: "completed",
        animation: "running",
      },
    } as const;
    expect(
      applyEvent(ready, { stage: "animation", kind: "completed", text: "bad" }),
    ).toBe(ready);
  });
  it("stops accepting progress after failure without erasing completed artifacts", () => {
    let state = applyEvent(emptyProgress(), {
      stage: "knowledge",
      kind: "completed",
      text: "published",
    });
    state = applyEvent(state, {
      stage: "script",
      kind: "failed",
      text: "failed",
    });
    expect(state.stages.knowledge).toBe("completed");
    expect(
      applyEvent(state, { stage: "script", kind: "completed", text: "late" }),
    ).toBe(state);
  });
});
