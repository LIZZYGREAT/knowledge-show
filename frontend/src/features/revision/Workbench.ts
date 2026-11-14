import type { AnimationPlayer } from '../../animation/runtime/AnimationPlayer';
import type { AnimationBundle, ArtifactRef } from '../../animation/runtime/BundleTypes';
import { profiles } from '../../animation/styles/profiles';

type Selection = { kind: 'scene' | 'clip' | 'render_element'; id: string; clipId: string; start: number; end: number; artifact: ArtifactRef; label?: string };
type Bridge = AnimationPlayer & { bundle: AnimationBundle };
const el = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const frame = el('frame'), stage = el('stage'), iframe = el<HTMLIFrameElement>('player');
const overlay = el('selectionOverlay'), status = el('statusMessage'), input = el('chatInput');
el<HTMLSelectElement>('styleSelect').replaceChildren(...profiles.map(profile => new Option(profile.name, profile.id)));
const params = new URLSearchParams(location.search);
const projectId = params.get('project_id');
let bundle: AnimationBundle, bridge: Bridge | undefined, selected: Selection | null = null;
let time = 0, viewStart = 0, viewEnd = 165000, mode = 'scene', playing = false;
let unsubscribe: (() => void) | undefined, resize: ResizeObserver | undefined;
let revisionHistory: { ref: ArtifactRef; projectRevision: number }[] = [];
const chips = new Map<string, Selection>();
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const ref = () => ({ artifact_id: bundle.manifest.artifact_id, revision: bundle.manifest.revision });
const sameRef = (a: ArtifactRef, b: ArtifactRef) => a.artifact_id === b.artifact_id && a.revision === b.revision;
async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? '请求暂时无法完成。'); return body;
}
function message(text: string) { const node = document.createElement('div'); node.className = 'msg ai'; node.textContent = text; el('statusMessage').textContent = text; document.querySelector('.msgs')!.append(node); }
function fit() {
  const width = Math.max(160, stage.clientWidth - (innerWidth < 760 ? 24 : 64));
  const height = Math.min(width * 9 / 16, Math.max(100, stage.clientHeight - 90));
  frame.style.width = `${height * 16 / 9}px`; frame.style.height = `${height}px`; updateOverlay(); updateHead();
}
function updateOverlay() {
  const bounds = selected?.kind === 'render_element' && bridge && sameRef(selected.artifact, ref()) ? bridge.getElementBounds(selected.id) : null;
  overlay.style.display = bounds ? 'block' : 'none';
  if (bounds) { overlay.style.left = `${bounds.x * 100}%`; overlay.style.top = `${bounds.y * 100}%`; overlay.style.width = `${bounds.width * 100}%`; overlay.style.height = `${bounds.height * 100}%`; }
}
function updateHead() {
  const lane = document.querySelector('.lane'); if (!lane) return;
  const box = lane.getBoundingClientRect(), wrap = document.querySelector('.tracks-wrap')!.getBoundingClientRect();
  const x = box.left - wrap.left + Math.max(0, Math.min(1, (time - viewStart) / (viewEnd - viewStart))) * box.width;
  for (const id of ['playhead', 'playline']) { el(id).style.left = `${x}px`; el(id).style.top = id === 'playhead' ? '0' : '10px'; el(id).style.bottom = '10px'; }
}
async function seek(ms: number) {
  try { await bridge!.seekAndWaitForFrame(ms); updateOverlay(); } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) message(String(e)); }
}
function choose(selection: Selection) {
  selected = selection;
  document.querySelectorAll('.clip').forEach(node => node.classList.toggle('sel', (node as HTMLElement).dataset.id === selection.id));
  void seek(selection.start);
}
function addLane(label: string) {
  const track = document.createElement('div'); track.className = 'track';
  const name = document.createElement('div'); name.className = 'tlabel'; name.textContent = label;
  const lane = document.createElement('div'); lane.className = 'lane';
  track.append(name, lane); el('tracks').append(track); return lane;
}
function addClip(lane: HTMLElement, label: string, selection: Selection, index: number) {
  const start = Math.max(selection.start, viewStart), end = Math.min(selection.end, viewEnd); if (end <= start) return;
  const button = document.createElement('button'); button.className = 'clip'; button.dataset.id = selection.id;
  button.dataset.startMs = String(selection.start); button.dataset.endMs = String(selection.end);
  button.textContent = label; button.title = `${label} ${fmt(selection.start)}–${fmt(selection.end)}`;
  button.style.left = `${(start - viewStart) / (viewEnd - viewStart) * 100}%`; button.style.width = `${(end - start) / (viewEnd - viewStart) * 100}%`;
  button.style.background = ['#d6e7cf', '#ccdbe8', '#ecd8b5'][index % 3];
  selection = { ...selection, label };
  button.draggable = true;
  button.onclick = event => { event.stopPropagation(); choose(selection); };
  button.ondblclick = () => { viewStart = selection.start; viewEnd = selection.end; rebuild(); };
  button.ondragstart = event => { event.dataTransfer!.setData('application/x-animation-selection', JSON.stringify(selection)); choose(selection); };
  lane.append(button);
}
function rebuild() {
  if (!bundle) return;
  el('tracks').replaceChildren(); el('ruler').replaceChildren();
  for (let i = 0; i <= 8; i++) { const tick = document.createElement('span'); tick.style.left = `${i * 12.5}%`; tick.textContent = fmt(viewStart + (viewEnd - viewStart) * i / 8); el('ruler').append(tick); }
  if (mode === 'scene') {
    const scenes = addLane('场景'), clips = addLane('片段');
    bundle.script.scenes.forEach((scene, i) => {
      const clip = bundle.manifest.clips.find(c => c.scene_id === scene.scene_id)!;
      addClip(scenes, `${scene.scene_id} · ${scene.objective.slice(0, 20)}`, { kind: 'scene', id: scene.scene_id, clipId: clip.clip_id, start: scene.start_ms, end: scene.start_ms + scene.duration_ms, artifact: ref() }, i);
    });
    bundle.manifest.clips.forEach((clip, i) => addClip(clips, bundle.script.scenes.find(s => s.scene_id === clip.scene_id)!.objective.slice(0, 20), { kind: 'clip', id: clip.clip_id, clipId: clip.clip_id, start: clip.start_ms, end: clip.start_ms + clip.duration_ms, artifact: ref() }, i + 1));
  } else {
    const metadata = new Map(bridge!.getSelectableElements().map(e => [e.id, e.label]));
    for (const resource of Object.values(bundle.resources)) for (const object of resource.objects ?? []) metadata.set(object.id, object.label);
    for (const [id, label] of Object.entries({EL_S01_JUNCTION:'结本体',EL_S01_CARRIERS:'载流子群',EL_S01_METER:'电流仪表',EL_PN_FIXED_IONS:'固定离子',EL_PN_BARRIER:'势垒地形',EL_PN_FIELD:'内建电场',EL_PN_WAVES:'输入与输出波形'})) metadata.set(id, label);
    bundle.manifest.selectable_elements.forEach((element, index) => {
      const lane = addLane(element.source_ref?.kind === 'timed_text' ? '文字' : '对象');
      for (const clip of bundle.manifest.clips) {
        const scene = bundle.script.scenes.find(s => s.scene_id === clip.scene_id)!;
        const resource = bundle.resources[clip.resource_ref];
        const object = resource.objects?.find(o => o.id === element.id);
        if (resource.kind === 'vector-scene' && !object) continue;
        const text = scene.timed_text.find(t => t.id === element.id);
        if (element.source_ref?.kind === 'timed_text' && !text) continue;
        if (['EL_PN_FIXED_IONS', 'EL_PN_BARRIER', 'EL_PN_FIELD'].includes(element.id) && scene.scene_id === 'S01' || element.id === 'EL_PN_WAVES' && scene.scene_id !== 'S06') continue;
        const from = text?.offset_ms ?? (object ? object.keyframes.find(f => f.opacity > 0)?.time_ms ?? 0 :scene.scene_id === 'S02' && element.id === 'EL_PN_BARRIER' ? 14500 : scene.scene_id === 'S02' && ['EL_PN_FIXED_IONS', 'EL_PN_FIELD'].includes(element.id) ? 6500 : 0);
        const start = Math.max(clip.start_ms, scene.start_ms + from), end = text ? start + text.duration_ms : clip.start_ms + clip.duration_ms;
        addClip(lane, text?.text ?? metadata.get(element.id) ?? element.id, { kind: 'render_element', id: element.id, clipId: clip.clip_id, start, end, artifact: ref() }, index);
      }
    });
  }
  const total = bundle.manifest.total_duration_ms;
  el('hscroll').classList.toggle('off', viewEnd - viewStart >= total);
  el('hthumb').style.left = `${viewStart / total * 100}%`;
  el('hthumb').style.width = `${(viewEnd - viewStart) / total * 100}%`;
  el('editChip').style.display = viewEnd - viewStart < total ? 'flex' : 'none';
  el('editName').textContent = `${fmt(viewStart)}–${fmt(viewEnd)}`;
  updateHead();
}
function addChip(selection: Selection) {
  const token = crypto.randomUUID(); chips.set(token, structuredClone(selection));
  const chip = document.createElement('span'); chip.className = 'chip'; chip.contentEditable = 'false'; chip.dataset.token = token;
  chip.textContent = `${selection.kind === 'render_element' ? '对象' : '片段'} · ${selection.label ?? selection.id}`;
  const close = document.createElement('i'); close.className = 'x'; close.textContent = '×'; close.onclick = () => { chip.remove(); chips.delete(token); };
  chip.append(close); input.append(chip, document.createTextNode(' ')); input.focus();
}
function requestFor(text: string) {
  const selections = [...input.querySelectorAll<HTMLElement>('.chip')].map(c => chips.get(c.dataset.token!)!).filter(Boolean);
  if (!selections.length && selected) selections.push(selected);
  if (selections.some(s => !sameRef(s.artifact, ref()))) throw new Error('选择来自旧动画版本，请重新选择后提交。');
  return { project_id: bundle.manifest.project_id, request_id: `RR_${crypto.randomUUID().replaceAll('-', '')}`, base_project_revision: bundle.projectRevision, source: 'user', target_layer: 'animation', target_artifact: { kind: 'animation_manifest', ...ref() },
    anchors: selections.flatMap(s => [{ kind: s.kind, id: s.id }, { kind: 'clip', id: s.clipId }, { kind: 'time_range', start_ms: Math.floor(s.start), end_ms: Math.ceil(s.end) }]), scope: selections.length ? 'local' : 'unknown', problem: text, desired_change: text, original_user_feedback: text,
    preserve: ['保持脚本知识事实与事件时间', '保持未选中片段及逻辑对象身份'] };
}
async function submit() {
  const clone = input.cloneNode(true) as HTMLElement; clone.querySelectorAll('.chip').forEach(c => c.remove()); const text = clone.innerText.trim();
  if (!text) return;
  try {
    const request = requestFor(text);
    if (!projectId) { message('固定样片模式：请求已构造；真实修订需打开一个已发布的创作项目。'); (window as any).lastRevisionRequest = request; return; }
    el<HTMLButtonElement>('sendRevision').disabled = true;
    const result = await api(`/api/projects/${projectId}/animations/revise`, { method: 'POST', body: JSON.stringify({ request, ...(el<HTMLInputElement>('revisionApiKey').value ? { api_key: el<HTMLInputElement>('revisionApiKey').value } : {}) }) });
    if (result.status === 'upstream_required') { message(result.message); return; }
    revisionHistory.push({ ref: ref(), projectRevision: bundle.projectRevision });
    message('新动画版本已完成检查；旧版本仍可回退。'); input.replaceChildren(); chips.clear(); selected = null;
    await openVersion(result.artifact_ref);
  } catch (e) { message((e as Error).message); } finally { el<HTMLButtonElement>('sendRevision').disabled = false; el<HTMLInputElement>('revisionApiKey').value = ''; }
}
async function openVersion(artifact?: ArtifactRef) {
  bridge?.pause(); unsubscribe?.(); bridge = undefined;
  const style = el<HTMLSelectElement>('styleSelect').value;
  if (projectId) {
    const ready = await api(`/api/projects/${projectId}/preview`);
    if (ready.status !== 'ready' && !artifact) throw new Error(ready.message ?? '动画预览尚未就绪。');
    const target = artifact ?? ready.artifact_ref;
    iframe.src = `/animation-render.html?bundle=${encodeURIComponent(`/api/projects/${projectId}/animations/${target.artifact_id}/r${target.revision}/bundle`)}`;
  } else iframe.src = `/animation-render.html?demo=pn&style=${style}`;
  el('load').style.display = 'grid';
}
function connect() {
  const api = (iframe.contentWindow as Window & { animationBridge?: Bridge })?.animationBridge; if (!api || bridge === api) return;
  bridge = api; bundle = api.bundle; selected = null; overlay.style.display = 'none';
  time = 0; viewStart = 0; viewEnd = bundle.manifest.total_duration_ms;
  el('load').style.display = 'none'; el('durBadge').textContent = fmt(viewEnd);
  el('versionBadge').textContent = `${projectId ? '已发布动画' : '固定 PN 样片'} · r${bundle.manifest.revision}`;
  el('stageFoot').textContent = `${bundle.script.core_message.slice(0, 50)}`;
  el<HTMLSelectElement>('styleSelect').value = Object.values(bundle.resources)[0].style.id;
  unsubscribe = api.subscribe((next, active) => { time = next; playing = active; el('curTime').textContent = `${fmt(time)} / ${fmt(bundle.manifest.total_duration_ms)}`; el('playBtn').textContent = active ? '❚❚' : '▶'; el('playBtn').setAttribute('aria-label', active ? '暂停' : '播放'); updateHead(); updateOverlay(); });
  rebuild(); fit();
}
window.addEventListener('message', event => { if (event.origin === location.origin && event.source === iframe.contentWindow && event.data?.type === 'animation-ready') connect();
  if (event.origin === location.origin && event.source === iframe.contentWindow && event.data?.type === 'animation-error') el('load').textContent = '动画资源无法加载，请刷新项目状态后重试。'; });
iframe.onload = connect;
el('playBtn').onclick = () => { if (bridge) playing ? bridge.pause() : bridge.play(); };
for (const [id, value] of [['tabScene', 'scene'], ['tabAnim', 'anim']]) el(id).onclick = () => { mode = value; el('tabScene').classList.toggle('on', mode === 'scene'); el('tabAnim').classList.toggle('on', mode === 'anim'); rebuild(); };
const at = (x: number) => { const box = document.querySelector('.lane')?.getBoundingClientRect() ?? el('ruler').getBoundingClientRect(); return viewStart + Math.max(0, Math.min(1, (x - box.left) / box.width)) * (viewEnd - viewStart); };
let dragging = false;
for (const target of [el('ruler'), el('playhead'), document.querySelector('.tracks-wrap')! as HTMLElement]) {
  target.addEventListener('pointerdown', event => { if ((event.target as HTMLElement).closest('.clip')) return; dragging = true; target.setPointerCapture(event.pointerId); void seek(at(event.clientX)); });
  target.addEventListener('pointermove', event => { if (dragging) void seek(at(event.clientX)); });
  target.addEventListener('pointerup', () => { dragging = false; }); target.addEventListener('pointercancel', () => { dragging = false; });
}
document.querySelector('.timeline')!.addEventListener('wheel', ((event: WheelEvent) => {
  event.preventDefault(); if (!bundle) return;
  const total = bundle.manifest.total_duration_ms, span = viewEnd - viewStart;
  if (event.shiftKey) { viewStart = Math.max(0, Math.min(total - span, viewStart + event.deltaY * span / 1000)); viewEnd = viewStart + span; }
  else { const center = at(event.clientX); const next = Math.max(1000, Math.min(total, span * (event.deltaY > 0 ? 1.18 : .85))); viewStart = Math.max(0, Math.min(total - next, center - next / 2)); viewEnd = viewStart + next; }
  rebuild();
}) as EventListener, { passive: false });
el('editChip').onclick = () => { viewStart = 0; viewEnd = bundle.manifest.total_duration_ms; rebuild(); };
let scrollOrigin = 0, scrollStart = 0;
el('hscroll').onpointerdown = event => {
  scrollOrigin = event.clientX; scrollStart = viewStart; el('hscroll').setPointerCapture(event.pointerId);
};
el('hscroll').onpointermove = event => {
  if (!el('hscroll').hasPointerCapture(event.pointerId) || !bundle) return;
  const total = bundle.manifest.total_duration_ms, span = viewEnd - viewStart;
  viewStart = Math.max(0, Math.min(total - span, scrollStart + (event.clientX - scrollOrigin) / el('hscroll').clientWidth * total));
  viewEnd = viewStart + span; rebuild();
};
input.ondragover = e => { e.preventDefault(); input.classList.add('drop'); };
input.ondragleave = () => input.classList.remove('drop');
input.ondrop = event => { event.preventDefault(); input.classList.remove('drop'); const value = event.dataTransfer?.getData('application/x-animation-selection'); if (value) { try { addChip(JSON.parse(value)); } catch { message('无法读取该对象引用。'); } } };
input.onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } };
input.onpaste = event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? ''); };
el('sendRevision').onclick = () => void submit();
el('saveRequest').onclick = () => { try { const request = requestFor(input.innerText.trim() || '请调整选中对象'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(request, null, 2)], { type: 'application/json' })); a.download = `${request.request_id}.json`; a.click(); URL.revokeObjectURL(a.href); } catch (e) { message(String(e)); } };
el('rollback').onclick = async () => {
  if (!projectId) { message('固定样片未发布项目版本。'); return; }
  try {
    const history = await api(`/api/projects/${projectId}/animations/versions`);
    const previous = revisionHistory.at(-1)?.ref ?? history.versions.filter((r: ArtifactRef) => r.revision < ref().revision).at(-1);
    if (!previous) { message('当前没有可回退的修订版本。'); return; }
    const result = await api(`/api/projects/${projectId}/animations/activate`, { method: 'POST', body: JSON.stringify({ artifact_ref: previous, expected_project_revision: bundle.projectRevision }) });
    revisionHistory.pop(); await openVersion(result.artifact_ref);
  } catch (error) { message((error as Error).message); }
};
el('exportVideo').onclick = async () => { if (!projectId) { message('固定样片请先通过本地验收入口发布为项目，再导出实际文件。'); return; } try { const result = await api(`/api/projects/${projectId}/animations/export`, { method: 'POST', body: JSON.stringify({ artifact_ref: ref() }) }); const poll = async () => { const state = await api(`/api/projects/${projectId}/animations/exports/${result.export_id}`); status.textContent = state.status === 'completed' ? '视频已编码完成，可以下载。' : `正在渲染视频：${state.rendered_frames ?? 0} 帧`; if (state.status === 'completed') { const a = document.createElement('a'); a.href = state.download_url; a.textContent = '下载 MP4'; status.append(' ', a); } else if (state.status === 'failed') message(state.message); else window.setTimeout(() => void poll().catch(e => message(String(e))), 1200); }; void poll(); } catch (e) { message(String(e)); } };
el<HTMLSelectElement>('styleSelect').onchange = async () => {
  if (!projectId) { await openVersion(); return; }
  const selector = el<HTMLSelectElement>('styleSelect');
  selector.disabled = true;
  const previous = ref();
  try {
    const result = await api(`/api/projects/${projectId}/animations`, { method: 'POST', body: JSON.stringify({ expected_project_revision: bundle.projectRevision, style_id: selector.value, ...(el<HTMLInputElement>('revisionApiKey').value ? { api_key: el<HTMLInputElement>('revisionApiKey').value } : {}) }) });
    message('正在制作新的全片美术版本，当前版本仍可播放。');
    let state;
    do {
      await new Promise(resolve => setTimeout(resolve, 1200));
      state = await api(`/api/projects/${projectId}/animations/jobs/${result.job_id}`);
    } while (['queued', 'running'].includes(state.status));
    if (state.status !== 'completed') throw new Error(state.message);
    revisionHistory.push({ ref: previous, projectRevision: bundle.projectRevision });
    await openVersion(state.artifact_ref);
  } catch (error) {
    message((error as Error).message); selector.value = Object.values(bundle.resources)[0].style.id;
  } finally { selector.disabled = false; el<HTMLInputElement>('revisionApiKey').value = ''; }
};
window.addEventListener('keydown', e => { if ((e.target as HTMLElement).isContentEditable || ['INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName)) return; if (e.code === 'Space') { e.preventDefault(); el('playBtn').click(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') void seek(time + (e.key === 'ArrowLeft' ? -1000 : 1000)); });
resize = new ResizeObserver(fit); resize.observe(stage);
window.addEventListener('pagehide', () => { unsubscribe?.(); resize?.disconnect(); });
(window as any).workbench = { seek, getBundle: () => bundle, getSelection: () => selected, addChip, requestFor };
void openVersion().catch(error => { el('load').textContent = (error as Error).message; });
