import type { SceneResource, ScriptScene } from './BundleTypes';
const hex = /^#[a-f0-9]{6}$/i;
const finite = (v: unknown, low: number, high: number) => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high;
/** Validate persisted vector data at the loader boundary as well as in Python production. */
export function validateVector(scene: ScriptScene, resource: SceneResource) {
  const objects = resource.objects;
  if (!Array.isArray(objects) || !objects.length || objects.length > 60) throw new Error('无效的场景对象数量。');
  const ids = new Set<string>();
  for (const object of objects) {
    if (!object || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(object.id) || ids.has(object.id)) throw new Error('无效的对象身份。');
    ids.add(object.id);
    if (!['circle', 'rect', 'path', 'text'].includes(object.shape) || !object.label || !hex.test(object.fill)) throw new Error('无效的对象外观。');
    const allowed = new Set(['id','label','shape','x','y','width','height','radius','path','text','fill','keyframes','stroke','strokeWidth','cornerRadius','fillOpacity','lineCap','materialKey','fontSize','fontWeight','textAnchor','zIndex']);
    if (Object.keys(object).some(key => !allowed.has(key))) throw new Error('不支持的对象字段。');
    for (const key of ['x','y','width','height','radius'] as const) if (!finite(object[key] ?? 0, -10000, 10000)) throw new Error('无效的几何。');
    if (object.shape === 'circle' && !(object.radius! > 0) || object.shape === 'rect' && !(object.width! > 0 && object.height! > 0)) throw new Error('无效的对象尺寸。');
    if (object.shape === 'path' && (typeof object.path !== 'string' || object.path.length > 20000 || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+\-]*$/.test(object.path))) throw new Error('无效的路径。');
    if (object.shape === 'text' && (typeof object.text !== 'string' || object.text.length > 500)) throw new Error('无效的文字。');
    if (object.stroke !== undefined && !hex.test(object.stroke)) throw new Error('无效的描边。');
    const tokens = { materialKey: ['flat','paper-layer','frosted','ink-print'], lineCap: ['butt','round','square'], textAnchor: ['start','middle','end'] };
    for (const [key, choices] of Object.entries(tokens)) if (key in object && !choices.includes((object as any)[key])) throw new Error('无效的外观标识。');
    const ranges = { strokeWidth: [0,30], cornerRadius: [0,500], fillOpacity: [0,1], fontSize: [8,160], fontWeight: [100,900], zIndex: [-100,100] };
    for (const [key, [low, high]] of Object.entries(ranges)) if (key in object && !finite((object as any)[key], low, high)) throw new Error('无效的外观参数。');
    if (!Array.isArray(object.keyframes) || object.keyframes.length < 2 || object.keyframes.length > 64) throw new Error('无效的关键帧数量。');
    let previous = -1;
    for (const f of object.keyframes) {
      if (Object.keys(f).some(k => !['time_ms','x','y','opacity','scale','rotation','easing','drawProgress'].includes(k)) || !finite(f.time_ms,0,scene.duration_ms) || f.time_ms <= previous || !finite(f.x,-10000,10000) || !finite(f.y,-10000,10000) || !finite(f.opacity,0,1) || !finite(f.scale,Number.MIN_VALUE,10) || !Number.isFinite(f.rotation)) throw new Error('无效的关键帧。');
      if (f.easing !== undefined && !['smoothstep','linear','ease-in-cubic','ease-out-cubic','ease-in-out-cubic'].includes(f.easing)) throw new Error('无效的运动曲线。');
      if (f.drawProgress !== undefined && (object.shape !== 'path' || !finite(f.drawProgress,0,1))) throw new Error('无效的路径显现。');
      previous = f.time_ms;
    }
    if (object.keyframes[0].time_ms !== 0 || previous !== scene.duration_ms) throw new Error('关键帧未覆盖场景。');
  }
  for (const text of scene.timed_text) if (!objects.some(o => o.id === text.id && o.shape === 'text' && o.text === text.text)) throw new Error('脚本文字丢失。');
}
