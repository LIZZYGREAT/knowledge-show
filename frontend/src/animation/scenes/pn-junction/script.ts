import productionScript from '../../../../../docs/work/backend/script/trials/case2-pn-v2/production-script.json';
export const scriptRef = { artifact_id: productionScript.artifact_id, revision: productionScript.revision };
export const s01Script = productionScript.scenes[0];
if (s01Script.scene_id !== 'S01' || s01Script.start_ms !== 0 || s01Script.duration_ms !== 15000) {
  throw new Error('PN S01 fixture changed; review the scene before using this script');
}
