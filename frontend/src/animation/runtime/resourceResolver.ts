import type { AnimationBundle, SceneResource } from './BundleTypes';
import type { SceneDefinition, SceneHandle, SelectableElement } from './SceneTypes';
import { createPnS01 } from '../scenes/pn-junction/S01';
import { createPnScene } from '../scenes/pn-junction/PnScenes';
import { createVectorScene } from './VectorScene';

export { validateBundle } from './validateBundle';
import { validateBundle } from './validateBundle';
export function createSequence(bundle: AnimationBundle): SceneDefinition {
  validateBundle(bundle);
  return { sceneId: bundle.manifest.artifact_id, durationMs: bundle.manifest.total_duration_ms, mount(host) {
    let active: SceneHandle | null = null, reference = '', destroyed = false;
    const registered = new Map<string, SelectableElement>();
    const make = (resource: SceneResource, sceneId: string) => {
      const scene = bundle.script.scenes.find(s => s.scene_id === sceneId)!;
      if (resource.kind === 'vector-scene') return createVectorScene(scene, resource);
      return sceneId === 'S01' ? createPnS01(resource.style, resource.parameters.speed, resource.parameters.particleScale, resource.parameters.particleOpacity) : createPnScene(scene, resource.style, resource.parameters.speed, resource.parameters.particleScale, resource.parameters.particleOpacity);
    };
    // Obtain metadata from the manifest; labels are populated by mounted handles.
    for (const e of bundle.manifest.selectable_elements) registered.set(e.id, { id: e.id, label: e.id, ...(e.source_ref ? { sourceRef: e.source_ref } : {}) });
    return {
      seek(ms) {
        if (destroyed) throw new Error('Sequence destroyed');
        const time = Math.max(0, Math.min(bundle.manifest.total_duration_ms, ms));
        const clips = bundle.manifest.clips;
        const clip = clips.find(c => time >= c.start_ms && time < c.start_ms + c.duration_ms) ?? clips[clips.length - 1];
        if (reference !== clip.resource_ref) {
          const next = make(bundle.resources[clip.resource_ref], clip.scene_id).mount(host);
          active?.destroy(); active = next; reference = clip.resource_ref;
          for (const e of active.getSelectableElements()) registered.set(e.id, e);
        }
        const scene = bundle.script.scenes.find(s => s.scene_id === clip.scene_id)!;
        active!.seek(time - scene.start_ms);
      },
      getSelectableElements: () => [...registered.values()],
      getElementBounds: id => active?.getElementBounds(id) ?? null,
      destroy() { if (!destroyed) { destroyed = true; active?.destroy(); active = null; } },
    };
  } };
}
