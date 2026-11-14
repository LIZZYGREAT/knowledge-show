export type FrameBounds = { x: number; y: number; width: number; height: number };
export type SelectableElement = {
  id: string;
  label: string;
  sourceRef?: { kind: 'timed_text' | 'script_event'; id: string };
};
export type SceneHandle = {
  seek(localTimeMs: number): void;
  getSelectableElements(): SelectableElement[];
  getElementBounds(id: string): FrameBounds | null;
  destroy(): void;
};
export type SceneDefinition = {
  sceneId: string;
  durationMs: number;
  mount(host: HTMLElement): SceneHandle;
};
