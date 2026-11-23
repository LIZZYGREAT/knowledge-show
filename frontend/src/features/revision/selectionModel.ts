import type { AnimationBundle, ArtifactRef, VectorObject } from '../../animation/runtime/BundleTypes';
import type { ElementHit, SelectableElement } from '../../animation/runtime/SceneTypes';
import { WEM_ELEMENT_METADATA, WEM_SCENE_ELEMENTS } from '../../animation/scenes/world-execute-me/demoBundle';

export type SelectionScopeMode = 'clip' | 'continuous' | 'moment';

export type Selection = {
  kind: 'scene' | 'clip' | 'render_element';
  id: string;
  clipId: string;
  clipIds?: string[];
  sceneIds?: string[];
  start: number;
  end: number;
  artifact: ArtifactRef;
  label?: string;
  scopeMode?: SelectionScopeMode;
  className?: string;
  pickedAtMs?: number;
};

export type ElementClipSegment = {
  elementId: string;
  clipId: string;
  sceneId: string;
  startMs: number;
  endMs: number;
  label: string;
  className?: string;
  isTimedText: boolean;
};

export type ContinuousSpan = {
  elementId: string;
  startMs: number;
  endMs: number;
  clipIds: string[];
  sceneIds: string[];
  segments: ElementClipSegment[];
};

const PN_LABELS: Record<string, string> = {
  EL_S01_JUNCTION: '结本体',
  EL_S01_CARRIERS: '载流子群',
  EL_S01_METER: '电流仪表',
  EL_PN_FIXED_IONS: '固定离子',
  EL_PN_BARRIER: '势垒地形',
  EL_PN_FIELD: '内建电场',
  EL_PN_WAVES: '输入与输出波形',
};

const PN_CLASSES: Record<string, string> = {
  EL_S01_JUNCTION: 'PnJunctionDevice.Body',
  EL_S01_CARRIERS: 'PnJunctionDevice.Carriers',
  EL_S01_METER: 'PnJunctionDevice.Meter',
  EL_PN_FIXED_IONS: 'PnJunctionDevice.FixedIons',
  EL_PN_BARRIER: 'PnJunctionDevice.BarrierTerrain',
  EL_PN_FIELD: 'PnJunctionDevice.InternalField',
  EL_PN_WAVES: 'PnJunctionDevice.RectifierWaves',
};

const CONTIGUOUS_GAP_MS = 60;
const MOMENT_HALF_WINDOW_MS = 2000;

export function manifestRef(bundle: AnimationBundle): ArtifactRef {
  return { artifact_id: bundle.manifest.artifact_id, revision: bundle.manifest.revision };
}

export function sameArtifactRef(a: ArtifactRef, b: ArtifactRef): boolean {
  return a.artifact_id === b.artifact_id && a.revision === b.revision;
}

/**
 * Computes the active visible [start, end] local time window for a VectorObject from its keyframes.
 * A segment between keyframes[i] and keyframes[i+1] is visible if either endpoint has opacity > 0.
 */
export function vectorObjectVisibleRange(object: VectorObject, sceneDurationMs: number): [number, number] | null {
  const frames = object.keyframes;
  if (!frames.length) return null;
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < frames.length; i++) {
    const curr = frames[i];
    const next = frames[i + 1];
    if (next) {
      if (curr.opacity > 0 || next.opacity > 0) {
        minStart = Math.min(minStart, curr.time_ms);
        maxEnd = Math.max(maxEnd, next.time_ms);
      }
    } else if (curr.opacity > 0) {
      minStart = Math.min(minStart, curr.time_ms);
      maxEnd = Math.max(maxEnd, curr.time_ms);
    }
  }

  if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) return null;
  const start = Math.max(0, Math.min(sceneDurationMs, minStart));
  const end = Math.max(start, Math.min(sceneDurationMs, maxEnd));
  return end > start ? [start, end] : [start, Math.min(sceneDurationMs, start + 1)];
}

export function elementLabelMap(
  bundle: AnimationBundle,
  runtimeElements: SelectableElement[] = [],
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const [id, label] of Object.entries({ ...PN_LABELS, ...WEM_ELEMENT_METADATA })) {
    labels.set(id, label);
  }
  for (const scene of bundle.script.scenes) {
    for (const timed of scene.timed_text) {
      labels.set(timed.id, timed.text);
    }
  }
  for (const resource of Object.values(bundle.resources)) {
    for (const obj of resource.objects ?? []) {
      labels.set(obj.id, obj.label);
    }
  }
  for (const item of runtimeElements) {
    if (item.label) labels.set(item.id, item.label);
  }
  return labels;
}

export function getElementClipSegments(
  bundle: AnimationBundle,
  elementId: string,
  runtimeElements: SelectableElement[] = [],
): ElementClipSegment[] {
  const manifestEl = bundle.manifest.selectable_elements.find((e) => e.id === elementId);
  const labels = elementLabelMap(bundle, runtimeElements);
  const runtimeEl = runtimeElements.find((e) => e.id === elementId);
  const isTimedText = manifestEl?.source_ref?.kind === 'timed_text';
  const segments: ElementClipSegment[] = [];

  for (const clip of bundle.manifest.clips) {
    const scene = bundle.script.scenes.find((s) => s.scene_id === clip.scene_id);
    const resource = bundle.resources[clip.resource_ref];
    if (!scene || !resource) continue;

    const timed = scene.timed_text.find((t) => t.id === elementId);
    if (isTimedText) {
      if (!timed) continue;
      const startMs = Math.max(clip.start_ms, scene.start_ms + timed.offset_ms);
      const endMs = Math.min(clip.start_ms + clip.duration_ms, startMs + timed.duration_ms);
      if (endMs <= startMs) continue;
      segments.push({
        elementId,
        clipId: clip.clip_id,
        sceneId: scene.scene_id,
        startMs,
        endMs,
        label: timed.text,
        className: runtimeEl?.meta?.className ?? 'TimedTextNode',
        isTimedText: true,
      });
      continue;
    }

    if (resource.kind === 'vector-scene') {
      const obj = resource.objects?.find((o) => o.id === elementId);
      if (!obj) continue;
      const range = vectorObjectVisibleRange(obj, scene.duration_ms);
      if (!range) continue;
      const startMs = Math.max(clip.start_ms, scene.start_ms + range[0]);
      const endMs = Math.min(clip.start_ms + clip.duration_ms, scene.start_ms + range[1]);
      if (endMs <= startMs) continue;
      segments.push({
        elementId,
        clipId: clip.clip_id,
        sceneId: scene.scene_id,
        startMs,
        endMs,
        label: obj.label || labels.get(elementId) || elementId,
        className: runtimeEl?.meta?.className ?? `VectorObject<${obj.shape}>`,
        isTimedText: false,
      });
      continue;
    }

    if (resource.kind === 'wem-scene') {
      const sceneElements = WEM_SCENE_ELEMENTS[scene.scene_id] ?? [];
      if (!sceneElements.includes(elementId)) continue;
      segments.push({
        elementId,
        clipId: clip.clip_id,
        sceneId: scene.scene_id,
        startMs: clip.start_ms,
        endMs: clip.start_ms + clip.duration_ms,
        label: labels.get(elementId) ?? elementId,
        className: runtimeEl?.meta?.className,
        isTimedText: false,
      });
      continue;
    }

    // pn-scene deterministic presence rules
    if (
      (['EL_PN_FIXED_IONS', 'EL_PN_BARRIER', 'EL_PN_FIELD'].includes(elementId) && scene.scene_id === 'S01') ||
      (elementId === 'EL_PN_WAVES' && scene.scene_id !== 'S06')
    ) {
      continue;
    }
    const localStart =
      scene.scene_id === 'S02' && elementId === 'EL_PN_BARRIER'
        ? 14500
        : scene.scene_id === 'S02' && ['EL_PN_FIXED_IONS', 'EL_PN_FIELD'].includes(elementId)
          ? 6500
          : 0;
    const startMs = Math.max(clip.start_ms, scene.start_ms + localStart);
    const endMs = clip.start_ms + clip.duration_ms;
    if (endMs <= startMs) continue;
    segments.push({
      elementId,
      clipId: clip.clip_id,
      sceneId: scene.scene_id,
      startMs,
      endMs,
      label: labels.get(elementId) ?? elementId,
      className: runtimeEl?.meta?.className ?? PN_CLASSES[elementId],
      isTimedText: false,
    });
  }

  return segments.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Merges consecutive per-clip segments of the same logical element into continuous multi-frame spans.
 * If an object persists across adjacent scenes without disappearing (gap <= 60ms), they become one ContinuousSpan.
 */
export function getContinuousSpans(
  bundle: AnimationBundle,
  elementId: string,
  runtimeElements: SelectableElement[] = [],
): ContinuousSpan[] {
  const segments = getElementClipSegments(bundle, elementId, runtimeElements);
  const spans: ContinuousSpan[] = [];

  for (const seg of segments) {
    const prev = spans[spans.length - 1];
    if (prev && seg.startMs - prev.endMs <= CONTIGUOUS_GAP_MS) {
      prev.endMs = Math.max(prev.endMs, seg.endMs);
      if (!prev.clipIds.includes(seg.clipId)) prev.clipIds.push(seg.clipId);
      if (!prev.sceneIds.includes(seg.sceneId)) prev.sceneIds.push(seg.sceneId);
      prev.segments.push(seg);
    } else {
      spans.push({
        elementId,
        startMs: seg.startMs,
        endMs: seg.endMs,
        clipIds: [seg.clipId],
        sceneIds: [seg.sceneId],
        segments: [seg],
      });
    }
  }

  return spans;
}

export function findSpanAtTime(spans: ContinuousSpan[], timeMs: number): ContinuousSpan | null {
  return (
    spans.find((span) => timeMs >= span.startMs && timeMs <= span.endMs)
    ?? spans.reduce<ContinuousSpan | null>((best, span) => {
      if (!best) return span;
      const bestDist = Math.min(Math.abs(timeMs - best.startMs), Math.abs(timeMs - best.endMs));
      const currDist = Math.min(Math.abs(timeMs - span.startMs), Math.abs(timeMs - span.endMs));
      return currDist < bestDist ? span : best;
    }, null)
  );
}

export function buildSelectionForElement(
  bundle: AnimationBundle,
  element: Pick<SelectableElement, 'id' | 'label' | 'meta'>,
  timeMs: number,
  preferredMode?: SelectionScopeMode,
  runtimeElements: SelectableElement[] = [],
): Selection | null {
  const spans = getContinuousSpans(bundle, element.id, runtimeElements);
  const span = findSpanAtTime(spans, timeMs);
  if (!span) return null;

  const activeSegment =
    span.segments.find((s) => timeMs >= s.startMs && timeMs <= s.endMs)
    ?? span.segments[0];

  const mode: SelectionScopeMode =
    preferredMode ?? (span.clipIds.length > 1 ? 'continuous' : 'clip');

  const className = element.meta?.className ?? activeSegment.className;
  const label = element.label || activeSegment.label;
  const artifact = manifestRef(bundle);

  if (mode === 'continuous' && span.clipIds.length > 1) {
    return {
      kind: 'render_element',
      id: element.id,
      clipId: activeSegment.clipId,
      clipIds: [...span.clipIds],
      sceneIds: [...span.sceneIds],
      start: span.startMs,
      end: span.endMs,
      artifact,
      label,
      scopeMode: 'continuous',
      className,
      pickedAtMs: Math.round(timeMs),
    };
  }

  if (mode === 'moment') {
    const clampedAt = Math.max(activeSegment.startMs, Math.min(activeSegment.endMs, Math.round(timeMs)));
    let start = Math.max(activeSegment.startMs, clampedAt - MOMENT_HALF_WINDOW_MS);
    let end = Math.min(activeSegment.endMs, clampedAt + MOMENT_HALF_WINDOW_MS);
    if (end <= start) {
      start = activeSegment.startMs;
      end = activeSegment.endMs;
    }
    return {
      kind: 'render_element',
      id: element.id,
      clipId: activeSegment.clipId,
      clipIds: [activeSegment.clipId],
      sceneIds: [activeSegment.sceneId],
      start,
      end,
      artifact,
      label,
      scopeMode: 'moment',
      className,
      pickedAtMs: clampedAt,
    };
  }

  return {
    kind: 'render_element',
    id: element.id,
    clipId: activeSegment.clipId,
    clipIds: [activeSegment.clipId],
    sceneIds: [activeSegment.sceneId],
    start: activeSegment.startMs,
    end: activeSegment.endMs,
    artifact,
    label,
    scopeMode: 'clip',
    className,
    pickedAtMs: Math.round(timeMs),
  };
}

export function resolveSelectionForHit(
  bundle: AnimationBundle,
  hit: ElementHit,
  timeMs: number,
  preferredMode?: SelectionScopeMode,
  runtimeElements: SelectableElement[] = [],
): Selection | null {
  return buildSelectionForElement(bundle, hit.element, timeMs, preferredMode, runtimeElements);
}

export function formatSpanBadge(selection: Selection): string {
  const scenes = selection.sceneIds?.length
    ? selection.sceneIds
    : selection.clipId.startsWith('CL_')
      ? [selection.clipId.slice(3)]
      : [];
  if (selection.scopeMode === 'continuous' && scenes.length > 1) {
    return `${scenes[0]}–${scenes[scenes.length - 1]} 连续(${scenes.length}幕)`;
  }
  if (selection.scopeMode === 'moment') {
    return `${scenes[0] ?? selection.clipId} · 局部时刻`;
  }
  return scenes[0] ?? selection.clipId;
}

export function buildRevisionRequest(
  bundle: AnimationBundle,
  selections: Selection[],
  text: string,
  requestId?: string,
) {
  const current = manifestRef(bundle);
  if (selections.some((s) => !sameArtifactRef(s.artifact, current))) {
    throw new Error('选择来自旧动画版本，请重新选择后提交。');
  }

  const totalDuration = bundle.manifest.total_duration_ms;
  const anchors: Array<
    | { kind: 'scene' | 'clip' | 'render_element'; id: string }
    | { kind: 'time_range'; start_ms: number; end_ms: number }
  > = [];
  const seen = new Set<string>();
  const coveredClips = new Set<string>();

  const pushUnique = (anchor: (typeof anchors)[number]) => {
    const key =
      anchor.kind === 'time_range'
        ? `time_range:${anchor.start_ms}:${anchor.end_ms}`
        : `${anchor.kind}:${anchor.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    anchors.push(anchor);
  };

  for (const s of selections) {
    if (s.kind === 'render_element' || s.kind === 'scene') {
      pushUnique({ kind: s.kind, id: s.id });
    }
    const clipIds = s.clipIds?.length ? s.clipIds : [s.clipId];
    for (const clipId of clipIds) {
      coveredClips.add(clipId);
      pushUnique({ kind: 'clip', id: clipId });
    }
    const startMs = Math.max(0, Math.min(totalDuration - 1, Math.floor(s.start)));
    const endMs = Math.max(startMs + 1, Math.min(totalDuration, Math.ceil(s.end)));
    pushUnique({ kind: 'time_range', start_ms: startMs, end_ms: endMs });
  }

  const scope =
    selections.length === 0
      ? 'global'
      : coveredClips.size > 1
        ? 'multi_scene'
        : 'local';

  return {
    project_id: bundle.manifest.project_id,
    request_id: requestId ?? `RR_${crypto.randomUUID().replaceAll('-', '')}`,
    base_project_revision: bundle.projectRevision,
    source: 'user' as const,
    target_layer: 'animation' as const,
    target_artifact: { kind: 'animation_manifest' as const, ...current },
    anchors,
    scope,
    problem: text,
    desired_change: text,
    original_user_feedback: text,
    preserve: ['保持脚本知识事实与事件时间', '保持未选中片段及逻辑对象身份'],
  };
}
