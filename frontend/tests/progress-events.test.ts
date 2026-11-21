import { describe, expect, it } from "vitest";
import {
  adaptDisplayEvents,
  displayEventsAfter,
  latestDisplayEventSeq,
} from "../src/common/progress";
import { computeFineProgress } from "../src/features/progress/GraduatedStageBar";

describe("display event adapter", () => {
  it("keeps only bounded, stage-consistent, ordered user-facing events", () => {
    const events = adaptDisplayEvents("JOB_a", [
      { seq: 2, stage: "knowledge", code: "knowledge.research.started", text: "正在了解这个主题" },
      { seq: 1, stage: "knowledge", code: "knowledge.brief", text: "已理解你的创作想法" },
      { seq: 3, stage: "script", code: "knowledge.creative.started", text: "阶段不一致" },
      { seq: 4, stage: "animation", code: "animation.scene_ready", text: "第 1 段画面已准备好" },
      { seq: 5, stage: "knowledge", code: "knowledge.raw!", text: "code 不合规" },
      { seq: 6, stage: "knowledge", code: "knowledge.brief", text: "x".repeat(121) },
      { seq: 7, stage: "knowledge", code: "knowledge.brief", text: "重复序号" },
      { seq: 7, stage: "knowledge", code: "knowledge.ready", text: "知识方向已经准备好" },
    ]);

    expect(events.map((event) => event.id)).toEqual([
      "JOB_a:1",
      "JOB_a:2",
      "JOB_a:4",
      "JOB_a:7",
    ]);
    expect(events.map((event) => event.text)).toEqual([
      "已理解你的创作想法",
      "正在了解这个主题",
      "第 1 段画面已准备好",
      "重复序号",
    ]);
  });

  it("strips control characters, caps the window and isolates job identities", () => {
    const raw = Array.from({ length: 12 }, (_, index) => ({
      seq: index + 1,
      stage: "knowledge",
      code: "knowledge.research.started",
      text: `事件 ${index + 1}\u0000`,
    }));
    const events = adaptDisplayEvents("JOB_b", raw);
    expect(events).toHaveLength(10);
    expect(events[0].seq).toBe(3);
    expect(events[0].id).toBe("JOB_b:3");
    expect(events[0].text).toBe("事件 3");
    expect(latestDisplayEventSeq(events)).toBe(12);
  });

  it("feeds only events newer than the polling cursor", () => {
    const events = adaptDisplayEvents("JOB_c", [
      { seq: 1, stage: "knowledge", code: "knowledge.brief", text: "已理解你的创作想法" },
      { seq: 2, stage: "knowledge", code: "knowledge.research.started", text: "正在了解这个主题" },
      { seq: 3, stage: "script", code: "script.planning", text: "正在安排讲述顺序与场景节奏" },
    ]);
    expect(displayEventsAfter(events, 1).map((event) => event.seq)).toEqual([2, 3]);
    expect(displayEventsAfter(events, 3)).toEqual([]);
    expect(adaptDisplayEvents("", events)).toEqual([]);
    expect(adaptDisplayEvents("JOB_d", "not-an-array")).toEqual([]);
  });

  it("computes strict zero initial progress and advances smoothly tick-by-tick across events", () => {
    const start = computeFineProgress({
      knowledge: "pending",
      script: "pending",
      animation: "pending",
    });
    expect(start).toBe(0);

    const k1 = computeFineProgress(
      { knowledge: "running", script: "pending", animation: "pending" },
      { knowledge: 1 },
    );
    const k3 = computeFineProgress(
      { knowledge: "running", script: "pending", animation: "pending" },
      { knowledge: 3 },
    );
    const kDone = computeFineProgress({
      knowledge: "completed",
      script: "pending",
      animation: "pending",
    });
    const allDone = computeFineProgress({
      knowledge: "completed",
      script: "completed",
      animation: "completed",
    });

    expect(k1).toBeGreaterThan(0);
    expect(k3).toBeGreaterThan(k1);
    expect(kDone).toBeCloseTo(1 / 3, 2);
    expect(allDone).toBe(1);
  });
});
