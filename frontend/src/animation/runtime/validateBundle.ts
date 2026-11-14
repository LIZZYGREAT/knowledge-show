import type { AnimationBundle } from './BundleTypes';
export function validateBundle(bundle: AnimationBundle) {
  const { manifest: manifest, script, resources } = bundle;
  if (manifest.project_id !== script.project_id || manifest.production_script_ref.artifact_id !== script.artifact_id || manifest.production_script_ref.revision !== script.revision || manifest.total_duration_ms !== script.total_duration_ms) throw new Error('动画和脚本版本或时长不匹配。');
  let cursor = 0; const ids = new Set<string>();
  for (const clip of manifest.clips) {
    const scene = script.scenes.find(s => s.scene_id === clip.scene_id);
    if (!scene || clip.start_ms !== cursor || clip.duration_ms <= 0 || clip.start_ms < scene.start_ms || clip.start_ms + clip.duration_ms > scene.start_ms + scene.duration_ms || ids.has(clip.clip_id) || !resources[clip.resource_ref]) throw new Error('动画片段覆盖或资源引用无效。');
    const resource = resources[clip.resource_ref];
    if (!['pn-scene', 'vector-scene'].includes(resource.kind) || resource.sceneId !== scene.scene_id) throw new Error('当前播放器不支持这个场景资源。');
    if (resource.kind === 'pn-scene' && !/^S0[1-7]$/.test(resource.sceneId)) throw new Error('PN 场景 ID 无效。');
    cursor += clip.duration_ms; ids.add(clip.clip_id);
  }
  if (cursor !== manifest.total_duration_ms) throw new Error('动画未覆盖完整脚本。');
  const elements = manifest.selectable_elements ?? [];
  if (new Set(elements.map(e => e.id)).size !== elements.length) throw new Error('动画元件身份重复。');
  return bundle;
}
