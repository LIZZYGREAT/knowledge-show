import { gsap } from 'gsap';
import { ElementRegistry } from '../../runtime/ElementRegistry';
import type { SceneDefinition } from '../../runtime/SceneTypes';
import { precisionScience } from '../../styles/precisionScience';
import { s01Script } from './script';
import { timelineSeconds } from '../../runtime/time';
const reverseStart = timelineSeconds(s01Script.events[1].offset_ms);
const splitStart = timelineSeconds(s01Script.events[2].offset_ms);

import type { StyleProfile } from '../../styles/profiles';
const NS = 'http://www.w3.org/2000/svg';
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function device(name: string, style: StyleProfile) {
  const ticks = Array.from({ length: 25 }, (_, i) => {
    const angle = (200 + i * 140 / 24) * Math.PI / 180;
    const r = i % 4 === 0 ? 77 : 82;
    return `<path d="M${1360 + Math.cos(angle) * r},${465 + Math.sin(angle) * r} L${1360 + Math.cos(angle) * 90},${465 + Math.sin(angle) * 90}"/>`;
  }).join('');
  return `<g data-view="${name}">
    <path d="M1180 465H1259" stroke="#7e92a8" stroke-width="4"/>
    <g data-assembly>
      <path d="M340 465H520M1000 465H1180" stroke="url(#metal)" stroke-width="7"/>
      <circle cx="340" cy="465" r="21" fill="#202f43" stroke="#a0b2c5"/>
      <path d="M330 465h20m-10-10v20" stroke="#e7e9df" stroke-width="2"/>
      <circle cx="1180" cy="465" r="21" fill="#202f43" stroke="#a0b2c5"/>
      <path d="M1170 465h20" stroke="#e7e9df" stroke-width="2"/>
      <g data-body>
        <rect x="516" y="352" width="488" height="236" rx="34" fill="#050d17" opacity=".4" transform="translate(0 10)"/>
        <rect x="520" y="345" width="480" height="240" rx="30" fill="url(#ceramic)" stroke="#c1d1d9" stroke-width="1.5"/>
        <rect x="538" y="362" width="444" height="204" rx="20" fill="url(#bodyTint)"/>
        <path d="M552 364H965" stroke="#ffffff" stroke-opacity=".55"/>
        <rect x="722" y="365" width="76" height="200" fill="url(#contact)" filter="url(#soft)"/>
        <path d="M540 570H980" stroke="#253b50" stroke-opacity=".25"/>
      </g>
      <g data-carriers>${Array.from({ length: 32 }, (_, i) => `<circle data-particle="${i}" r="${i % 2 ? 5 : 6}" fill="${i % 2 ? style.palette.blue : style.palette.red}" stroke="#ffffff" stroke-opacity=".45" stroke-width="1"/>`).join('')}</g>
    </g>
    <g data-meter>
      <circle cx="1360" cy="465" r="105" fill="#0b1523" stroke="#8193a8" stroke-width="1.5"/>
      <circle cx="1360" cy="465" r="96" fill="url(#dial)"/>
      <g stroke="#9aa9b7" stroke-width="1.2">${ticks}</g>
      <text x="1283" y="484" font-size="16" fill="#8da0b2">0</text>
      <g data-needle><path d="M1360 465L1286 438" stroke="#f2ede0" stroke-width="3" stroke-linecap="round"/></g>
      <circle cx="1360" cy="465" r="8" fill="#b8a987"/>
      <text x="1360" y="520" text-anchor="middle" font-size="17" fill="#acb8c5">仪表</text>
    </g>
  </g>`;
}

export function createPnS01(style: StyleProfile = precisionScience, speed = 1, particleScale = 1, particleOpacity = 1): SceneDefinition { return {
  sceneId: s01Script.scene_id,
  durationMs: s01Script.duration_ms,
  mount(host) {
    const container = document.createElement('div');
    container.style.cssText = 'width:100%;aspect-ratio:16/9;display:block';
    host.append(container);
    const root = container.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;display:block;aspect-ratio:16/9;width:100%;color-scheme:dark}
      svg{all:initial;display:block;width:100%;height:auto;aspect-ratio:16/9;background:${style.palette.background};overflow:hidden;font-family:${style.typography.body}}
      text{font-family:${style.typography.body}}
    </style>`;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1600 900');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '同一个结在两种接法下的粒子与仪表变化');
    svg.innerHTML = `<defs>
      <linearGradient id="metal" gradientUnits="userSpaceOnUse" x1="0" y1="460" x2="0" y2="470"><stop stop-color="#d0dce5"/><stop offset=".5" stop-color="#708296"/><stop offset="1" stop-color="#34475b"/></linearGradient>
      <linearGradient id="ceramic" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="${style.palette.material}"/><stop offset=".5" stop-color="#ced7d8"/><stop offset="1" stop-color="${style.palette.shade}"/></linearGradient>
      <linearGradient id="bodyTint"><stop stop-color="#c88989" stop-opacity=".23"/><stop offset=".48" stop-color="#d9d5ce" stop-opacity=".08"/><stop offset="1" stop-color="#6aacc7" stop-opacity=".28"/></linearGradient>
      <linearGradient id="contact"><stop stop-color="#bac6cb" stop-opacity="0"/><stop offset=".5" stop-color="#e4e4de" stop-opacity=".9"/><stop offset="1" stop-color="#bac6cb" stop-opacity="0"/></linearGradient>
      <radialGradient id="dial"><stop stop-color="#28384c"/><stop offset="1" stop-color="#152337"/></radialGradient>
      <radialGradient id="ground"><stop stop-color="#304153" stop-opacity=".35"/><stop offset="1" stop-color="#111e30" stop-opacity="0"/></radialGradient>
      <filter id="soft" x="-50%" width="200%"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>
    <rect width="1600" height="900" fill="${style.palette.background}"/>
    <ellipse cx="800" cy="515" rx="740" ry="300" fill="url(#ground)"/>
    <g data-camera>${device('main', style)}${device('comparison', style)}</g>
    <text x="800" y="174" fill="${style.palette.ink}" text-anchor="middle" font-size="22" letter-spacing="6">同一个结</text>
    <g data-subtitle><path d="M640 747H960" stroke="#667587" stroke-width="1"/><text x="800" y="802" fill="${style.palette.ink}" text-anchor="middle" font-size="32">${s01Script.timed_text[0].text}</text></g>`;
    root.append(svg);
    if (style.id !== 'precision-science') {
      const paper = style.id === 'paper-editorial' || style.id === 'narrative-collage';
      const pattern = document.createElementNS(NS, 'pattern');
      pattern.id = 'art-grain'; pattern.setAttribute('width', paper ? '8' : '18'); pattern.setAttribute('height', paper ? '8' : '18'); pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      const mark = document.createElementNS(NS, 'path');
      mark.setAttribute('d', style.id === 'narrative-collage' ? 'M1 1h2m3 4h1' : 'M1 2h.7'); mark.setAttribute('stroke', style.palette.ink); mark.setAttribute('stroke-width', '.7'); mark.setAttribute('opacity', '.22'); pattern.append(mark); svg.querySelector('defs')!.append(pattern);
      svg.querySelectorAll('[data-body]').forEach(body => {
        body.querySelectorAll('rect').forEach(rect => rect.setAttribute('rx', paper ? '4' : '0'));
        const main = body.querySelector('rect[x="520"]')!;
        main.setAttribute('fill', style.palette.material); main.setAttribute('stroke', style.palette.ink); main.setAttribute('stroke-width', paper ? '1' : '4');
        const texture = document.createElementNS(NS, 'rect');
        for (const [key, value] of Object.entries({ x: '520', y: '345', width: '480', height: '240', fill: 'url(#art-grain)', 'pointer-events': 'none' })) texture.setAttribute(key, value);
        body.append(texture);
      });
      svg.querySelectorAll('[data-meter] circle').forEach(circle => { if (Number(circle.getAttribute('r')) > 90) { circle.setAttribute('fill', style.palette.material); circle.setAttribute('stroke', style.palette.ink); } });
      svg.querySelectorAll('[data-needle] path').forEach(path => { path.setAttribute('stroke', style.palette.ink); path.setAttribute('stroke-width', paper ? '2' : '5'); });
      svg.querySelectorAll('[data-meter] text').forEach(text => text.setAttribute('fill', style.palette.ink));
    }
    const find = <T extends Element>(selector: string) => {
      const node = svg.querySelector<T>(selector);
      if (!node) throw new Error(`Missing scene node: ${selector}`);
      return node;
    };
    const main = find<SVGGElement>('[data-view="main"]');
    const comparison = find<SVGGElement>('[data-view="comparison"]');
    const camera = find<SVGGElement>('[data-camera]');
    const subtitle = find<SVGGElement>('[data-subtitle]');
    const registry = new ElementRegistry(svg);
    for (const [id, label, selector] of [
      ['EL_S01_JUNCTION', '结本体', '[data-body]'],
      ['EL_S01_CARRIERS', '红蓝粒子群', '[data-carriers]'],
      ['EL_S01_METER', '仪表', '[data-meter]'],
    ]) registry.register({ id, label, sourceRef: { kind: 'script_event', id: 'EV01' } }, ...svg.querySelectorAll<SVGGraphicsElement>(selector));
    registry.register({ id: 'T01', label: s01Script.timed_text[0].text, sourceRef: { kind: 'timed_text', id: 'T01' } }, subtitle);

    const pose = { rotation: 0, split: 0, zoom: 1, current: 0 };
    const timeline = gsap.timeline({ paused: true });
    timeline.to(pose, { current: .95, duration: 1.5, ease: 'power2.out' }, 0)
      .to(pose, { rotation: 180, duration: 1.25, ease: 'power2.inOut' }, reverseStart)
      .to(pose, { current: .035, duration: 1.1, ease: 'power2.inOut' }, reverseStart + .35)
      .to(pose, { split: 1, duration: 1.7, ease: 'power2.inOut' }, splitStart)
      .to(pose, { zoom: 1.14, duration: 3.3, ease: 'sine.inOut' }, splitStart + 1.7);

    const views = [main, comparison].map(group => ({
      group,
      assembly: group.querySelector<SVGGElement>('[data-assembly]')!,
      needle: group.querySelector<SVGGElement>('[data-needle]')!,
      particles: [...group.querySelectorAll<SVGCircleElement>('[data-particle]')],
    }));
    function renderView(index: number, time: number, reverse: number, current: number) {
      const view = views[index];
      view.assembly.setAttribute('transform', `rotate(${reverse} 760 465)`);
      view.needle.setAttribute('transform', `rotate(${current * 140} 1360 465)`);
      view.particles.forEach((particle, i) => {
        const initial = (i * 37 + reverseStart * 150 * speed) % 1150;
        const age = Math.max(0, time - reverseStart);
        let x = 165 + (i * 37 + time * 150 * speed) % 1150;
        if (time >= reverseStart && initial < 595) {
          const travel = initial + age * 150 * speed;
          x = 165 + (travel < 595 ? travel : (travel % 1190 <= 595 ? travel % 1190 : 1190 - travel % 1190));
        }
        // A tiny minority still traverses the junction in the reverse state.
        if (time >= reverseStart && i % 15 === 0) x = 165 + (i * 37 + reverseStart * 150 * speed + age * 70 * speed) % 1150;
        const body = clamp((x - 520) / 90) * clamp((1000 - x) / 90);
        const y = 465 + body * ((i % 5 - 2) * 25 + Math.sin(i * 2.1 + time * speed * 2) * 4);
        particle.setAttribute('r', String((i % 2 ? 5 : 6) * particleScale));
        particle.setAttribute('cx', x.toFixed(2)); particle.setAttribute('cy', y.toFixed(2));
        particle.setAttribute('opacity', String((time >= reverseStart && initial >= 595 && i % 15 !== 0 ? clamp(1 - age / 1.3) : .95) * particleOpacity));
      });
    }
    let destroyed = false;
    const handle = {
      seek(ms: number) {
        if (destroyed) throw new Error('Scene destroyed');
        const seconds = timelineSeconds(Math.max(0, Math.min(s01Script.duration_ms, ms)));
        timeline.totalTime(seconds, true);
        const split = pose.split;
        const scale = 1 - split * .52;
        main.setAttribute('transform', `translate(${split * 795} ${split * 240}) scale(${scale})`);
        comparison.setAttribute('transform', `translate(${-split * 10} ${split * 240}) scale(${scale})`);
        comparison.setAttribute('style', `display:${split === 0 ? 'none' : 'inline'};opacity:${split}`);
        camera.setAttribute('transform', `translate(${800 * (1 - pose.zoom)} ${465 * (1 - pose.zoom)}) scale(${pose.zoom})`);
        renderView(0, Math.min(seconds, splitStart), pose.rotation, pose.current);
        renderView(1, reverseStart - .2, 0, .95);
        const text = s01Script.timed_text[0];
        subtitle.style.display = ms >= text.offset_ms && ms < text.offset_ms + text.duration_ms ? '' : 'none';
        svg.dataset.timeMs = String(ms);
      },
      getSelectableElements: () => registry.getElements(),
      getElementBounds: (id: string) => registry.getBounds(id),
      destroy() { if (!destroyed) { destroyed = true; timeline.kill(); container.remove(); } },
    };
    return handle;
  },
}; }
export const pnS01 = createPnS01();
