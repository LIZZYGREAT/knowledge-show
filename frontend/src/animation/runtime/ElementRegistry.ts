import type { FrameBounds, SelectableElement } from './SceneTypes';

/** A logical ID can be rendered more than once during a comparison shot. */
export class ElementRegistry {
  private entries = new Map<string, { element: SelectableElement; nodes: SVGGraphicsElement[] }>();
  constructor(private stage: SVGSVGElement) {}
  register(element: SelectableElement, ...nodes: SVGGraphicsElement[]) {
    if (this.entries.has(element.id)) throw new Error(`Duplicate element: ${element.id}`);
    this.entries.set(element.id, { element, nodes });
  }
  getElements() { return [...this.entries.values()].map(({ element }) => ({ ...element })); }
  getBounds(id: string): FrameBounds | null {
    const entry = this.entries.get(id);
    const stage = this.stage.getBoundingClientRect();
    if (!entry || !stage.width || !stage.height || !this.stage.isConnected) return null;
    const boxes = entry.nodes.filter(node => {
      let parent: Element | null = node;
      while (parent && parent !== this.stage) {
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        parent = parent.parentElement;
      }
      return true;
    }).map(node => node.getBoundingClientRect()).filter(box => box.width && box.height);
    if (!boxes.length) return null;
    const left = Math.max(stage.left, Math.min(...boxes.map(b => b.left)));
    const top = Math.max(stage.top, Math.min(...boxes.map(b => b.top)));
    const right = Math.min(stage.right, Math.max(...boxes.map(b => b.right)));
    const bottom = Math.min(stage.bottom, Math.max(...boxes.map(b => b.bottom)));
    if (right <= left || bottom <= top) return null;
    return { x: (left - stage.left) / stage.width, y: (top - stage.top) / stage.height,
      width: (right - left) / stage.width, height: (bottom - top) / stage.height };
  }
}
