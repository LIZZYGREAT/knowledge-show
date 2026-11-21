export type FrameBounds = { x: number; y: number; width: number; height: number };
export type ElementRuntimeMeta = {
  engine: 'vector-scene' | 'pn-scene' | 'wem-scene';
  className: string;
  shape?: string;
  nodeTag?: string;
  zIndex?: number;
  fill?: string;
  materialKey?: string;
  keyframeCount?: number;
};
export type SelectableElement = {
  id: string;
  label: string;
  sourceRef?: { kind: 'timed_text' | 'script_event'; id: string };
  meta?: ElementRuntimeMeta;
};
export type VisibleElement = {
  element: SelectableElement;
  bounds: FrameBounds;
  zOrder: number;
};
export type ElementHit = VisibleElement & {
  area: number;
  exact: boolean;
};
export type SceneHandle = {
  seek(localTimeMs: number): void;
  getSelectableElements(): SelectableElement[];
  getElementBounds(id: string): FrameBounds | null;
  getVisibleElements?(): VisibleElement[];
  hitTest?(normX: number, normY: number): ElementHit[];
  destroy(): void;
};
export type SceneDefinition = {
  sceneId: string;
  durationMs: number;
  mount(host: HTMLElement): SceneHandle;
};
