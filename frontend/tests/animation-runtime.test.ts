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
