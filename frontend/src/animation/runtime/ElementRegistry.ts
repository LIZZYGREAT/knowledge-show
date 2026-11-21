import type { ElementHit, FrameBounds, SelectableElement, VisibleElement } from './SceneTypes';

type RegistryEntry = {
  element: SelectableElement;
  nodes: SVGGraphicsElement[];
  order: number;
};

const HIT_SLOP = 0.008;

/** A logical ID can be rendered more than once during a comparison shot. */
export class ElementRegistry {
  private entries = new Map<string, RegistryEntry>();
  private sequence = 0;

  constructor(private stage: SVGSVGElement) {}

  register(element: SelectableElement, ...nodes: SVGGraphicsElement[]) {
    if (this.entries.has(element.id)) throw new Error(`Duplicate element: ${element.id}`);
    this.entries.set(element.id, { element, nodes, order: ++this.sequence });
  }

  getElements() {
    return [...this.entries.values()].map(({ element }) => ({ ...element }));
  }

  private isNodeVisible(node: SVGGraphicsElement): boolean {
    if (!node.isConnected) return false;
    let parent: Element | null = node;
    while (parent && parent !== this.stage) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0.01) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  }

  private boundsForEntry(entry: RegistryEntry, stageRect: DOMRect): FrameBounds | null {
    const boxes = entry.nodes
      .filter((node) => this.isNodeVisible(node))
      .map((node) => node.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0);
    if (!boxes.length) return null;
    const left = Math.max(stageRect.left, Math.min(...boxes.map((b) => b.left)));
    const top = Math.max(stageRect.top, Math.min(...boxes.map((b) => b.top)));
    const right = Math.min(stageRect.right, Math.max(...boxes.map((b) => b.right)));
    const bottom = Math.min(stageRect.bottom, Math.max(...boxes.map((b) => b.bottom)));
    if (right <= left || bottom <= top) return null;
    return {
      x: (left - stageRect.left) / stageRect.width,
      y: (top - stageRect.top) / stageRect.height,
      width: (right - left) / stageRect.width,
      height: (bottom - top) / stageRect.height,
    };
  }

  getBounds(id: string): FrameBounds | null {
    const entry = this.entries.get(id);
    const stage = this.stage.getBoundingClientRect();
    if (!entry || !stage.width || !stage.height || !this.stage.isConnected) return null;
    return this.boundsForEntry(entry, stage);
  }

  getVisibleElements(): VisibleElement[] {
    const stage = this.stage.getBoundingClientRect();
    if (!stage.width || !stage.height || !this.stage.isConnected) return [];
    const visible: VisibleElement[] = [];
    for (const entry of this.entries.values()) {
      const bounds = this.boundsForEntry(entry, stage);
      if (!bounds) continue;
      visible.push({
        element: { ...entry.element },
        bounds,
        zOrder: entry.element.meta?.zIndex ?? entry.order,
      });
    }
    return visible.sort((a, b) => a.zOrder - b.zOrder);
  }

  private entryContainingNode(node: Element): RegistryEntry | null {
    let cursor: Element | null = node;
    while (cursor && cursor !== this.stage) {
      for (const entry of this.entries.values()) {
        if (entry.nodes.includes(cursor as SVGGraphicsElement)) {
          return entry;
        }
      }
      cursor = cursor.parentElement;
    }
    return null;
  }

  hitTest(normX: number, normY: number): ElementHit[] {
    const stage = this.stage.getBoundingClientRect();
    if (!stage.width || !stage.height || !this.stage.isConnected) return [];
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return [];

    const clientX = stage.left + normX * stage.width;
    const clientY = stage.top + normY * stage.height;

    const exactHits: ElementHit[] = [];
    const seen = new Set<string>();

    // Pass 1: Real paint-order DOM / ShadowRoot hit testing on rendered SVG geometry.
    const root = this.stage.getRootNode() as ShadowRoot | Document;
    const hitNodes = typeof root.elementsFromPoint === 'function' ? root.elementsFromPoint(clientX, clientY) : [];
    for (const domNode of hitNodes) {
      if (!this.stage.contains(domNode)) continue;
      const entry = this.entryContainingNode(domNode);
      if (!entry || seen.has(entry.element.id)) continue;
      const bounds = this.boundsForEntry(entry, stage);
      if (!bounds) continue;
      seen.add(entry.element.id);
      exactHits.push({
        element: { ...entry.element },
        bounds,
        area: bounds.width * bounds.height,
        zOrder: entry.element.meta?.zIndex ?? entry.order,
        exact: true,
      });
    }

    // Pass 2: Normalized tight bounding-box fallback (catches thin paths, small particles & sparse groups).
    const bboxHits: ElementHit[] = [];
    for (const entry of this.entries.values()) {
      if (seen.has(entry.element.id)) continue;
      const bounds = this.boundsForEntry(entry, stage);
      if (!bounds) continue;
      if (
        normX >= bounds.x - HIT_SLOP &&
        normX <= bounds.x + bounds.width + HIT_SLOP &&
        normY >= bounds.y - HIT_SLOP &&
        normY <= bounds.y + bounds.height + HIT_SLOP
      ) {
        seen.add(entry.element.id);
        bboxHits.push({
          element: { ...entry.element },
          bounds,
          area: bounds.width * bounds.height,
          zOrder: entry.element.meta?.zIndex ?? entry.order,
          exact: false,
        });
      }
    }

    // Prefer smaller / foreground objects among bbox-only fallbacks so inner actors win over outer frames.
    bboxHits.sort((a, b) => a.area - b.area || b.zOrder - a.zOrder);
    return [...exactHits, ...bboxHits];
  }
}
