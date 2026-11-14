import type { SceneDefinition } from './SceneTypes';
import type { ScriptScene, SceneResource } from './BundleTypes';
import { interpolate } from './interpolate';
import { ElementRegistry } from './ElementRegistry';
import { applyMaterial, svgNode } from './styleMaterial';
export function createVectorScene(scene: ScriptScene, resource: SceneResource): SceneDefinition {
  return { sceneId: scene.scene_id, durationMs: scene.duration_ms, mount(host) {
    const outer = document.createElement('div'); outer.style.cssText = 'display:block;width:100%;aspect-ratio:16/9'; host.append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const svg = svgNode('svg', { viewBox: '0 0 1600 900' });
    svg.style.cssText = `display:block;width:100%;aspect-ratio:16/9;background:${resource.style.palette.background};font-family:${resource.style.typography.body}`; root.append(svg);
    const defs = svgNode('defs'); svg.append(defs);
    const registry = new ElementRegistry(svg);
    // Each mount has its own ShadowRoot; stable IDs also isolate objects and scene defs.
    const nodes = [...(resource.objects ?? [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map(object => {
      const group = svgNode('g', { 'data-element-id': object.id });
      const el = svgNode(object.shape);
      applyMaterial(defs, el, object, `${scene.scene_id}-${object.id}`);
      if (object.stroke) el.setAttribute('stroke', object.stroke);
      el.setAttribute('stroke-width', String(object.strokeWidth ?? 1));
      el.setAttribute('stroke-linecap', object.lineCap ?? 'butt');
      el.setAttribute('fill-opacity', String(object.fillOpacity ?? 1));
      if (object.shape === 'circle') el.setAttribute('r', String(object.radius ?? 20));
      if (object.shape === 'rect') { el.setAttribute('width', String(object.width ?? 100)); el.setAttribute('height', String(object.height ?? 100)); el.setAttribute('rx', String(object.cornerRadius ?? 8)); }
      if (object.shape === 'path') {
        el.setAttribute('d', object.path ?? '');
        if (object.keyframes.some(f => f.drawProgress !== undefined)) { el.setAttribute('pathLength', '1'); el.setAttribute('stroke-dasharray', '1'); }
      }
      if (object.shape === 'text') {
        el.setAttribute('font-size', String(object.fontSize ?? 32)); el.setAttribute('font-weight', String(object.fontWeight ?? 400));
        el.setAttribute('text-anchor', object.textAnchor ?? 'start');
        el.setAttribute('font-family', object.fontSize && object.fontSize >= 48 ? resource.style.typography.display : resource.style.typography.body);
        for (const [index, line] of (object.text ?? '').split('\n').entries()) {
          const span = svgNode('tspan', { x: 0, dy: index ? '1.3em' : 0 }); span.textContent = line; el.append(span);
        }
      }
      group.append(el); svg.append(group);
      const timed = scene.timed_text.find(t => t.id === object.id);
      registry.register({ id: object.id, label: object.label, ...(timed ? { sourceRef: { kind: 'timed_text' as const, id: timed.id } } : {}) }, group);
      return { object, group, el, timed };
    });
    return {
      seek(ms) {
        for (const { object, group, el, timed } of nodes) {
          const state = interpolate(object.keyframes, ms);
          group.setAttribute('transform', `translate(${state.x} ${state.y}) rotate(${state.rotation}) scale(${state.scale})`);
          if (object.shape === 'path' && el.hasAttribute('pathLength')) el.setAttribute('stroke-dashoffset', String(1 - state.drawProgress));
          const visible = !timed || ms >= timed.offset_ms && ms < timed.offset_ms + timed.duration_ms;
          group.setAttribute('opacity', String(visible ? state.opacity : 0));
        }
        svg.dataset.timeMs = String(ms);
      },
      getSelectableElements: () => registry.getElements(), getElementBounds: id => registry.getBounds(id), destroy: () => outer.remove(),
    };
  } };
}
