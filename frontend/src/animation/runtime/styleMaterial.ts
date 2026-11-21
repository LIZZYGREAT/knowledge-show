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
    const gradient = svgNode('linearGradient', { id, x1: 0, y1: 0, x2: 0.9, y2: 1 });
    gradient.append(
      svgNode('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.72 }),
      svgNode('stop', { offset: '26%', 'stop-color': object.fill, 'stop-opacity': 0.92 }),
      svgNode('stop', { offset: '78%', 'stop-color': object.fill, 'stop-opacity': 0.78 }),
      svgNode('stop', { offset: '100%', 'stop-color': object.fill, 'stop-opacity': 0.42 }),
    );
    defs.append(gradient);
  } else {
    const pattern = svgNode('pattern', {
      id,
      width: key === 'ink-print' ? 10 : 18,
      height: key === 'ink-print' ? 10 : 18,
      patternUnits: 'userSpaceOnUse',
    });
    pattern.append(svgNode('rect', { width: 18, height: 18, fill: object.fill }));
    if (key === 'ink-print') {
      pattern.append(
        svgNode('circle', { cx: 3, cy: 3, r: 1.35, fill: '#18232b', opacity: 0.24 }),
        svgNode('circle', { cx: 8, cy: 8, r: 0.9, fill: '#ffffff', opacity: 0.14 }),
      );
    } else {
      pattern.append(
        svgNode('path', {
          d: 'M1 4L7 3 M10 9L17 7 M2 15L10 14 M13 2L16 3',
          stroke: '#ffffff',
          'stroke-width': 0.85,
          opacity: 0.36,
        }),
        svgNode('path', {
          d: 'M4 10L9 11',
          stroke: '#7e6e58',
          'stroke-width': 0.5,
          opacity: 0.14,
        }),
      );
    }
    defs.append(pattern);
    if (key === 'paper-layer') {
      const shadow = svgNode('filter', {
        id: `${prefix}-shadow`,
        x: '-30%',
        y: '-30%',
        width: '170%',
        height: '180%',
        'color-interpolation-filters': 'sRGB',
      });
      shadow.append(
        svgNode('feDropShadow', {
          dx: 2,
          dy: 7,
          stdDeviation: 3,
          'flood-color': '#3b3024',
          'flood-opacity': 0.2,
        }),
      );
      defs.append(shadow);
      el.setAttribute('filter', `url(#${prefix}-shadow)`);
    }
  }
  el.setAttribute('fill', `url(#${id})`);
}
