import { describe, expect, it } from 'vitest';
import { demoBundle } from '../src/animation/scenes/pn-junction/demoBundle';
import { worldExecuteMeDemoBundle } from '../src/animation/scenes/world-execute-me/demoBundle';
import { ElementRegistry } from '../src/animation/runtime/ElementRegistry';
import soap from './fixtures/soap-style-lab/style-paper-editorial.json';
import type { AnimationBundle, VectorObject } from '../src/animation/runtime/BundleTypes';
import {
  buildRevisionRequest,
  buildSelectionForElement,
  formatSpanBadge,
  getContinuousSpans,
  getElementClipSegments,
  vectorObjectVisibleRange,
} from '../src/features/revision/selectionModel';

describe('workbench continuous object binding & revision selection model', () => {
  it('computes exact active visible range from VectorObject keyframes', () => {
    const obj: VectorObject = {
      id: 'EL_FADE',
      label: '淡入对象',
      shape: 'circle',
      x: 100,
      y: 100,
      radius: 20,
      fill: '#112233',
      keyframes: [
        { time_ms: 0, x: 100, y: 100, opacity: 0, scale: 1, rotation: 0 },
        { time_ms: 2000, x: 100, y: 100, opacity: 0, scale: 1, rotation: 0 },
        { time_ms: 3500, x: 200, y: 100, opacity: 1, scale: 1, rotation: 0 },
        { time_ms: 7000, x: 400, y: 100, opacity: 0, scale: 1, rotation: 0 },
        { time_ms: 10000, x: 400, y: 100, opacity: 0, scale: 1, rotation: 0 },
      ],
    };
    expect(vectorObjectVisibleRange(obj, 10000)).toEqual([2000, 7000]);

    const hidden: VectorObject = {
      ...obj,
      keyframes: [
        { time_ms: 0, x: 0, y: 0, opacity: 0, scale: 1, rotation: 0 },
        { time_ms: 5000, x: 0, y: 0, opacity: 0, scale: 1, rotation: 0 },
      ],
    };
    expect(vectorObjectVisibleRange(hidden, 5000)).toBeNull();
  });

  it('merges contiguous multi-scene PN objects into continuous multi-frame spans', () => {
    const bundle = demoBundle();
    const junctionSpans = getContinuousSpans(bundle, 'EL_S01_JUNCTION');
    expect(junctionSpans).toHaveLength(1);
    expect(junctionSpans[0].sceneIds).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07']);
    expect(junctionSpans[0].startMs).toBe(0);
    expect(junctionSpans[0].endMs).toBe(165000);

    const barrierSpans = getContinuousSpans(bundle, 'EL_PN_BARRIER');
    expect(barrierSpans).toHaveLength(1);
    expect(barrierSpans[0].sceneIds).toEqual(['S02', 'S03', 'S04', 'S05', 'S06', 'S07']);
    expect(barrierSpans[0].startMs).toBe(29500);

    const waveSpans = getContinuousSpans(bundle, 'EL_PN_WAVES');
    expect(waveSpans).toHaveLength(1);
    expect(waveSpans[0].sceneIds).toEqual(['S06']);
  });

  it('filters WEM elements strictly by active scene presence and splits non-contiguous spans', () => {
    const bundle = worldExecuteMeDemoBundle();
    const sparkSegments = getElementClipSegments(bundle, 'EL_WEM_SPARK');
    expect(sparkSegments.map((s) => s.sceneId)).toEqual(['S01', 'S02', 'S03', 'S04', 'S07', 'S13', 'S14']);

    const sparkSpans = getContinuousSpans(bundle, 'EL_WEM_SPARK');
    expect(sparkSpans).toHaveLength(3);
    expect(sparkSpans[0].sceneIds).toEqual(['S01', 'S02', 'S03', 'S04']);
    expect(sparkSpans[1].sceneIds).toEqual(['S07']);
    expect(sparkSpans[2].sceneIds).toEqual(['S13', 'S14']);
  });

  it('supports continuous, clip, and focused moment scope modes for stage selections', () => {
    const bundle = demoBundle();
    const continuous = buildSelectionForElement(
      bundle,
      { id: 'EL_S01_CARRIERS', label: '红蓝载流子群' },
      25000,
    )!;
    expect(continuous.scopeMode).toBe('continuous');
    expect(continuous.clipId).toBe('CL_S02');
    expect(continuous.clipIds).toHaveLength(7);
    expect(continuous.start).toBe(0);
    expect(continuous.end).toBe(165000);
    expect(continuous.className).toBe('PnJunctionDevice.Carriers');
    expect(formatSpanBadge(continuous)).toBe('S01–S07 连续(7幕)');

    const singleClip = buildSelectionForElement(
      bundle,
      { id: 'EL_S01_CARRIERS', label: '红蓝载流子群' },
      25000,
      'clip',
    )!;
    expect(singleClip.scopeMode).toBe('clip');
    expect(singleClip.clipIds).toEqual(['CL_S02']);
    expect(singleClip.start).toBe(15000);
    expect(singleClip.end).toBe(43000);

    const moment = buildSelectionForElement(
      bundle,
      { id: 'EL_S01_CARRIERS', label: '红蓝载流子群' },
      25000,
      'moment',
    )!;
    expect(moment.scopeMode).toBe('moment');
    expect(moment.start).toBe(23000);
    expect(moment.end).toBe(27000);
  });

  it('builds deduplicated schema-valid multi_scene, local, and global revision requests', () => {
    const bundle = structuredClone(soap) as AnimationBundle;
    const recurringId = bundle.manifest.selectable_elements.find((e) => !e.source_ref)?.id!;
    const spans = getContinuousSpans(bundle, recurringId);
    expect(spans.length).toBeGreaterThanOrEqual(1);

    const pnBundle = demoBundle();
    const multiSel = buildSelectionForElement(
      pnBundle,
      { id: 'EL_S01_JUNCTION', label: '结本体' },
      20000,
      'continuous',
    )!;
    const multiReq = buildRevisionRequest(pnBundle, [multiSel], '把结本体外框线条加粗一点', 'RR_MULTI_1');
    expect(multiReq.scope).toBe('multi_scene');
    expect(multiReq.anchors.filter((a) => a.kind === 'render_element')).toEqual([
      { kind: 'render_element', id: 'EL_S01_JUNCTION' },
    ]);
    expect(multiReq.anchors.filter((a) => a.kind === 'clip')).toHaveLength(7);
    expect(multiReq.anchors.find((a) => a.kind === 'time_range')).toEqual({
      kind: 'time_range',
      start_ms: 0,
      end_ms: 165000,
    });

    // Clip selection should not emit duplicate clip anchors
    const clipReq = buildRevisionRequest(
      pnBundle,
      [
        {
          kind: 'clip',
          id: 'CL_S02',
          clipId: 'CL_S02',
          start: 15000,
          end: 43000,
          artifact: { artifact_id: 'AM_PN_DEMO', revision: 1 },
        },
      ],
      '整体调亮',
      'RR_CLIP_1',
    );
    expect(clipReq.scope).toBe('local');
    expect(clipReq.anchors.filter((a) => a.kind === 'clip')).toEqual([{ kind: 'clip', id: 'CL_S02' }]);

    // Stale artifact selection must be rejected
    expect(() =>
      buildRevisionRequest(
        pnBundle,
        [{ ...multiSel, artifact: { artifact_id: 'AM_PN_DEMO', revision: 99 } }],
        '旧版本测试',
      ),
    ).toThrow('旧动画版本');
  });

  it('ElementRegistry.hitTest prioritizes exact paint-order DOM hits and falls back to smallest tight bbox', () => {
    const prevComputed = globalThis.getComputedStyle;
    (globalThis as any).getComputedStyle = (node: any) => node._style ?? { display: 'block', visibility: 'visible', opacity: '1' };

    try {
      const makeNode = (rect: { left: number; top: number; width: number; height: number }, style?: any, parent?: any) => ({
        isConnected: true,
        parentElement: parent ?? null,
        _style: style ?? { display: 'block', visibility: 'visible', opacity: '1' },
        getBoundingClientRect: () => ({
          ...rect,
          right: rect.left + rect.width,
          bottom: rect.top + rect.height,
        }),
      });

      const hitList: any[] = [];
      const root = { elementsFromPoint: () => hitList };
      const stage: any = {
        isConnected: true,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500 }),
        getRootNode: () => root,
        contains: (n: any) => Boolean(n && n._inStage),
      };

      const bgNode = Object.assign(makeNode({ left: 100, top: 50, width: 800, height: 400 }, undefined, stage), { _inStage: true });
      const fgNode = Object.assign(makeNode({ left: 450, top: 200, width: 100, height: 100 }, undefined, stage), { _inStage: true });
      const hiddenNode = Object.assign(
        makeNode({ left: 450, top: 200, width: 100, height: 100 }, { display: 'block', visibility: 'visible', opacity: '0' }, stage),
        { _inStage: true },
      );

      const registry = new ElementRegistry(stage);
      registry.register({ id: 'EL_BG', label: '背景容器', meta: { engine: 'vector-scene', className: 'VectorObject<rect>', zIndex: 1 } }, bgNode as any);
      registry.register({ id: 'EL_FG', label: '前景圆', meta: { engine: 'vector-scene', className: 'VectorObject<circle>', zIndex: 5 } }, fgNode as any);
      registry.register({ id: 'EL_HIDDEN', label: '隐藏对象', meta: { engine: 'vector-scene', className: 'VectorObject<circle>', zIndex: 9 } }, hiddenNode as any);

      expect(registry.getVisibleElements().map((v) => v.element.id)).toEqual(['EL_BG', 'EL_FG']);

      // Exact paint-order hit puts fgNode before bgNode
      hitList.splice(0, hitList.length, fgNode, bgNode);
      const exactHits = registry.hitTest(0.5, 0.5);
      expect(exactHits.map((h) => h.element.id)).toEqual(['EL_FG', 'EL_BG']);
      expect(exactHits[0].exact).toBe(true);

      // When elementsFromPoint misses (e.g. thin stroke), bbox fallback prefers smaller inner object
      hitList.splice(0, hitList.length);
      const fallbackHits = registry.hitTest(0.5, 0.5);
      expect(fallbackHits.map((h) => h.element.id)).toEqual(['EL_FG', 'EL_BG']);
      expect(fallbackHits[0].exact).toBe(false);

      // Outside all bounds returns empty
      expect(registry.hitTest(0.02, 0.02)).toEqual([]);
    } finally {
      (globalThis as any).getComputedStyle = prevComputed;
    }
  });
});
