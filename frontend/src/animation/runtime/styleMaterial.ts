import type { VectorObject } from './BundleTypes';
const NS = 'http://www.w3.org/2000/svg';
export function svgNode<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
/** Built once per object at mount; seek changes transforms only. No external SVG or CSS. */
export function applyMaterial(defs: SVGDefsElement, el: SVGGraphicsElement, object: VectorObject, prefix: string) {
  el.setAttribute('fill', object.fill);
  const key = object.materialKey ?? 'flat';
  if (key === 'flat') return;
  const id = `${prefix}-surface`;
  if (key === 'frosted') {
    const gradient = svgNode('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 });
    gradient.append(svgNode('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': .8 }), svgNode('stop', { offset: '30%', 'stop-color': object.fill, 'stop-opacity': .9 }), svgNode('stop', { offset: '100%', 'stop-color': object.fill, 'stop-opacity': .3 }));
    defs.append(gradient);
  } else {
    const pattern = svgNode('pattern', { id, width: key === 'ink-print' ? 10 : 16, height: key === 'ink-print' ? 10 : 16, patternUnits: 'userSpaceOnUse' });
    pattern.append(svgNode('rect', { width: 16, height: 16, fill: object.fill }));
    if (key === 'ink-print') pattern.append(svgNode('circle', { cx: 3, cy: 3, r: 1.4, fill: '#18232b', opacity: .3 }));
    else pattern.append(svgNode('path', { d: 'M1 3L6 2 M9 8L15 6 M2 13L9 12', stroke: '#ffffff', 'stroke-width': .8, opacity: .32 }));
    defs.append(pattern);
    if (key === 'paper-layer') {
      const shadow = svgNode('filter', { id: `${prefix}-shadow`, x: '-30%', y: '-30%', width: '170%', height: '180%', 'color-interpolation-filters': 'sRGB' });
      shadow.append(svgNode('feDropShadow', { dx: 2, dy: 6, stdDeviation: 2, 'flood-color': '#3b3024', 'flood-opacity': .24 }));
      defs.append(shadow); el.setAttribute('filter', `url(#${prefix}-shadow)`);
    }
  }
  el.setAttribute('fill', `url(#${id})`);
}
