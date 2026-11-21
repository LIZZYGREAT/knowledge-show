// Scene registry with static ES imports for clean Vite dev + production bundling.
import { sequence } from './shot.js';
import { overlayScene, prerollShot } from './overlay.js';
import { fallbackShot } from './kit.js';
import { bootShots } from './01_boot.js';
import { titleShots } from './02_title.js';
import { verse1Shots } from './03_verse1.js';
import { pre1Shots } from './04_pre1.js';
import { chorusShots } from './05_chorus.js';
import { verse2Shots } from './06_verse2.js';
import { pre2Shots } from './07_pre2.js';
import { chorus2Shots } from './08_chorus2.js';
import { aloneShots } from './09_alone.js';
import { errorShots } from './10_error.js';
import { executionShots } from './11_execution.js';
import { countShots } from './11_count.js';
import { chorusXShots } from './12_chorusx.js';
import { outroShots } from './12_outro.js';
import { shutdownShots } from './13_shutdown.js';

const SECTIONS = [
  ['01_boot', bootShots],
  ['02_title', titleShots],
  ['03_verse1', verse1Shots],
  ['04_pre1', pre1Shots],
  ['05_chorus', chorusShots],
  ['06_verse2', verse2Shots],
  ['07_pre2', pre2Shots],
  ['08_chorus2', chorus2Shots],
  ['09_alone', aloneShots],
  ['10_error', errorShots],
  ['11_execution', executionShots],
  ['11_count', countShots],
  ['12_chorusx', chorusXShots],
  ['12_outro', outroShots],
  ['13_shutdown', shutdownShots],
];

function fallbacks(env) {
  const B = (n) => env.features.barTime(n), Bt = (b) => env.features.beatTime(b), H = (i) => env.features.snapHalf(env.lyrics.start(i));
  return [
    ['boot', 0, [0, 10], 'off', 'offline'], ['title', B(8), [11, 11], 'on', 'online'], ['verse1', Bt(63), [12, 23], 'on', 'online'],
    ['pre1', B(24), [24, 31], 'on', 'online'], ['chorus1', B(32), [32, 43], 'warm', 'online'], ['verse2', B(40), [44, 55], 'warm', 'online'],
    ['pre2', B(48), [56, 63], 'warm', 'online'], ['chorus2', B(56), [64, 76], 'warm', 'away'], ['alone', B(64), [77, 82], 'off', 'offline'],
    ['error', H(83), [83, 85], 'off', 'offline'], ['exec', B(80), [86, 97], 'error', 'offline'], ['count', Bt(344), [98, 104], 'error', 'offline'],
    ['chorusx', B(88), [105, 115], 'error', 'offline'], ['outro', B(96), [116, 127], 'error', 'offline'], ['shutdown', B(104), [128, 128], 'ash', 'offline'],
  ].map(([id, at, lines, palette, presence]) => fallbackShot(env, { id: `todo-${id}`, at, lines, palette, presence }));
}

export async function buildShots(env) {
  const defs = [];
  for (const [name, fn] of SECTIONS) {
    try {
      defs.push(...fn(env));
    } catch (e) {
      console.warn(`[scenes] ${name} not used: ${e.message}`);
    }
  }
  const covered = new Set(defs.flatMap((s) => (s.lines ? Array.from({ length: s.lines[1] - s.lines[0] + 1 }, (_, i) => s.lines[0] + i) : [])));
  defs.push(...fallbacks(env).filter((s) => !covered.has(s.lines[0])));
  const pre = prerollShot(env);
  if (pre) defs.push(pre);
  return sequence(defs, env.features.duration + 1);
}

export async function buildScenes(env) {
  return [...(await buildShots(env)), overlayScene(env)];
}
