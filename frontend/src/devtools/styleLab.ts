import paper from '../../tests/fixtures/soap-style-lab/style-paper-editorial.json';
import science from '../../tests/fixtures/soap-style-lab/style-precision-science.json';
import modern from '../../tests/fixtures/soap-style-lab/style-modern-graphic.json';
import collage from '../../tests/fixtures/soap-style-lab/style-narrative-collage.json';
import type { AnimationBundle } from '../animation/runtime/BundleTypes';
import { AnimationPlayer } from '../animation/runtime/AnimationPlayer';
import { createSequence } from '../animation/runtime/resourceResolver';
const bundles = [paper, science, modern, collage] as AnimationBundle[];
const players = bundles.map(bundle => {
  const profile = Object.values(bundle.resources)[0].style;
  const article = document.createElement('article'), title = document.createElement('h2'), stage = document.createElement('div'), note = document.createElement('p');
  article.id = profile.id; title.textContent = profile.name; stage.className = 'stage'; note.textContent = `${profile.intent}。${profile.motionCharacter}。`;
  article.append(title, stage, note); document.getElementById('grid')!.append(article);
  return new AnimationPlayer(stage, createSequence(bundle));
});
const slider = document.getElementById('time') as HTMLInputElement;
const button = document.getElementById('play')!;
const ignoreStale = (error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) throw error; };
const unsubscribe = players[0].subscribe((time, playing) => {
  slider.value = String(time); document.getElementById('clock')!.textContent = `${(time / 1000).toFixed(2)}s`; button.textContent = playing ? '暂停' : '播放';
  for (const player of players.slice(1)) void player.seekAndWaitForFrame(time).catch(ignoreStale);
});
async function seek(time: number) { await Promise.all(players.map(p => p.seekAndWaitForFrame(time))); }
button.onclick = () => button.textContent === '播放' ? players[0].play() : players[0].pause();
slider.oninput = () => void seek(Number(slider.value)).catch(ignoreStale);
for (const node of document.querySelectorAll<HTMLButtonElement>('[data-time]')) node.onclick = () => void seek(Number(node.dataset.time)).catch(ignoreStale);
window.addEventListener('pagehide', () => { unsubscribe(); players.forEach(p => p.destroy()); });
(window as any).styleLab = { players, bundles, seek };
