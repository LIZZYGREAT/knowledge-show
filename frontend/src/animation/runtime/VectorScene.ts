import type { SceneDefinition } from './SceneTypes';
import type { ScriptScene, SceneResource } from './BundleTypes';
import { ElementRegistry } from './ElementRegistry';
export function createVectorScene(scene: ScriptScene, resource: SceneResource): SceneDefinition {
  return { sceneId: scene.scene_id, durationMs: scene.duration_ms, mount(host) {
    const outer = document.createElement('div'); outer.style.cssText = 'display:block;width:100%;aspect-ratio:16/9'; host.append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 1600 900');
    svg.style.cssText = `display:block;width:100%;aspect-ratio:16/9;background:${resource.style.palette.background};font-family:${resource.style.typography.body}`; root.append(svg);
    const registry = new ElementRegistry(svg);
    const nodes = (resource.objects ?? []).map(object => {
      const group = document.createElementNS(svg.namespaceURI, 'g') as SVGGElement;
      const el = document.createElementNS(svg.namespaceURI, object.shape) as SVGGraphicsElement;
      el.setAttribute('fill', object.fill);
      if (object.shape === 'circle') el.setAttribute('r', String(object.radius ?? 20));
      if (object.shape === 'rect') { el.setAttribute('width', String(object.width ?? 100)); el.setAttribute('height', String(object.height ?? 100)); el.setAttribute('rx', '8'); }
      if (object.shape === 'path') el.setAttribute('d', object.path ?? '');
      if (object.shape === 'text') { el.textContent = object.text ?? ''; el.setAttribute('font-size', '32'); }
      group.append(el); svg.append(group);
      const timed = scene.timed_text.find(t => t.id === object.id);
      registry.register({ id: object.id, label: object.label, ...(timed ? { sourceRef: { kind: 'timed_text' as const, id: timed.id } } : {}) }, group);
      return { object, group, timed };
    });
    return {
      seek(ms) {
        for (const { object, group, timed } of nodes) {
          const frames = object.keyframes;
          const right = frames.findIndex(frame => frame.time_ms > ms);
          const a = frames[right === -1 ? frames.length - 1 : Math.max(0, right - 1)];
          const b = frames[right === -1 ? frames.length - 1 : right];
          const u = Math.max(0, Math.min(1, (ms - a.time_ms) / Math.max(1, b.time_ms - a.time_ms)));
          const eased = u * u * (3 - 2 * u);
          const get = (key: 'x' | 'y' | 'opacity' | 'scale' | 'rotation') => a[key] + (b[key] - a[key]) * eased;
          group.setAttribute('transform', `translate(${get('x')} ${get('y')}) rotate(${get('rotation')}) scale(${get('scale')})`);
          const visible = !timed || ms >= timed.offset_ms && ms < timed.offset_ms + timed.duration_ms;
          group.setAttribute('opacity', String(visible ? get('opacity') : 0));
        }
        svg.dataset.timeMs = String(ms);
      },
      getSelectableElements: () => registry.getElements(), getElementBounds: id => registry.getBounds(id), destroy: () => outer.remove(),
    };
  } };
}
