import original from '../../../../../docs/work/backend/script/trials/case2-pn-v2/production-script.json';
import { resolveStyle } from '../../styles/resolveStyle';
import type { AnimationBundle, ProductionScript } from '../../runtime/BundleTypes';
export function demoBundle(style = 'precision-science', revision = 1): AnimationBundle {
  const script = original as ProductionScript;
  const resources: AnimationBundle['resources'] = {};
  const elements = [{ id: 'EL_S01_JUNCTION' }, { id: 'EL_S01_CARRIERS' }, { id: 'EL_S01_METER' }, { id: 'EL_PN_FIXED_IONS' }, { id: 'EL_PN_BARRIER' }, { id: 'EL_PN_FIELD' }, { id: 'EL_PN_WAVES' }];
  const clips = script.scenes.map(scene => {
    const ref = `demo-pn/${style}/${scene.scene_id}-r${scene.scene_id === 'S02' ? revision : 1}.json`;
    resources[ref] = { kind: 'pn-scene', sceneId: scene.scene_id, style: resolveStyle(style), parameters: { speed: scene.scene_id === 'S02' && revision > 1 ? .5 : 1 } };
    return { clip_id: `CL_${scene.scene_id}`, scene_id: scene.scene_id, start_ms: scene.start_ms, duration_ms: scene.duration_ms, resource_ref: ref,
      script_event_refs: scene.events.map(e => e.id), internal_events: scene.events.map(e => ({ id: `IE_${e.id}`, offset_ms: e.offset_ms, description: e.description, script_event_refs: [e.id] })) };
  });
  return { script, projectRevision: 1, resources, manifest: { project_id: script.project_id, artifact_id: 'AM_PN_DEMO', revision, brief_revision: script.brief_revision,
    production_script_ref: { artifact_id: script.artifact_id, revision: script.revision }, total_duration_ms: script.total_duration_ms,
    preview_ref: `demo-pn/${style}/preview-r${revision}.json`, clips,
    selectable_elements: [...elements, ...script.scenes.flatMap(s => s.timed_text.map(t => ({ id: t.id, source_ref: { kind: 'timed_text' as const, id: t.id } })))] } };
}
