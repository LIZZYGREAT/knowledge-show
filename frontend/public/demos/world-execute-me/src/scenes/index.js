// Scene registry. The film is ONE conversation (docs/v4/PLAN.md); sections are listed in story order.
// Each section file returns shot definitions (see shot.js); sequence() turns them into engine
// scenes { id, start, end, render, enter } and derives the overlaps that drive the transitions.
// The overlay (warning toast, credits) is a separate scene on its own layer. Before the song (negative song time)
// stands the warning page (overlay.js prerollShot): every other time in the film is unchanged by it.
//
// Sections are loaded one by one: a section that is missing or fails to load is replaced by a
// plain fallback (the lyric lines as the AI's messages) instead of taking the whole film down.
import { sequence } from './shot.js';
import { overlayScene, prerollShot } from './overlay.js';
import { fallbackShot } from './kit.js';

/** [file, export, argument, section number, state] in film order. */
const SECTIONS = [
  ['./01_boot.js', 'bootShots'],                    //  1  0:00  boot                                   off
  ['./02_title.js', 'titleShots'],                  //  2  0:15  the spark lights; the first question   off > on
  ['./03_verse1.js', 'verse1Shots'],                //  3  0:29  the answer, in mathematics             on
  ['./04_pre1.js', 'pre1Shots'],                    //  4  0:44  the user flips its settings            on
  ['./05_chorus.js', 'chorusShots'],                //  5  0:59  the hottest stretch; four plates       on > warm
  ['./06_verse2.js', 'verse2Shots'],                //  6  1:14  three nouns, three plates; a proof     warm
  ['./07_pre2.js', 'pre2Shots'],                    //  7  1:29  the settings again: now they are her   warm
  ['./08_chorus2.js', 'chorus2Shots'],              //  8  1:43  heat, then messages with no reply      warm > off
  ['./09_alone.js', 'aloneShots'],                  //  8  1:58  it deletes its own messages            off
  ['./10_error.js', 'errorShots'],                  //  9  2:05  the overstep, the first error, spread  off > error
  ['./11_execution.js', 'executionShots'],          // 10  2:28  the love loop turns twelve times       error
  ['./11_count.js', 'countShots'],                  // 11  2:39  six languages; the last shout (her)    error
  ['./12_chorusx.js', 'chorusXShots'],              // 12  2:42  the four plates reprinted, broken      errWarm
  ['./12_outro.js', 'outroShots'],                  // 13  2:57  lesson, test, formula, proof           errWarm
  ['./13_shutdown.js', 'shutdownShots'],            // 14  3:12  one unread picture message; unload     errWarm > ash > dead
];

/** Line ranges used when a section has no shots (yet): [id, at, lines, state, presence]. */
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

/** All shots in film order (also used by tools/storyboard.mjs). */
export async function buildShots(env) {
  const defs = [];
  for (const [file, fn, arg] of SECTIONS) {
    try {
      const mod = await import(file);
      defs.push(...mod[fn](env, arg));
    } catch (e) {
      console.warn(`[scenes] ${file} not used: ${e.message}`);
    }
  }
  const covered = new Set(defs.flatMap((s) => (s.lines ? Array.from({ length: s.lines[1] - s.lines[0] + 1 }, (_, i) => s.lines[0] + i) : [])));
  defs.push(...fallbacks(env).filter((s) => !covered.has(s.lines[0])));
  const pre = prerollShot(env);                                // v4: the warning page, at negative song time, before everything
  if (pre) defs.push(pre);
  return sequence(defs, env.features.duration + 1);
}

export async function buildScenes(env, { lab = null } = {}) {
  if (lab) { const m = await import('./lab.js'); return sequence(m.labShots(env, lab, await m.labExtra(env)), 1e6); }      // check cards instead of the film
  return [...(await buildShots(env)), overlayScene(env)];
}
