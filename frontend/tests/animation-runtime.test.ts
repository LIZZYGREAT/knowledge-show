import { describe, expect, it } from 'vitest';
import { pnState } from '../src/animation/scenes/pn-junction/PnScenes';
import { demoBundle } from '../src/animation/scenes/pn-junction/demoBundle';
import { validateBundle } from '../src/animation/runtime/validateBundle';
import { resolveStyle } from '../src/animation/styles/resolveStyle';

describe('PN mechanisms and script anchors', () => {
  it('builds the field before the barrier and starts forward flow at the exact anchor', () => {
    expect(pnState('S02', 5000).field).toBe(0);
    expect(pnState('S02', 13000).field).toBe(1);
    expect(pnState('S02', 13000).height).toBe(0);
    expect(pnState('S02', 22000).height).toBe(135);
    expect(pnState('S03', 17999).flow).toBe(0);
    expect(pnState('S03', 18000).flow).toBeGreaterThan(.9);
    expect(pnState('S04', 16000).height).toBe(220);
    expect(pnState('S04', 24000).flow).toBeGreaterThan(0);
    expect(pnState('S04', 24000).flow).toBeLessThan(.04);
    expect(pnState('S07', 6000).flow).toBe(0);
    expect(pnState('S07', 6000).battery).toBe(false);
  });
});
describe('manifest validation and independent art', () => {
  it('requires full contiguous coverage and exact source versions', () => {
    const bundle = demoBundle(); expect(validateBundle(bundle)).toBe(bundle);
    const gap = structuredClone(bundle); gap.manifest.clips[1].start_ms++;
    expect(() => validateBundle(gap)).toThrow();
    const stale = structuredClone(bundle); stale.manifest.production_script_ref.revision++;
    expect(() => validateBundle(stale)).toThrow();
    const missing = structuredClone(bundle); delete missing.resources[missing.manifest.clips[1].resource_ref];
    expect(() => validateBundle(missing)).toThrow();
  });
  it('has four distinct profiles and honors explicit selection', () => {
    const ids = ['precision-science', 'paper-editorial', 'modern-graphic', 'narrative-collage'];
    expect(new Set(ids.map(id => resolveStyle(id).palette.background)).size).toBe(4);
    expect(resolveStyle('auto').id).toBe('precision-science');
    expect(() => resolveStyle('not-a-style')).toThrow();
  });
});

import soap from './fixtures/soap-style-lab/style-paper-editorial.json';
import type { AnimationBundle } from '../src/animation/runtime/BundleTypes';
it('loads styled vectors and rejects unrecognized materials or unsafe paint', () => {
  const bundle = structuredClone(soap) as AnimationBundle;
  expect(validateBundle(bundle)).toBe(bundle);
  const object = Object.values(bundle.resources)[0].objects![0];
  (object as any).materialKey = 'unknown';
  expect(() => validateBundle(bundle)).toThrow();
  object.materialKey = 'flat'; object.stroke = 'url(https://invalid)';
  expect(() => validateBundle(bundle)).toThrow();
});

import { ease, interpolate } from '../src/animation/runtime/interpolate';
it('uses outgoing easing with deterministic path drawing and legacy defaults', () => {
  expect(ease(.25)).toBe(.15625);
  const frames = [{ time_ms:0,x:0,y:0,opacity:1,scale:1,rotation:0,drawProgress:0,easing:'ease-out-cubic' as const },{time_ms:1000,x:100,y:0,opacity:1,scale:1,rotation:0,drawProgress:1}];
  expect(interpolate(frames,500).x).toBe(87.5);
  expect(interpolate(frames,500).drawProgress).toBe(.875);
  expect(interpolate(frames,1000).x).toBe(100);
  expect(interpolate(frames,-100).drawProgress).toBe(0);
  const legacy = frames.map(({easing,drawProgress,...f}) => f);
  expect(interpolate(legacy,250).x).toBe(15.625);
  expect(interpolate(legacy,250).drawProgress).toBe(1);
});
it('rejects non-finite coordinates hidden in SVG path exponents', () => {
  const bundle = structuredClone(soap) as AnimationBundle;
  Object.values(bundle.resources)[0].objects!.find(o => o.shape === 'path')!.path = 'M1e999 0L10 10Z';
  expect(() => validateBundle(bundle)).toThrow('有限');
});
