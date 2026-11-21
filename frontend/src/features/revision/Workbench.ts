import type { AnimationPlayer } from '../../animation/runtime/AnimationPlayer';
import type { AnimationBundle, ArtifactRef } from '../../animation/runtime/BundleTypes';
import type { ElementHit } from '../../animation/runtime/SceneTypes';
import { profiles } from '../../animation/styles/profiles';
import {
  buildRevisionRequest,
  buildSelectionForElement,
  findSpanAtTime,
  formatSpanBadge,
  getContinuousSpans,
  getElementClipSegments,
  manifestRef,
  resolveSelectionForHit,
  sameArtifactRef,
  type Selection,
  type SelectionScopeMode,
} from './selectionModel';

type Bridge = AnimationPlayer & { bundle: AnimationBundle };
const el = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const frame = el('frame');
const stage = el('stage');
const iframe = el<HTMLIFrameElement>('player');
const stagePicker = el('stagePicker');
const hoverOverlay = el('hoverOverlay');
const hoverLabel = el('hoverLabel');
const overlay = el('selectionOverlay');
const selectionBadge = el('selectionBadge');
const selectionBadgeText = el('selectionBadgeText');
const quickAttachBtn = el<HTMLButtonElement>('quickAttachBtn');
const dragGhost = el('dragGhost');
const chatPanel = document.querySelector<HTMLElement>('.chat')!;
const status = el('statusMessage');
const input = el('chatInput');
const objectInspector = el('objectInspector');
const inspectorTitle = el('inspectorTitle');
const inspectorMeta = el('inspectorMeta');
const scopeClipBtn = el<HTMLButtonElement>('scopeClipBtn');
const scopeContinuousBtn = el<HTMLButtonElement>('scopeContinuousBtn');
const scopeMomentBtn = el<HTMLButtonElement>('scopeMomentBtn');
const inspectorAttachBtn = el<HTMLButtonElement>('inspectorAttachBtn');
const inspectorClose = el<HTMLButtonElement>('inspectorClose');
const layerStack = el('layerStack');
const pickModeBtn = el<HTMLButtonElement>('pickModeBtn');

el<HTMLSelectElement>('styleSelect').replaceChildren(...profiles.map((profile) => new Option(profile.name, profile.id)));

const params = new URLSearchParams(location.search);
const projectId = params.get('project_id');
const demoId = params.get('demo') === 'pn' ? 'pn' : 'wem';

let bundle: AnimationBundle;
let bridge: Bridge | undefined;
let selected: Selection | null = null;
let lastPickHits: ElementHit[] = [];
let lastPickPoint: { x: number; y: number } | null = null;
let lastPickIndex = 0;
let pickMode = true;
let time = 0;
let viewStart = 0;
let viewEnd = 165000;
let mode = 'scene';
let playing = false;
let unsubscribe: (() => void) | undefined;
let resize: ResizeObserver | undefined;
let revisionHistory: { ref: ArtifactRef; projectRevision: number }[] = [];
const chips = new Map<string, Selection>();

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const ref = () => manifestRef(bundle);
const sameRef = sameArtifactRef;

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? '请求暂时无法完成。');
  return body;
}

function appendMessage(role: 'ai' | 'me', text: string, who?: string) {
  const node = document.createElement('div');
  node.className = `msg ${role}`;
  if (who) {
    const label = document.createElement('span');
    label.className = 'who';
    label.textContent = who;
    node.append(label);
  }
  node.append(document.createTextNode(text));
  const list = document.querySelector('.msgs')!;
  list.append(node);
  list.scrollTop = list.scrollHeight;
}

function message(text: string) {
  el('statusMessage').textContent = text;
  appendMessage('ai', text, '工作台');
}

function extractPlainInputText() {
  const clone = input.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.chip').forEach((c) => c.remove());
  return clone.innerText.trim();
}

function fit() {
  const width = Math.max(160, stage.clientWidth - (innerWidth < 760 ? 24 : 64));
  const height = Math.min((width * 9) / 16, Math.max(100, stage.clientHeight - 90));
  frame.style.width = `${(height * 16) / 9}px`;
  frame.style.height = `${height}px`;
  updateOverlay();
  updateHead();
}

function syncTimelineSelection() {
  const activeClipIds = new Set(selected?.clipIds?.length ? selected.clipIds : selected ? [selected.clipId] : []);
  document.querySelectorAll<HTMLElement>('.clip').forEach((node) => {
    const sameId = Boolean(selected && node.dataset.id === selected.id);
    const sameClip = Boolean(selected && node.dataset.clipId && activeClipIds.has(node.dataset.clipId));
    node.classList.toggle('sel', sameId && (selected?.kind !== 'render_element' || !node.dataset.clipId || sameClip));
  });
}

function updateOverlay() {
  const bounds =
    selected?.kind === 'render_element' && bridge && sameRef(selected.artifact, ref())
      ? bridge.getElementBounds(selected.id)
      : null;
  overlay.style.display = bounds ? 'block' : 'none';
  if (bounds && selected) {
    overlay.style.left = `${bounds.x * 100}%`;
    overlay.style.top = `${bounds.y * 100}%`;
    overlay.style.width = `${bounds.width * 100}%`;
    overlay.style.height = `${bounds.height * 100}%`;
    const spanText = formatSpanBadge(selected);
    selectionBadgeText.textContent = `${selected.label ?? selected.id}${spanText ? ` · ${spanText}` : ''}`;
    selectionBadge.classList.toggle('flip-inside', bounds.y < 0.09);
  }
}

function hideHover() {
  hoverOverlay.style.display = 'none';
  stagePicker.classList.remove('has-hit');
}

function showHover(hit: ElementHit | null) {
  if (!hit || !bundle) {
    hideHover();
    return;
  }
  const b = hit.bounds;
  hoverOverlay.style.display = 'block';
  hoverOverlay.style.left = `${b.x * 100}%`;
  hoverOverlay.style.top = `${b.y * 100}%`;
  hoverOverlay.style.width = `${b.width * 100}%`;
  hoverOverlay.style.height = `${b.height * 100}%`;

  const spans = getContinuousSpans(bundle, hit.element.id, bridge?.getSelectableElements() ?? []);
  const span = findSpanAtTime(spans, time);
  const spanHint = span && span.clipIds.length > 1 ? ` · 连续${span.clipIds.length}幕` : '';
  const classHint = hit.element.meta?.className ?? hit.element.id;
  hoverLabel.replaceChildren(
    document.createTextNode(`${hit.element.label}${spanHint} `),
    Object.assign(document.createElement('code'), { textContent: classHint }),
  );
  hoverLabel.classList.toggle('flip-inside', b.y < 0.09);
  stagePicker.classList.add('has-hit');
}

function updateInspector() {
  if (!selected || !bundle) {
    objectInspector.classList.remove('on');
    layerStack.classList.remove('on');
    layerStack.replaceChildren();
    return;
  }
  objectInspector.classList.add('on');
  const spanLabel = formatSpanBadge(selected);
  inspectorTitle.textContent = `${selected.kind === 'render_element' ? '已选对象' : '已选片段'} · ${selected.label ?? selected.id}`;
  const binding = selected.className ? `${selected.id} (${selected.className})` : selected.id;
  inspectorMeta.textContent = `${binding} · ${spanLabel} · ${fmt(selected.start)}–${fmt(selected.end)}`;

  const isElement = selected.kind === 'render_element';
  const spans = isElement ? getContinuousSpans(bundle, selected.id, bridge?.getSelectableElements() ?? []) : [];
  const activeSpan = isElement ? findSpanAtTime(spans, selected.pickedAtMs ?? time) : null;
  const canContinuous = Boolean(activeSpan && activeSpan.clipIds.length > 1);

  scopeClipBtn.style.display = isElement ? '' : 'none';
  scopeContinuousBtn.style.display = isElement && canContinuous ? '' : 'none';
  scopeMomentBtn.style.display = isElement ? '' : 'none';

  if (isElement && activeSpan) {
    const activeSeg =
      activeSpan.segments.find((s) => s.clipId === selected!.clipId) ?? activeSpan.segments[0];
    scopeClipBtn.textContent = `当前幕 (${activeSeg.sceneId})`;
    scopeContinuousBtn.textContent = `连续多帧 (${activeSpan.sceneIds[0]}–${activeSpan.sceneIds[activeSpan.sceneIds.length - 1]})`;
    scopeMomentBtn.textContent = `当前时刻 (±2s)`;
    scopeClipBtn.classList.toggle('on', selected.scopeMode === 'clip');
    scopeContinuousBtn.classList.toggle('on', selected.scopeMode === 'continuous');
    scopeMomentBtn.classList.toggle('on', selected.scopeMode === 'moment');
  }

  if (isElement && lastPickHits.length > 1) {
    layerStack.classList.add('on');
    layerStack.replaceChildren(Object.assign(document.createElement('span'), { textContent: '重叠对象:' }));
    lastPickHits.slice(0, 6).forEach((hit, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'layer-pill';
      btn.classList.toggle('on', hit.element.id === selected?.id);
      btn.textContent = hit.element.label;
      btn.title = `${hit.element.id}${hit.element.meta?.className ? ` · ${hit.element.meta.className}` : ''}`;
      btn.onclick = () => {
        lastPickIndex = index;
        const next = resolveSelectionForHit(bundle, hit, time, selected?.scopeMode, bridge?.getSelectableElements() ?? []);
        if (next) choose(next, { shouldSeek: false, keepLayerStack: true });
      };
      layerStack.append(btn);
    });
  } else {
    layerStack.classList.remove('on');
    layerStack.replaceChildren();
  }
}

function updateHead() {
  const lane = document.querySelector('.lane');
  if (!lane) return;
  const box = lane.getBoundingClientRect();
  const wrap = document.querySelector('.tracks-wrap')!.getBoundingClientRect();
  const x = box.left - wrap.left + Math.max(0, Math.min(1, (time - viewStart) / (viewEnd - viewStart))) * box.width;
  for (const id of ['playhead', 'playline']) {
    el(id).style.left = `${x}px`;
    el(id).style.top = id === 'playhead' ? '0' : '10px';
    el(id).style.bottom = '10px';
  }
}

async function seek(ms: number) {
  try {
    await bridge!.seekAndWaitForFrame(ms);
    updateOverlay();
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) message(String(e));
  }
}

function choose(selection: Selection | null, options: { shouldSeek?: boolean; keepLayerStack?: boolean } = {}) {
  const { shouldSeek = true, keepLayerStack = false } = options;
  selected = selection;
  if (!keepLayerStack) {
    lastPickHits = [];
    lastPickPoint = null;
    lastPickIndex = 0;
  }
  syncTimelineSelection();
  updateInspector();
  if (selection && shouldSeek) {
    void seek(selection.start);
  } else {
    updateOverlay();
  }
}

function setScopeMode(nextMode: SelectionScopeMode) {
  if (!selected || selected.kind !== 'render_element' || !bundle) return;
  const runtimeElements = bridge?.getSelectableElements() ?? [];
  const runtimeEl = runtimeElements.find((e) => e.id === selected!.id);
  const rebuilt = buildSelectionForElement(
    bundle,
    {
      id: selected.id,
      label: selected.label ?? selected.id,
      meta: runtimeEl?.meta ?? (selected.className ? { engine: 'vector-scene', className: selected.className } : undefined),
    },
    selected.pickedAtMs ?? time,
    nextMode,
    runtimeElements,
  );
  if (rebuilt) {
    choose(rebuilt, { shouldSeek: false, keepLayerStack: true });
  }
}

function addLane(label: string) {
  const track = document.createElement('div');
  track.className = 'track';
  const name = document.createElement('div');
  name.className = 'tlabel';
  name.textContent = label;
  const lane = document.createElement('div');
  lane.className = 'lane';
  track.append(name, lane);
  el('tracks').append(track);
  return lane;
}

function addClip(lane: HTMLElement, label: string, selection: Selection, index: number) {
  const start = Math.max(selection.start, viewStart);
  const end = Math.min(selection.end, viewEnd);
  if (end <= start) return;
  const button = document.createElement('button');
  button.className = 'clip';
  button.dataset.id = selection.id;
  button.dataset.clipId = selection.clipId;
  button.dataset.startMs = String(selection.start);
  button.dataset.endMs = String(selection.end);
  button.textContent = label;
  button.title = `${label} ${fmt(selection.start)}–${fmt(selection.end)}（拖动可引用到右侧修改框）`;
  button.style.left = `${((start - viewStart) / (viewEnd - viewStart)) * 100}%`;
  button.style.width = `${((end - start) / (viewEnd - viewStart)) * 100}%`;
  button.dataset.tone = String(index % 3);
  const boundSelection: Selection = { ...selection, label };
  button.draggable = true;
  button.onclick = (event) => {
    event.stopPropagation();
    choose(boundSelection, { shouldSeek: true });
  };
  button.ondblclick = () => {
    viewStart = boundSelection.start;
    viewEnd = boundSelection.end;
    rebuild();
  };
  button.ondragstart = (event) => {
    event.dataTransfer!.setData('application/x-animation-selection', JSON.stringify(boundSelection));
    choose(boundSelection, { shouldSeek: false });
  };
  lane.append(button);
}

function rebuild() {
  if (!bundle) return;
  el('tracks').replaceChildren();
  el('ruler').replaceChildren();
  for (let i = 0; i <= 8; i++) {
    const tick = document.createElement('span');
    tick.style.left = `${i * 12.5}%`;
    tick.textContent = fmt(viewStart + ((viewEnd - viewStart) * i) / 8);
    el('ruler').append(tick);
  }
  if (mode === 'scene') {
    const scenes = addLane('场景');
    const clips = addLane('片段');
    bundle.script.scenes.forEach((scene, i) => {
      const clip = bundle.manifest.clips.find((c) => c.scene_id === scene.scene_id)!;
      addClip(
        scenes,
        `${scene.scene_id} · ${scene.objective.slice(0, 20)}`,
        {
          kind: 'scene',
          id: scene.scene_id,
          clipId: clip.clip_id,
          clipIds: [clip.clip_id],
          sceneIds: [scene.scene_id],
          start: scene.start_ms,
          end: scene.start_ms + scene.duration_ms,
          artifact: ref(),
        },
        i,
      );
    });
    bundle.manifest.clips.forEach((clip, i) => {
      const scene = bundle.script.scenes.find((s) => s.scene_id === clip.scene_id)!;
      addClip(
        clips,
        scene.objective.slice(0, 20),
        {
          kind: 'clip',
          id: clip.clip_id,
          clipId: clip.clip_id,
          clipIds: [clip.clip_id],
          sceneIds: [clip.scene_id],
          start: clip.start_ms,
          end: clip.start_ms + clip.duration_ms,
          artifact: ref(),
        },
        i + 1,
      );
    });
  } else {
    const runtimeElements = bridge?.getSelectableElements() ?? [];
    bundle.manifest.selectable_elements.forEach((element, index) => {
      const segments = getElementClipSegments(bundle, element.id, runtimeElements);
      if (!segments.length) return;
      const lane = addLane(element.source_ref?.kind === 'timed_text' ? '文字' : '对象');
      for (const seg of segments) {
        addClip(
          lane,
          seg.label,
          {
            kind: 'render_element',
            id: seg.elementId,
            clipId: seg.clipId,
            clipIds: [seg.clipId],
            sceneIds: [seg.sceneId],
            start: seg.startMs,
            end: seg.endMs,
            artifact: ref(),
            scopeMode: 'clip',
            className: seg.className,
          },
          index,
        );
      }
    });
  }
  const total = bundle.manifest.total_duration_ms;
  el('hscroll').classList.toggle('off', viewEnd - viewStart >= total);
  el('hthumb').style.left = `${(viewStart / total) * 100}%`;
  el('hthumb').style.width = `${((viewEnd - viewStart) / total) * 100}%`;
  el('editChip').style.display = viewEnd - viewStart < total ? 'flex' : 'none';
  el('editName').textContent = `${fmt(viewStart)}–${fmt(viewEnd)}`;
  syncTimelineSelection();
  updateHead();
}

function addChip(selection: Selection) {
  const token = crypto.randomUUID();
  const copy = structuredClone(selection);
  chips.set(token, copy);
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.contentEditable = 'false';
  chip.dataset.token = token;
  const spanSuffix = copy.kind === 'render_element' ? ` · ${formatSpanBadge(copy)}` : '';
  chip.textContent = `${copy.kind === 'render_element' ? '对象' : '片段'} · ${copy.label ?? copy.id}${spanSuffix}`;
  chip.title = `${copy.id}${copy.className ? ` (${copy.className})` : ''} · ${fmt(copy.start)}–${fmt(copy.end)}`;
  const close = document.createElement('i');
  close.className = 'x';
  close.textContent = '×';
  close.onclick = () => {
    chip.remove();
    chips.delete(token);
  };
  chip.append(close);
  input.append(chip, document.createTextNode(' '));
  input.focus();
}

function currentChipSelections(): Selection[] {
  return [...input.querySelectorAll<HTMLElement>('.chip')]
    .map((c) => chips.get(c.dataset.token!)!)
    .filter(Boolean);
}

function requestFor(text: string) {
  const selections = currentChipSelections();
  if (!selections.length && selected) selections.push(selected);
  return buildRevisionRequest(bundle, selections, text);
}

async function submit() {
  const text = extractPlainInputText();
  if (!text) return;
  try {
    const activeSelections = currentChipSelections();
    if (!activeSelections.length && selected) activeSelections.push(selected);
    const request = requestFor(text);

    const refSummary = activeSelections.length
      ? `[${activeSelections.map((s) => `${s.label ?? s.id}(${formatSpanBadge(s)})`).join('、')}] `
      : '';
    appendMessage('me', `${refSummary}${text}`, '我的意见');

    if (!projectId) {
      const targetIds = request.anchors
        .filter((a): a is { kind: 'render_element'; id: string } => a.kind === 'render_element')
        .map((a) => a.id);
      const clipIds = request.anchors
        .filter((a): a is { kind: 'clip'; id: string } => a.kind === 'clip')
        .map((a) => a.id);
      const ranges = request.anchors
        .filter((a): a is { kind: 'time_range'; start_ms: number; end_ms: number } => a.kind === 'time_range')
        .map((r) => `${fmt(r.start_ms)}–${fmt(r.end_ms)}`);
      const detail = targetIds.length
        ? `目标对象 ${targetIds.join(', ')} · 覆盖片段 ${clipIds.join(', ')} · 时间 ${ranges.join(', ')} · 范围 ${request.scope}`
        : `全片范围 (${request.scope})`;
      message(`固定样片模式：精确修订请求已构造（${detail}）。打开已发布的创作项目即可提交生成新版本。`);
      (window as any).lastRevisionRequest = request;
      input.replaceChildren();
      chips.clear();
      return;
    }

    el<HTMLButtonElement>('sendRevision').disabled = true;
    const result = await api(`/api/projects/${projectId}/animations/revise`, {
      method: 'POST',
      body: JSON.stringify({
        request,
        ...(el<HTMLInputElement>('revisionApiKey').value ? { api_key: el<HTMLInputElement>('revisionApiKey').value } : {}),
      }),
    });
    if (result.status === 'upstream_required') {
      message(result.message);
      return;
    }
    revisionHistory.push({ ref: ref(), projectRevision: bundle.projectRevision });
    message('新动画版本已完成检查；旧版本仍可回退。');
    input.replaceChildren();
    chips.clear();
    choose(null, { shouldSeek: false });
    await openVersion(result.artifact_ref);
  } catch (e) {
    message((e as Error).message);
  } finally {
    el<HTMLButtonElement>('sendRevision').disabled = false;
  }
}

async function openVersion(artifact?: ArtifactRef) {
  bridge?.pause();
  unsubscribe?.();
  bridge = undefined;
  const style = el<HTMLSelectElement>('styleSelect').value;
  if (projectId) {
    const ready = await api(`/api/projects/${projectId}/preview`);
    if (ready.status !== 'ready' && !artifact) throw new Error(ready.message ?? '动画预览尚未就绪。');
    const target = artifact ?? ready.artifact_ref;
    iframe.src = `/animation-render.html?bundle=${encodeURIComponent(`/api/projects/${projectId}/animations/${target.artifact_id}/r${target.revision}/bundle`)}`;
  } else {
    iframe.src = `/animation-render.html?demo=${demoId}&style=${style}`;
  }
  el('load').style.display = 'grid';
}

function connect() {
  const apiBridge = (iframe.contentWindow as Window & { animationBridge?: Bridge })?.animationBridge;
  if (!apiBridge || bridge === apiBridge) return;
  bridge = apiBridge;
  bundle = apiBridge.bundle;
  selected = null;
  lastPickHits = [];
  overlay.style.display = 'none';
  hideHover();
  updateInspector();
  time = 0;
  viewStart = 0;
  viewEnd = bundle.manifest.total_duration_ms;
  el('load').style.display = 'none';
  el('durBadge').textContent = fmt(viewEnd);
  el('versionBadge').textContent = `${projectId ? '已发布动画' : demoId === 'pn' ? '固定 PN 样片' : 'world.execute(me); 参考样片'} · r${bundle.manifest.revision}`;
  el('stageFoot').textContent = `${bundle.script.core_message.slice(0, 50)}`;
  const actualStyle = Object.values(bundle.resources)[0].style;
  if (![...el<HTMLSelectElement>('styleSelect').options].some((o) => o.value === actualStyle.id)) {
    el<HTMLSelectElement>('styleSelect').add(new Option(actualStyle.name, actualStyle.id));
  }
  el<HTMLSelectElement>('styleSelect').value = actualStyle.id;
  describeStyle();
  unsubscribe = apiBridge.subscribe((next, active) => {
    time = next;
    playing = active;
    el('curTime').textContent = `${fmt(time)} / ${fmt(bundle.manifest.total_duration_ms)}`;
    el('playBtn').textContent = active ? '❚❚' : '▶';
    el('playBtn').setAttribute('aria-label', active ? '暂停' : '播放');
    updateHead();
    updateOverlay();
  });
  rebuild();
  fit();
}

/* ── Direct Stage Picking & Drag-to-Workbench ─────────────────────────────── */

function normFromClient(clientX: number, clientY: number) {
  const box = frame.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  return {
    x: (clientX - box.left) / box.width,
    y: (clientY - box.top) / box.height,
  };
}

function pickAtNormalized(normX: number, normY: number, options: { cycle?: boolean } = {}) {
  if (!bridge || !bundle) return null;
  const hits = bridge.hitTest(normX, normY);
  if (!hits.length) {
    choose(null, { shouldSeek: false });
    return null;
  }

  let index = 0;
  if (
    options.cycle &&
    lastPickPoint &&
    Math.hypot(normX - lastPickPoint.x, normY - lastPickPoint.y) < 0.015 &&
    hits.length > 1 &&
    lastPickHits.length > 1 &&
    hits[0].element.id === lastPickHits[0].element.id
  ) {
    index = (lastPickIndex + 1) % hits.length;
  }

  lastPickHits = hits;
  lastPickPoint = { x: normX, y: normY };
  lastPickIndex = index;

  if (playing) bridge.pause();
  const chosenHit = hits[index];
  const nextSelection = resolveSelectionForHit(
    bundle,
    chosenHit,
    time,
    undefined,
    bridge.getSelectableElements(),
  );
  if (nextSelection) {
    choose(nextSelection, { shouldSeek: false, keepLayerStack: true });
  }
  return nextSelection;
}

type StageDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  normX: number;
  normY: number;
  moved: boolean;
  selection: Selection | null;
};

let stageDrag: StageDragState | null = null;

function isOverDropZone(clientX: number, clientY: number) {
  const rect = chatPanel.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function setDropHighlight(active: boolean) {
  chatPanel.classList.toggle('drop-active', active);
  input.classList.toggle('drop', active);
}

function updateDragGhost(clientX: number, clientY: number, sel: Selection) {
  dragGhost.style.display = 'inline-flex';
  dragGhost.style.left = `${clientX}px`;
  dragGhost.style.top = `${clientY}px`;
  dragGhost.replaceChildren(
    document.createTextNode(`拖入修改 · ${sel.label ?? sel.id} `),
    Object.assign(document.createElement('code'), { textContent: formatSpanBadge(sel) }),
  );
}

function clearStageDrag() {
  stageDrag = null;
  dragGhost.style.display = 'none';
  stagePicker.classList.remove('dragging');
  setDropHighlight(false);
}

stagePicker.addEventListener('pointermove', (event) => {
  if (!bridge || !bundle || !pickMode) return;
  if (stageDrag && stageDrag.pointerId === event.pointerId) {
    const dist = Math.hypot(event.clientX - stageDrag.startX, event.clientY - stageDrag.startY);
    if (!stageDrag.moved && dist >= 6) {
      stageDrag.moved = true;
      stagePicker.classList.add('dragging');
      hideHover();
      if (!stageDrag.selection) {
        stageDrag.selection = pickAtNormalized(stageDrag.normX, stageDrag.normY, { cycle: false });
      }
    }
    if (stageDrag.moved && stageDrag.selection) {
      updateDragGhost(event.clientX, event.clientY, stageDrag.selection);
      setDropHighlight(isOverDropZone(event.clientX, event.clientY));
    }
    return;
  }

  const pos = normFromClient(event.clientX, event.clientY);
  if (!pos) return;
  const hits = bridge.hitTest(pos.x, pos.y);
  showHover(hits[0] ?? null);
});

stagePicker.addEventListener('pointerleave', () => {
  if (!stageDrag) hideHover();
});

stagePicker.addEventListener('pointerdown', (event) => {
  if (!bridge || !bundle || !pickMode || event.button !== 0) return;
  const pos = normFromClient(event.clientX, event.clientY);
  if (!pos) return;
  const hits = bridge.hitTest(pos.x, pos.y);
  const preSelection = hits.length
    ? (selected && selected.kind === 'render_element' && hits[0].element.id === selected.id
        ? selected
        : resolveSelectionForHit(bundle, hits[0], time, undefined, bridge.getSelectableElements()))
    : null;

  stageDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    normX: pos.x,
    normY: pos.y,
    moved: false,
    selection: preSelection,
  };
  stagePicker.setPointerCapture(event.pointerId);
});

stagePicker.addEventListener('pointerup', (event) => {
  if (!stageDrag || stageDrag.pointerId !== event.pointerId) return;
  const current = stageDrag;
  if (stagePicker.hasPointerCapture(event.pointerId)) {
    stagePicker.releasePointerCapture(event.pointerId);
  }
  clearStageDrag();

  if (current.moved) {
    if (current.selection) {
      choose(current.selection, { shouldSeek: false, keepLayerStack: true });
      if (isOverDropZone(event.clientX, event.clientY)) {
        addChip(current.selection);
        el('statusMessage').textContent = `已引用对象「${current.selection.label ?? current.selection.id}」（${formatSpanBadge(current.selection)}），请输入修改意见。`;
      }
    }
    return;
  }

  const picked = pickAtNormalized(current.normX, current.normY, { cycle: true });
  if (!picked && bridge) {
    // Clicking empty stage background gently clears selection.
    hideHover();
  }
});

stagePicker.addEventListener('pointercancel', () => {
  clearStageDrag();
});

selectionBadge.ondragstart = (event) => {
  if (!selected) return;
  event.dataTransfer!.setData('application/x-animation-selection', JSON.stringify(selected));
  setDropHighlight(true);
};

selectionBadge.ondragend = () => {
  setDropHighlight(false);
};

quickAttachBtn.onclick = (event) => {
  event.stopPropagation();
  if (!selected) return;
  addChip(selected);
  el('statusMessage').textContent = `已引用「${selected.label ?? selected.id}」（${formatSpanBadge(selected)}）。`;
};

inspectorAttachBtn.onclick = () => {
  if (!selected) return;
  addChip(selected);
  el('statusMessage').textContent = `已引用「${selected.label ?? selected.id}」（${formatSpanBadge(selected)}）。`;
};

inspectorClose.onclick = () => {
  choose(null, { shouldSeek: false });
};

scopeClipBtn.onclick = () => setScopeMode('clip');
scopeContinuousBtn.onclick = () => setScopeMode('continuous');
scopeMomentBtn.onclick = () => setScopeMode('moment');

pickModeBtn.onclick = () => {
  pickMode = !pickMode;
  pickModeBtn.textContent = pickMode ? '点选对象: 开' : '点选对象: 关';
  pickModeBtn.classList.toggle('pick-on', pickMode);
  pickModeBtn.setAttribute('aria-pressed', String(pickMode));
  stagePicker.classList.toggle('off', !pickMode);
  if (!pickMode) hideHover();
};

/* ── Standard Workbench Controls ──────────────────────────────────────────── */

window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.source === iframe.contentWindow && event.data?.type === 'animation-ready') {
    connect();
  }
  if (event.origin === location.origin && event.source === iframe.contentWindow && event.data?.type === 'animation-error') {
    el('load').textContent = '动画资源无法加载，请刷新项目状态后重试。';
  }
});

iframe.onload = connect;
el('playBtn').onclick = () => {
  if (bridge) playing ? bridge.pause() : bridge.play();
};

for (const [id, value] of [
  ['tabScene', 'scene'],
  ['tabAnim', 'anim'],
]) {
  el(id).onclick = () => {
    mode = value;
    el('tabScene').classList.toggle('on', mode === 'scene');
    el('tabAnim').classList.toggle('on', mode === 'anim');
    rebuild();
  };
}

const at = (x: number) => {
  const box = document.querySelector('.lane')?.getBoundingClientRect() ?? el('ruler').getBoundingClientRect();
  return viewStart + Math.max(0, Math.min(1, (x - box.left) / box.width)) * (viewEnd - viewStart);
};

let draggingTimeline = false;
for (const target of [el('ruler'), el('playhead'), document.querySelector('.tracks-wrap')! as HTMLElement]) {
  target.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('.clip')) return;
    draggingTimeline = true;
    target.setPointerCapture(event.pointerId);
    void seek(at(event.clientX));
  });
  target.addEventListener('pointermove', (event) => {
    if (draggingTimeline) void seek(at(event.clientX));
  });
  target.addEventListener('pointerup', () => {
    draggingTimeline = false;
  });
  target.addEventListener('pointercancel', () => {
    draggingTimeline = false;
  });
}

document.querySelector('.timeline')!.addEventListener(
  'wheel',
  ((event: WheelEvent) => {
    event.preventDefault();
    if (!bundle) return;
    const total = bundle.manifest.total_duration_ms;
    const span = viewEnd - viewStart;
    if (event.shiftKey) {
      viewStart = Math.max(0, Math.min(total - span, viewStart + (event.deltaY * span) / 1000));
      viewEnd = viewStart + span;
    } else {
      const center = at(event.clientX);
      const next = Math.max(1000, Math.min(total, span * (event.deltaY > 0 ? 1.18 : 0.85)));
      viewStart = Math.max(0, Math.min(total - next, center - next / 2));
      viewEnd = viewStart + next;
    }
    rebuild();
  }) as EventListener,
  { passive: false },
);

el('editChip').onclick = () => {
  viewStart = 0;
  viewEnd = bundle.manifest.total_duration_ms;
  rebuild();
};

let scrollOrigin = 0;
let scrollStart = 0;
el('hscroll').onpointerdown = (event) => {
  scrollOrigin = event.clientX;
  scrollStart = viewStart;
  el('hscroll').setPointerCapture(event.pointerId);
};
el('hscroll').onpointermove = (event) => {
  if (!el('hscroll').hasPointerCapture(event.pointerId) || !bundle) return;
  const total = bundle.manifest.total_duration_ms;
  const span = viewEnd - viewStart;
  viewStart = Math.max(0, Math.min(total - span, scrollStart + ((event.clientX - scrollOrigin) / el('hscroll').clientWidth) * total));
  viewEnd = viewStart + span;
  rebuild();
};

const handleDropSelection = (event: DragEvent) => {
  event.preventDefault();
  setDropHighlight(false);
  const value = event.dataTransfer?.getData('application/x-animation-selection');
  if (value) {
    try {
      const parsed = JSON.parse(value) as Selection;
      addChip(parsed);
      el('statusMessage').textContent = `已引用「${parsed.label ?? parsed.id}」（${formatSpanBadge(parsed)}）。`;
    } catch {
      message('无法读取该对象引用。');
    }
  }
};

for (const dropTarget of [chatPanel, input]) {
  dropTarget.ondragover = (e) => {
    e.preventDefault();
    setDropHighlight(true);
  };
  dropTarget.ondragleave = (e) => {
    if (!chatPanel.contains(e.relatedTarget as Node | null)) {
      setDropHighlight(false);
    }
  };
  dropTarget.ondrop = handleDropSelection;
}

input.onkeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    void submit();
  }
};

input.onpaste = (event) => {
  event.preventDefault();
  document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '');
};

el('sendRevision').onclick = () => void submit();

el('saveRequest').onclick = () => {
  try {
    const request = requestFor(extractPlainInputText() || '请调整选中对象');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(request, null, 2)], { type: 'application/json' }));
    a.download = `${request.request_id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    message(String(e));
  }
};

el('rollback').onclick = async () => {
  if (!projectId) {
    message('固定样片未发布项目版本。');
    return;
  }
  try {
    const history = await api(`/api/projects/${projectId}/animations/versions`);
    const previous = revisionHistory.at(-1)?.ref ?? history.versions.filter((r: ArtifactRef) => r.revision < ref().revision).at(-1);
    if (!previous) {
      message('当前没有可回退的修订版本。');
      return;
    }
    const result = await api(`/api/projects/${projectId}/animations/activate`, {
      method: 'POST',
      body: JSON.stringify({ artifact_ref: previous, expected_project_revision: bundle.projectRevision }),
    });
    revisionHistory.pop();
    await openVersion(result.artifact_ref);
  } catch (error) {
    message((error as Error).message);
  }
};

el('exportVideo').onclick = async () => {
  if (!projectId) {
    message('固定样片请先通过本地验收入口发布为项目，再导出实际文件。');
    return;
  }
  try {
    const result = await api(`/api/projects/${projectId}/animations/export`, {
      method: 'POST',
      body: JSON.stringify({ artifact_ref: ref() }),
    });
    const poll = async () => {
      const state = await api(`/api/projects/${projectId}/animations/exports/${result.export_id}`);
      status.textContent = state.status === 'completed' ? '视频已编码完成，可以下载。' : `正在渲染视频：${state.rendered_frames ?? 0} 帧`;
      if (state.status === 'completed') {
        const a = document.createElement('a');
        a.href = state.download_url;
        a.textContent = '下载 MP4';
        status.append(' ', a);
      } else if (state.status === 'failed') {
        message(state.message);
      } else {
        window.setTimeout(() => void poll().catch((e) => message(String(e))), 1200);
      }
    };
    void poll();
  } catch (e) {
    message(String(e));
  }
};

let applyingStyle = false;
function describeStyle() {
  const profile = profiles.find((p) => p.id === el<HTMLSelectElement>('styleSelect').value);
  el('styleDescription').textContent = profile ? `${profile.intent}。${profile.motionCharacter}。` : '当前版本使用自定义美术档案。';
  el('styleSwatches').replaceChildren(
    ...(profile
      ? [profile.palette.background, profile.palette.material, profile.palette.blue, profile.palette.gold].map((color) => {
          const swatch = document.createElement('span');
          swatch.style.background = color;
          return swatch;
        })
      : []),
  );
}
el<HTMLSelectElement>('styleSelect').onchange = describeStyle;

el('applyStyle').onclick = async () => {
  if (applyingStyle || !bundle) return;
  const selector = el<HTMLSelectElement>('styleSelect');
  const button = el<HTMLButtonElement>('applyStyle');
  const preference = el<HTMLInputElement>('stylePreference').value.trim();
  if (!projectId) {
    message('固定样片：应用预设只更新离线预览，不调用模型。');
    await openVersion();
    return;
  }
  if (!preference && Object.values(bundle.resources).every((r) => r.style.id === selector.value)) {
    message('当前视频已使用这一预设。');
    return;
  }
  applyingStyle = true;
  button.disabled = true;
  selector.disabled = true;
  el<HTMLInputElement>('stylePreference').disabled = true;
  const previous = ref();
  const targetStyle = selector.value;
  try {
    // Only reuse a published, exact-script version when there is no new free-text request.
    if (!preference) {
      const history = await api(`/api/projects/${projectId}/animations/versions`);
      for (const candidate of [...history.versions].reverse() as ArtifactRef[]) {
        if (sameRef(candidate, previous)) continue;
        const prior: AnimationBundle = await api(`/api/projects/${projectId}/animations/${candidate.artifact_id}/r${candidate.revision}/bundle`);
        if (
          sameRef(prior.manifest.production_script_ref, bundle.manifest.production_script_ref) &&
          prior.manifest.brief_revision === bundle.manifest.brief_revision &&
          Object.values(prior.resources).every((r) => r.style.id === targetStyle)
        ) {
          const active = await api(`/api/projects/${projectId}/animations/activate`, {
            method: 'POST',
            body: JSON.stringify({ artifact_ref: candidate, expected_project_revision: bundle.projectRevision }),
          });
          revisionHistory.push({ ref: previous, projectRevision: bundle.projectRevision });
          message('已切换到当前脚本的现有美术版本，没有重新生成。');
          await openVersion(active.artifact_ref);
          return;
        }
      }
    }
    const result = await api(`/api/projects/${projectId}/animations`, {
      method: 'POST',
      body: JSON.stringify({
        expected_project_revision: bundle.projectRevision,
        style_id: targetStyle,
        art_preference: preference,
        ...(el<HTMLInputElement>('revisionApiKey').value ? { api_key: el<HTMLInputElement>('revisionApiKey').value } : {}),
      }),
    });
    message('正在制作新的全片美术版本，当前版本仍可播放。');
    let state;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      state = await api(`/api/projects/${projectId}/animations/jobs/${result.job_id}`);
    } while (['queued', 'running'].includes(state.status));
    if (state.status !== 'completed') throw new Error(state.message ?? '本次制作未完成，旧版仍可播放。');
    revisionHistory.push({ ref: previous, projectRevision: bundle.projectRevision });
    await openVersion(state.artifact_ref);
  } catch (error) {
    message((error as Error).message);
  } finally {
    applyingStyle = false;
    button.disabled = false;
    selector.disabled = false;
    el<HTMLInputElement>('stylePreference').disabled = false;
  }
};

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).isContentEditable || ['INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
  if (e.code === 'Space') {
    e.preventDefault();
    el('playBtn').click();
  }
  if (e.key === 'Escape' && selected) {
    choose(null, { shouldSeek: false });
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    void seek(time + (e.key === 'ArrowLeft' ? -1000 : 1000));
  }
});

resize = new ResizeObserver(fit);
resize.observe(stage);
window.addEventListener('pagehide', () => {
  unsubscribe?.();
  resize?.disconnect();
});

(window as any).workbench = {
  seek,
  getBundle: () => bundle,
  getSelection: () => selected,
  getVisibleElements: () => bridge?.getVisibleElements() ?? [],
  hitTest: (normX: number, normY: number) => bridge?.hitTest(normX, normY) ?? [],
  pickAt: (normX: number, normY: number) => pickAtNormalized(normX, normY, { cycle: true }),
  setScopeMode,
  addChip,
  requestFor,
};

void openVersion().catch((error) => {
  el('load').textContent = (error as Error).message;
});
