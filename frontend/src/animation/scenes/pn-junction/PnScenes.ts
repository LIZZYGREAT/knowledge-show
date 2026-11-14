import { timelineSeconds } from '../../runtime/time';
import type { SceneDefinition } from '../../runtime/SceneTypes';
import { ElementRegistry } from '../../runtime/ElementRegistry';
import type { ScriptScene } from '../../runtime/BundleTypes';
import type { StyleProfile } from '../../styles/profiles';
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u); };
const progress = (time: number, at: number, duration: number) => smooth((time - at) / duration);
const NS = 'http://www.w3.org/2000/svg';

export function pnState(sceneId: string, ms: number) {
  const t = timelineSeconds(ms);
  let height = 135, flow = 0, field = 1, external = 0, reverse = false, battery = false;
  if (sceneId === 'S02') { height = 135 * progress(t, 14, 8); field = progress(t, 6, 7); }
  if (sceneId === 'S03') { height = 135 - 105 * progress(t, 6, 12); flow = t >= 18 ? .95 : 0; external = progress(t, 0, 6); battery = true; }
  if (sceneId === 'S04') { height = 30 + 190 * progress(t, 6, 10); flow = t >= 24 ? .035 : .015; external = 1; reverse = true; battery = true; }
  if (sceneId === 'S05') { height = 30; flow = .95; battery = true; external = 1; }
  if (sceneId === 'S06') { const positive = Math.sin(t * Math.PI) >= 0; height = positive ? 30 : 220; flow = positive ? .9 : .025; battery = false; }
  if (sceneId === 'S07') { reverse = t >= 3; height = t < 3 ? 135 - 105 * progress(t, 0, 2) : 30 + 190 * progress(t, 3, 2); flow = t < 3 ? .9 : t < 6 ? .03 : 0; battery = t < 6; external = battery ? 1 : 0; }
  return { height, flow, field, external, reverse, battery };
}

export function createPnScene(scene: ScriptScene, profile: StyleProfile, speed = 1, particleScale = 1, particleOpacity = 1): SceneDefinition {
  return { sceneId: scene.scene_id, durationMs: scene.duration_ms, mount(host) {
    const outer = document.createElement('div'); outer.style.cssText = 'width:100%;aspect-ratio:16/9'; host.append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 1600 900');
    svg.style.cssText = `display:block;width:100%;aspect-ratio:16/9;background:${profile.palette.background};font-family:${profile.typography.body}`;
    svg.setAttribute('aria-label', scene.objective); svg.setAttribute('role', 'img');
    const { palette: c } = profile;
    const node = (tag: string, attrs: Record<string, string | number>, parent: Element = svg) => {
      const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); parent.append(e); return e as SVGGraphicsElement;
    };
    const defs = node('defs', {});
    const gradient = node('linearGradient', { id: 'pn-material', x2: '.2', y2: '1' }, defs);
    node('stop', { 'stop-color': c.material }, gradient); node('stop', { offset: '1', 'stop-color': c.shade }, gradient);
    const patterned = profile.id === 'narrative-collage' || profile.id === 'paper-editorial';
    const pattern = node('pattern', { id: 'grain', width: 9, height: 9, patternUnits: 'userSpaceOnUse' }, defs);
    node('path', { d: patterned ? 'M1 2h2M6 7h1' : 'M1 1h.5', stroke: c.ink, 'stroke-width': '.5', opacity: '.17' }, pattern);
    node('rect', { width: 1600, height: 900, fill: c.background });
    node('rect', { width: 1600, height: 900, fill: 'url(#grain)', opacity: patterned ? '.7' : '.12' });
    const camera = node('g', {});
    const registry = new ElementRegistry(svg as SVGSVGElement);
    function makeDevice(parent: Element) {
      const g = node('g', {}, parent);
      const body = node('g', {}, g);
      node('path', { d: 'M300 490L360 435H1300L1240 490V615H300Z', fill: c.shade, opacity: '.5' }, body);
      const left = node('g', {}, body);
      node('path', { d: 'M300 490L360 435H800V605H300Z', fill: 'url(#pn-material)', stroke: c.muted, 'stroke-width': 1.3 }, left);
      const right = node('g', {}, body);
      node('path', { d: 'M800 435H1300L1240 490V605H800Z', fill: 'url(#pn-material)', stroke: c.muted, 'stroke-width': 1.3 }, right);
      node('path', { d: 'M315 502H785V588H315Z', fill: c.red, opacity: '.09' }, left);
      node('path', { d: 'M815 451H1280L1223 501V588H815Z', fill: c.blue, opacity: '.13' }, right);
      // Fixed ions are separate from moving carriers and stay on lattice sites.
      const ions = node('g', {}, g);
      for (let i = 0; i < 12; i++) {
        const text = node('text', { x: 755 + i % 2 * 78, y: 467 + Math.floor(i / 2) * 21, fill: i % 2 ? c.blue : c.red, 'font-size': 23, 'text-anchor': 'middle' }, ions);
        text.textContent = i % 2 ? '+' : '−';
      }
      const terrain = node('g', {}, g);
      const terrainFace = node('path', { fill: c.gold, 'fill-opacity': '.12', stroke: c.gold, 'stroke-width': 2.2 }, terrain);
      const contours = Array.from({ length: 5 }, () => node('path', { fill: 'none', stroke: c.gold, opacity: '.32', 'stroke-width': 1 }, terrain));
      const internal = node('path', { fill: 'none', stroke: c.gold, 'stroke-width': 3, d: 'M970 305H650l18-10m-18 10 18 10' }, g);
      const external = node('path', { fill: 'none', stroke: c.blue, 'stroke-width': 3, 'stroke-dasharray': '10 7' }, g);
      const wires = node('g', { fill: 'none', stroke: c.muted, 'stroke-width': 3 }, g);
      node('path', { d: 'M300 545H200V205H725M875 205H1400V545H1240' }, wires);
      const battery = node('g', { stroke: c.ink, 'stroke-width': 4 }, g);
      node('path', { d: 'M725 205H770M770 175V235M825 187V223M825 205H875' }, battery);
      const batteryPlus = node('text', { x: 754, y: 158, fill: c.ink, stroke: 'none', 'font-size': 27 }, battery); batteryPlus.textContent = '+';
      const batteryMinus = node('text', { x: 814, y: 158, fill: c.ink, stroke: 'none', 'font-size': 27 }, battery); batteryMinus.textContent = '−';
      const carriers = node('g', {}, g);
      const dots = Array.from({ length: 56 }, (_, i) => node('circle', { r: (i < 48 ? 7 : 4) * particleScale, fill: i % 2 ? c.blue : c.red, stroke: c.material, 'stroke-width': '.8' }, carriers));
      const meter = node('g', {}, g);
      node('circle', { cx: 1370, cy: 680, r: 63, fill: c.background, stroke: c.muted, 'stroke-width': 1.3 }, meter);
      for (let i = 0; i < 17; i++) { const a = (200 + i * 140 / 16) * Math.PI / 180; node('path', { d: `M${1370 + 48 * Math.cos(a)} ${680 + 48 * Math.sin(a)}l${5 * Math.cos(a)} ${5 * Math.sin(a)}`, stroke: c.muted }, meter); }
      const needle = node('path', { d: 'M1370 680l-46-17', stroke: c.ink, 'stroke-width': 2.8 }, meter);
      node('circle', { cx: 1370, cy: 680, r: 5, fill: c.gold }, meter);
      return { g, body, left, right, ions, terrain, terrainFace, contours, internal, external, battery, batteryPlus, batteryMinus, wires, carriers, dots, meter, needle };
    }
    const main = makeDevice(camera); const other = makeDevice(camera);
    const compareLine = node('path', { fill: 'none', stroke: c.gold, 'stroke-width': 2 }, camera);
    const waves = node('g', {});
    const inputWave = node('path', { fill: 'none', stroke: c.blue, 'stroke-width': 3 }, waves);
    const outputWave = node('path', { fill: 'none', stroke: c.red, 'stroke-width': 3 }, waves);
    node('path', { d: 'M240 255H1360M240 735H1360', stroke: c.muted, 'stroke-width': 1, opacity: '.4' }, waves);
    const texts = scene.timed_text.map((text, i) => {
      const element = node('text', { x: text.text === 'P' || text.text === '空穴' ? 510 : text.text === 'N' || text.text === '电子' ? 1100 : 800,
        y: text.kind === 'subtitle' ? 820 : text.kind === 'title' ? 115 : 160 + (i % 2) * 34, fill: c.ink, 'font-size': text.kind === 'title' ? 39 : 30, 'text-anchor': 'middle', 'font-family': profile.typography.body });
      element.textContent = text.text;
      registry.register({ id: text.id, label: text.text, sourceRef: { kind: 'timed_text', id: text.id } }, element);
      return { text, element };
    });
    for (const [id, label, nodes] of [
      ['EL_S01_JUNCTION', '结本体', [main.body, other.body]], ['EL_S01_CARRIERS', '红蓝载流子群', [main.carriers, other.carriers]],
      ['EL_S01_METER', '电流仪表', [main.meter, other.meter]], ['EL_PN_FIXED_IONS', '固定离子', [main.ions, other.ions]],
      ['EL_PN_BARRIER', '势垒地形', [main.terrain, other.terrain]], ['EL_PN_FIELD', '内建电场', [main.internal, other.internal]],
    ] as const) registry.register({ id, label }, ...nodes);
    registry.register({ id: 'EL_PN_WAVES', label: '输入与输出波形' }, waves);
    root.append(svg);
    const heightAt = (x: number, height: number) => height * Math.exp(-(((x - 800) / 154) ** 2));
    function drawDevice(view: typeof main, ms: number, forcedReverse = false) {
      const state = pnState(scene.scene_id, ms); if (forcedReverse) Object.assign(state, { height: 220, flow: .035, reverse: true });
      const t = timelineSeconds(ms);
      const hill = (y: number) => Array.from({ length: 100 }, (_, i) => { const x = 300 + i / 99 * 940; return `${i ? 'L' : 'M'}${x.toFixed(2)} ${(y - heightAt(x, state.height)).toFixed(2)}`; }).join(' ');
      view.terrainFace.setAttribute('d', `${hill(635)} L1240 670H300Z`);
      view.contours.forEach((line, i) => line.setAttribute('d', hill(625 - i * 26)));
      view.terrain.style.display = state.height < 1 ? 'none' : '';
      view.ions.style.display = scene.scene_id === 'S02' && t < 6 ? 'none' : '';
      view.ions.style.opacity = String(scene.scene_id === 'S02' ? progress(t, 6, 4) : 1);
      const gap = scene.scene_id === 'S02' ? 65 * (1 - progress(t, 0, 6)) : 0;
      view.left.setAttribute('transform', `translate(${-gap} 0)`); view.right.setAttribute('transform', `translate(${gap} 0)`);
      view.internal.style.display = state.field === 0 ? 'none' : ''; view.internal.style.opacity = String(state.field);
      view.internal.setAttribute('transform', `translate(0 ${-state.height * .26})`);
      view.external.style.display = state.external ? '' : 'none';
      view.external.setAttribute('d', state.reverse ? 'M970 335H650l18-10m-18 10 18 10' : 'M650 335H970l-18-10m18 10-18 10');
      view.battery.style.display = state.battery ? '' : 'none'; view.wires.style.display = state.battery ? '' : 'none';
      view.batteryPlus.textContent = state.reverse ? '−' : '+'; view.batteryMinus.textContent = state.reverse ? '+' : '−';
      view.needle.setAttribute('transform', `rotate(${state.flow * 140} 1370 680)`);
      view.dots.forEach((dot, i) => {
        const right = i % 2 === 1;
        const majority = i < 48;
        const travel = (t * speed * (state.flow > .5 ? 145 : 40) + i * 71) % 940;
        let x = state.flow > .5 || !majority && state.flow > 0 ? right ? 1240 - travel : 300 + travel : right ? 865 + i % 7 * 47 : 335 + i % 7 * 47;
        if (scene.scene_id === 'S02' && t >= 6 && t < 14 && i % 6 === 0) x += (right ? -1 : 1) * 110 * progress(t, 6, 8);
        if (state.flow < .5 && majority) x += (right ? -1 : 1) * 22 * Math.sin(t * speed * 2 + i);
        const floor = 535 + (i % 4 - 1.5) * 24;
        const y = floor - heightAt(x, state.height) * .55 + Math.sin(i + t * 1.5) * 3;
        dot.setAttribute('cx', x.toFixed(2)); dot.setAttribute('cy', y.toFixed(2));
        dot.setAttribute('fill', majority ? right ? c.blue : c.red : right ? c.red : c.blue);
        dot.setAttribute('opacity', String((majority ? .96 : .55) * particleOpacity));
      });
    }
    let destroyed = false;
    return {
      seek(ms) {
        if (destroyed) throw new Error('Scene destroyed');
        const time = Math.max(0, Math.min(scene.duration_ms, ms));
        const comparison = scene.scene_id === 'S05';
        main.g.setAttribute('transform', comparison ? 'translate(0 170) scale(.48)' : scene.scene_id === 'S06' ? 'translate(280 170) scale(.65)' : 'translate(0 0) scale(1)');
        other.g.setAttribute('transform', 'translate(800 170) scale(.48)'); other.g.style.display = comparison ? '' : 'none';
        drawDevice(main, time); if (comparison) drawDevice(other, time, true);
        compareLine.style.display = comparison && time >= 7000 ? '' : 'none';
        compareLine.setAttribute('d', `M390 440H1190V${440 - 190 * .48}`);
        waves.style.display = scene.scene_id === 'S06' ? '' : 'none';
        if (scene.scene_id === 'S06') {
          const extent = clamp(time / 6000);
          const makeWave = (output: boolean) => Array.from({ length: 240 }, (_, i) => {
            const x = 240 + i / 239 * 1120 * extent;
            const phase = (x - 240) / 85;
            const value = output ? Math.max(0, Math.sin(phase)) : Math.sin(phase);
            return `${i ? 'L' : 'M'}${x.toFixed(2)} ${((output ? 735 : 255) - value * 60).toFixed(2)}`;
          }).join('');
          inputWave.setAttribute('d', makeWave(false)); outputWave.setAttribute('d', makeWave(true)); outputWave.style.display = time < 6000 ? 'none' : '';
        }
        texts.forEach(({ text, element }) => { element.style.display = time >= text.offset_ms && time < text.offset_ms + text.duration_ms ? '' : 'none'; });
        svg.dataset.timeMs = String(time); svg.dataset.sceneId = scene.scene_id;
      },
      getSelectableElements: () => registry.getElements(), getElementBounds: id => registry.getBounds(id),
      destroy() { if (!destroyed) { destroyed = true; outer.remove(); } },
    };
  } };
}
