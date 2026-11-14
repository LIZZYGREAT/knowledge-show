import { AnimationPlayer } from '../../animation/runtime/AnimationPlayer';
import { createSequence } from '../../animation/runtime/resourceResolver';
import { demoBundle } from '../../animation/scenes/pn-junction/demoBundle';
import type { AnimationBundle } from '../../animation/runtime/BundleTypes';
declare global { interface Window { animationBridge?: AnimationPlayer & { bundle: AnimationBundle }; animationRenderError?: string } }
async function load() {
  const query = new URLSearchParams(location.search);
  let bundle: AnimationBundle;
  if (query.has('demo')) bundle = demoBundle(query.get('style') ?? 'precision-science', Number(query.get('revision') ?? 1));
  else {
    const source = query.get('bundle');
    const allowed = source && (source === '/bundle.json' || /^\/api\/projects\/[A-Za-z][A-Za-z0-9_-]{0,63}\/animations\/[A-Za-z][A-Za-z0-9_-]{0,63}\/r[1-9][0-9]*\/bundle$/.test(source));
    if (!allowed) throw new Error('无效的动画资源引用。');
    const response = await fetch(source!); if (!response.ok) throw new Error('动画资源未就绪或版本已失效。');
    bundle = await response.json();
  }
  const player = Object.assign(new AnimationPlayer(document.getElementById('stage')!, createSequence(bundle)), { bundle });
  window.animationBridge = player;
  window.addEventListener('pagehide', () => player.destroy(), { once: true });
  if (window.parent !== window) window.parent.postMessage({ type: 'animation-ready' }, location.origin);
}
void load().catch(error => { parent.postMessage({ type: 'animation-error' }, location.origin);
  window.animationRenderError = String(error); document.getElementById('stage')!.textContent = '无法加载此动画版本，请返回工作台重试。'; });
