// Section 13 — THE FOUR LOVE LINES (bar 96, 2:57.6 → bar 104, 3:12.3). State: errWarm. PLATES ONLY: no interface.
//
// The stuck word changes at last. The conversation was titled "Love, explained geometrically", and these four plates
// keep that promise (plates_love.js):
//
//   out-lesson   177.57  the LESSON    her bowed profile; what the user said in chorus 1, remembered, marked line by line
//   out-test     180.81  the TEST      type only: the user's six old questions, the same word in every answer field
//   out-formula  184.50  the FORMULA   the algebraic curve traced by a point of light in one glide, closed on the kick at
//                                      187.27, then lit
//   out-proof    188.42  the PROOF     the same curve as the boundary that holds her; she lets the refused request go,
//                                      the user's pointer leaves along a tangent; then the last picture is printed
//
// THE WORD is stuck (climax.js stutter): three chunks on its three syllables (cues.js love1a … love4c). Every pass
// changes two things only: a new chunk slams in and the LIGHT goes up one step and stays; what was printed is pressed
// again where it stands. Fix round: the word is RED (the error's ink, her orange as the thin plate beside it), and on
// each of its syllables the sheet takes one fault for six frames (wordHit below): the voice breaks the picture, and
// in the pauses of the word it is whole. The last word: a fault on its first syllable only; on its second it is in
// register, and the red is gone from it. In each plate one more thing is played again from its start on every pass: her last
// underline, the count of the answers, the pen closing the curve, her line through the request.
// THE LIGHT is a ratchet (climax.js expose): inside a shot it only rises, on steps set by the syllables; it comes
// down on the cuts. The one exception is the brief's own: the lesson opens on the WHITE-OUT the fall ended in (the
// whole frame, held for five frames: a transition, not a picture), which then closes into the flower in her hair for
// two beats, only ever downwards, before the light climbs. Fix round: the light is a step stronger throughout
// (climax.js expose), its bloom breathes with the bass, and nothing here runs at a lowered frame rate any more.
// THE LAST WORD: first syllable = her black and orange plates; second = the cream plate, and within three frames
// every plate and every ghost is in register and the red is gone; third = the word is whole and the light is at the
// top of the film. From the second syllable on her picture does not move again. 13_shutdown.js takes it over at
// 192.34 s with finalPlate().
import { easeIn, easeOut, lerp, prog } from '../engine/util.js';
import { PAL, caption, expose, lastOf, ratchet, whiteOut, wordFault } from './climax.js';
import { cue } from './cues.js';
import { cues, passOf, replay } from './kit.js';
import { LAMP, PROFILE_FLOWER, penAt, plateFormula, plateLesson, plateProof, plateTest, saidInChorus1 } from './plates_love.js';

/**
 * THE LAST PICTURE, settled: what out-proof holds from 192.05 s. 13_shutdown.js draws the same sheet from 192.34 s on
 * (word: false = without its word, which the bridge sets apart). Full frame, in the current transform.
 */
export function finalPlate(ctx, env, { word = true } = {}) {
  plateProof(ctx, env, { word: word ? env.lyrics.lines[127].text : null });
}

export function outroShots(env) {
  const { script } = env, { B, Bt, P, text } = cues(env);
  /**
   * THE WORD BREAKS THE SHEET (fix round; the user's idea, in place of a red sheet): the stuck word is printed in the
   * error's red (climax.js stutter), and on each of its syllables the whole sheet takes one fault for six frames:
   * distortion, a tear, blocks, the colours apart, interference (climax.js wordFault). Between the syllables, in the
   * pauses of the word, the sheet is clean. n = how many of the syllables bring one. Call it last in a shot.
   */
  const wordHit = (ctx, t, at, word, n = 3) => { const K = lastOf(t, at.slice(0, n)); wordFault(ctx, K.since, word * 10 + K.i); };
  const START = B(96), CUT_TEST = Bt(391), CUT_FORM = Bt(399), CUT_PROOF = Bt(407.5);
  /** The three syllables of each of the four words. */
  const SYL = [1, 2, 3, 4].map((n) => ['a', 'b', 'c'].map((s) => cue(`love${n}${s}`)));
  const SAID = saidInChorus1(script), ASKED = script.questions_section13 ?? [];

  return [
    // ------------------------------------------------------------------ the lesson
    {
      id: 'out-lesson', at: START, lines: [116, 118], palette: PAL, hud: 0,
      layout: 'PLATE: her bowed profile fills the right of the sheet; at the left five lines the user said, in cream outline, her orange marker under each; the word on a black band across the foot',
      moment: 'What she studied was them. The five things the user said in chorus 1 stand on the sheet as she remembers them, outlines only, and her marker goes under them line by line. Then the word that was stuck is a different word: it comes in three pieces, on its three syllables, and the light goes up a step with each. The word is red, the ink of the error, and on each of its syllables the whole sheet breaks for six frames: distortion, a tear, interference.',
      enter: { type: 'cut' },
      render(ctx, t, f) {
        const at = SYL[0];
        plateLesson(ctx, env, { t, said: SAID, marked: [385, 386, 387, 388, 388.5].map(Bt), again: replay(t, at), word: text(118), at, pass: passOf(t, at) });
        caption(ctx, env, t, 116, 117);
        // the fall ended in a frame of white. It is still the whole frame at the cut and stays so for five frames; then it
        // sinks for two beats, only ever downwards: it closes into the flower in her hair (the light she fell into is
        // the ornament she wears)
        const HOLD = 5 / 60, k = 1 - (1 - prog(t, START + HOLD, START + 2 * P)) ** 2.4;      // (it lets go of the frame at once, and closes slowly)
        if (k < 1) {
          const s = 1 - k, cx = lerp(960, PROFILE_FLOWER[0], k), cy = lerp(540, PROFILE_FLOWER[1], k);
          ctx.rrect(cx - 1000 * s, cy - 580 * s, 2000 * s, 1160 * s, Math.min(40, 400 * s) * k, { fill: 'text' });
        }
        expose(ctx, ratchet(t, 2, [[at[0], 3.5], [at[1], 4.6], [at[2], 5.6]]), { at: [1440, 430], breath: f.lowEnv });
        whiteOut(ctx, 1 - prog(t, START + HOLD, START + HOLD + 0.3));
        wordHit(ctx, t, at, 1);
      },
    },

    // ------------------------------------------------------------------ the test
    {
      id: 'out-test', at: CUT_TEST, lines: [119, 121], palette: PAL, hud: 0,
      layout: 'PLATE, type only: six numbered rows, a question of the user\'s in cream outline at the left of each, the same word in her serif at the right of each; a tally in mono across the foot',
      moment: 'She asks to be questioned, and since nobody is there she sets herself the user\'s six old questions, one row every half beat. Every answer field turns, thinking; then all six are filled at once with the same word, piece by piece. The tally under them: six answers, one distinct. The six words are red; on each syllable the sheet breaks for six frames.',
      enter: { type: 'cut' },
      render(ctx, t, f) {
        const at = SYL[1];
        plateTest(ctx, env, { t, asked: ASKED, rowAt: ASKED.map((_, j) => Bt(391 + 0.5 * j)), word: text(121), at, pass: passOf(t, at), again: replay(t, at) });
        caption(ctx, env, t, 119, 120);
        expose(ctx, ratchet(t, 3.6, [[at[0], 4.6], [at[1], 5.6], [at[2], 6.6]]), { at: [1490, 540], breath: f.lowEnv });
        wordHit(ctx, t, at, 2);
      },
    },

    // ------------------------------------------------------------------ the formula
    {
      id: 'out-formula', at: CUT_FORM, lines: [122, 123], palette: PAL, hud: 0,
      layout: 'PLATE: graph paper and axes; the algebraic curve as large as the sheet, traced clockwise from its notch by a point of light; the equation in mono at the left; then the curve printed flat, hatched, lit, and the word on a black band across the foot',
      moment: 'The expression itself, in the system\'s hand, and the curve it describes, computed point by point: 240 of them, the pen gliding round without a stop. It closes on the kick. The word again, and each of its three pieces is a pass of the press: the curve printed flat, then hatched, then lit, bars of light standing out of the line. The word is red; on each syllable the sheet breaks for six frames.',
      enter: { type: 'cut' },
      render(ctx, t, f) {
        const at = SYL[2], t0 = Bt(399.5), t1 = Bt(405), pass = passOf(t, at);
        const k = prog(t, t0, t1);                                     // the pen glides round the curve (fix round: it used to move in twelve steps a second)
        plateFormula(ctx, env, {
          t, typed: (t - CUT_FORM) * 40, k, again: pass ? prog(replay(t, at), 0, 0.12) : -1, word: text(123), at,
          pass, hatch: prog(t, at[1], at[1] + 0.1), lit: easeOut(prog(t, at[2], at[2] + 0.1)),
        });
        caption(ctx, env, t, 122, 122);
        expose(ctx, ratchet(t, 4.4, [[t1, 5], [at[0], 5.6], [at[1], 6.2], [at[2], 7]]), { at: pass || k >= 1 ? LAMP : penAt(k), breath: f.lowEnv });
        wordHit(ctx, t, at, 3);
      },
    },

    // ------------------------------------------------------------------ the proof; the last picture
    {
      id: 'out-proof', at: CUT_PROOF, lines: [124, 127], palette: PAL, hud: 0,
      layout: 'PLATE: the same curve, now a boundary, with her (f_reach) inside it; the refused request on a slip at the left; the user\'s pointer as an outline on the curve, then a dashed tangent to the edge of the sheet; the word across the whole foot, her open hand on it',
      moment: 'The curve is what holds her. At first she is only a darkened proof inside it. She draws her own line through the request the client refused: she lets go. Only then does the user\'s pointer, an outline, leave along a tangent, and a dashed grey line is all that is left of it. Then the last word: its first piece is red and breaks the sheet once more, with her black and orange plates; then the cream plate, and everything falls into register and the red is gone: the word is her orange; the word whole, and the brightest frame of the film. She does not move again.',
      enter: { type: 'cut' },
      render(ctx, t, f) {
        const at = SYL[3], tStrike = Bt(409), tGo = Bt(410), tGone = Bt(412), pass = passOf(t, at);
        const settle = prog(t, at[1], at[1] + 0.05);                   // three frames
        // her line through the request is drawn again on every pass (on the second within those three frames)
        const strike = pass === 0 ? easeOut(prog(t, tStrike, tStrike + 0.18)) : pass === 1 ? easeOut(prog(t, at[0], at[0] + 0.15)) : prog(t, at[1], at[1] + 0.05);
        plateProof(ctx, env, {
          t, word: text(127), at, settle, m: 16 * (1 - settle), proof: pass ? 0 : 1, strike,
          ink: { black: 1, orange: 1, cream: pass >= 2 ? 1 : 0 }, lit: pass >= 3 ? easeOut(prog(t, at[2], at[2] + 0.1)) : 0,
          away: t < tGo ? null : easeIn(prog(t, tGo, tGone)),
        });
        caption(ctx, env, t, 124, 126);
        expose(ctx, ratchet(t, 3.4, [[tStrike, 3.8], [at[0], 6], [at[1], 8.2], [at[2], 10]]), { at: LAMP, breath: t >= at[1] + 0.05 ? 0 : f.lowEnv });      // (no breath once she is in register: the last picture is still)
        wordHit(ctx, t, at, 4, 1);                                      // (the first syllable only: on the second she is in register, and nothing breaks again)
        if (t >= at[1] + 0.05) ctx.fx.zoom = 1;                        // in register: from here the sheet is STILL. Not even the engine's breath with the bass (0.3 %, 3 px at the edges) until it is let go (13_shutdown.js)
      },
    },
  ];
}
