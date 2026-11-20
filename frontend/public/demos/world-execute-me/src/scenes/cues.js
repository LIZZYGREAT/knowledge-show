// CUES (v4): every time in the film that is NOT simply a beat, a half-beat or a bar line, in ONE place.
// The lyrics have line times only, and nobody building this could hear the song: these are the times of single words
// and syllables inside a line, and of drum hits that do not sit on the grid.
//
//   name: [seconds (song time), source, note]
//     source 'measured' = a STRONG onset found in the audio next to the brief's value (tools/measure_cues.py: vocal band
//                         300-3400 Hz; strength 0.75 or more of the scale). The measured time itself, not snapped: these
//                         are events inside a shot. Weaker onsets are too dense here to tell one syllable from the next,
//                         so those cues keep the brief's value and are marked 'initial': they are the ones to check by ear.
//            'audit'    = measured by the v3 audit (docs/v4/maps/*.json), taken over as it stands
//            'initial'  = the value the brief gave ("about ..."); no clear onset was found, or not measured yet
//            'analysis' = (fix round) found by the user's audio analysis: the part common to both channels (the voice is
//                         centred), its sustained component, energy in 1100-2900 Hz, where the vowel of a letter's name is
//                         bright and the function word before it is not. Not yet checked by ear.
//
// TO CORRECT A CUE BY EAR: change the number here and nowhere else (and set its source to 'ear').
// One cue per line; tools/measure_cues.py reads this file and prints what it finds next to each value.
// Sections read a cue with cue('name'). Cuts sit on the grid (kit.js cues()) and are not taken from here, with one
// exception: verse 2 cuts into its plates on the nouns, at these times snapped to the half-beat grid (features.snapHalf).
export const CUES = {
  // ---- pre-chorus 1 (04_pre1, the date dragged back): the two era words of line 29. The knob crosses the era line on
  //      beat 116 (53.88, a grid time, not a cue); the second word is sung on that beat
  eraFirst:       [53.44, 'measured', 'line 29, its first era word lands by the year (voice onset 53.439, strength 0.91)'],
  eraSecond:      [53.90, 'measured', 'line 29, its second era word lands (voice onset 53.904, strength 0.93): 0.02 s after the crossing on beat 116'],

  // ---- verse 2 (06_verse2): the four nouns. Measured (session 3): the brief's values (75.1 / 78.8 / 82.5 / 86.2, all on
  //      beat 3 of the bar) are the LAST syllable of each noun; the noun BEGINS about a beat earlier, where the voice's
  //      energy comes up (no single strong onset there, so check these by ear first). The plate cuts in where the noun
  //      begins: that time SNAPPED TO THE HALF-BEAT GRID, so the cut stays on the grid whatever is entered here.
  nounEggplant:   [74.66, 'measured', 'line 44: the noun begins (voice energy rises 74.65-74.69). The plate cuts in: beat 161'],
  nounEggplantEnd: [75.07, 'measured', 'its last syllable, the strongest onset of the line (75.070, strength 0.90; brief: 75.1): the characters have settled'],
  nounTomato:     [78.36, 'measured', 'line 47: the noun begins (voice energy rises at 78.36, eight beats after the eggplant). The plate cuts in: beat 169'],
  nounTomatoEnd:  [78.80, 'initial', 'its last syllable (only weak onsets, 78.80 and 78.83): the characters have settled'],
  nounTabby:      [82.04, 'measured', 'line 50: the two-word noun begins (voice energy rises at 82.04; brief: 82.04). The plate cuts in: beat 177'],
  nounCat:        [82.48, 'measured', 'line 50, its last word: the ears pop up (consonant burst at 82.477 in the high band, strength 1.0; brief: 82.50)'],
  nounGod:        [86.19, 'initial', 'line 53, the noun: the sun behind her (measured: a burst at 86.05, the vowel coming up at 86.29; beat 186 lies between them)'],

  // ---- pre-chorus 2 (07_pre2): ten isolated drum hits, then no drums until 103.26
  drumD1:         [91.05, 'audit', 'the pointer comes down on the second cell and HOLDS it (the picture does not change yet)'],
  drumD2:         [91.98, 'audit', 'the aftershock of the second letter: the gender plate shudders once'],
  drumD3:         [94.93, 'audit', 'the sun at its highest'],
  drumD4:         [95.63, 'audit', 'pressed to the end: dusk'],
  drumD5:         [96.31, 'audit', 'cut into the letters'],
  drumD6:         [97.50, 'audit', 'the pointer takes the switch'],
  drumD7:         [97.97, 'audit', 'the push on the switch BEGINS (it is at the top on letterS)'],
  drumD8:         [99.35, 'audit', 'the soft letter lies on the ground: the end of its sag'],
  drumD9:         [100.04, 'audit', 'Loop: on'],
  drumD10:        [100.28, 'audit', 'Done'],
  riseStart:      [103.26, 'audit', 'the rising sound before chorus 2: the pointer clicks into the composer'],
  //      the letters that are named in the lyric: each fills in when it is sung. Lines 57 and 61 are one phrase 16 beats
  //      apart: the letters fall on beats 1 and 3 of the bar, and a drum follows the second letter half a beat later.
  //      In these two lines the VOICE is the event (a letter appears, fills, hits); the drums are for the hand getting
  //      ready and for the aftershock. These four are the times to correct by ear (fix round).
  letterF:        [90.80, 'analysis', 'line 57, its first letter (= bar 49, beat 196). The gender plate cuts in on that bar line; the letter stands solid from the cut, or from this time if it is later'],
  letterM57:      [91.72, 'analysis', 'line 57, its second letter (= beat 198): the held cell is let go, the bust becomes boy_bust, the letter is printed. Less certain than the other three: the other candidate is 91.48'],
  letterAM:       [94.52, 'measured', 'line 59 (onset 94.517, strength 0.79; brief: 94.50)'],
  letterPM:       [95.19, 'measured', 'line 59 (onset 95.190, strength 0.82; brief: 95.16)'],
  letterS:        [98.19, 'analysis', 'line 61, its first letter (= bar 53, beat 212): the switch is at the top, the heavy letter is printed, the sheet jolts and is a step lighter'],
  letterM61:      [99.10, 'analysis', 'line 61, its second letter (= beat 214): the switch is at the bottom, the light letter is printed and starts to sag. (The old letterM, 98.87, was the consonant of the word before it)'],
  //      line 63, the same word twice: each time the word begins on a consonant burst and its vowel comes up 0.28 s later
  tranceWordA:    [101.59, 'measured', 'line 63, the word the first time (high-band burst 101.591)'], tranceA: [101.87, 'measured', 'its vowel (energy rises 101.86-101.88): the three plates take one step'],
  tranceWordB:    [102.52, 'measured', 'the second time (burst 102.520)'], tranceB: [102.81, 'measured', 'its vowel (energy rises at 102.81): a second step'],

  // ---- the last shout before the last chorus (11_count): on the grid, checked against the audit's onsets
  lastSyl1:       [161.88, 'audit', 'beat 350'],
  lastSyl2:       [162.11, 'audit', 'beat 350.5'],
  lastSyl3:       [162.34, 'audit', 'beat 351'],
  lastSyl4:       [162.57, 'audit', 'beat 351.5: her eye'],

  // ---- the four LOVE lines (12_outro): three syllables each. Checked against the audio (session 2): in all four lines
  //      the syllables come about half a beat apart, not one per beat, so the third never falls on a cut and the cuts
  //      stay at 180.81 / 184.50 / 188.42. The voice's onsets are dense here: only the strong ones are 'measured'.
  love1a:         [179.93, 'initial', 'line 118'], love1b: [180.16, 'initial', ''], love1c: [180.39, 'initial', ''],
  love2a:         [183.65, 'initial', 'line 121 (a strong onset at 183.58 sits exactly on beat 397: taken for the kick, not the voice)'], love2b: [183.91, 'measured', 'onset 183.905, strength 0.77 (brief: 183.88)'], love2c: [184.11, 'initial', ''],
  love3a:         [187.73, 'measured', 'line 123 (onset 187.725, strength 0.85; brief: 187.67)'], love3b: [187.89, 'measured', 'onset 187.890, strength 0.76'], love3c: [188.08, 'measured', 'onset 188.082, strength 0.91 (brief: 188.13)'],
  love4a:         [191.36, 'initial', 'line 127: black and orange plates'], love4b: [191.63, 'measured', 'the cream plate; everything registers (onset 191.628, strength 0.79; brief: 191.66)'], love4c: [192.05, 'initial', 'the word is whole; brightest frame of the film'],

  // ---- the ending (13_shutdown)
  voiceEnds:      [193.15, 'measured', 'the held note is over: vocal-band energy falls from 38 dB to the 20 dB floor of the instruments between 192.3 and 193.2 (the LRC line runs to 195.36)'],
  heartZero:      [194.65, 'measured', 'the heart count pops under the picture: 0 (an onset at 194.653, strength 0.97)'],
  lastUnread:     [195.13, 'measured', 'the system log line (an onset at 195.135, strength 0.94; brief: 195.11)'],
  loveDel1:       [197.65, 'initial', 'the value of love deleted in three strokes'], loveDel2: [197.89, 'measured', 'onset 197.886, strength 1.00'], loveDel3: [198.11, 'initial', ''],
  loveUndefined:  [198.35, 'measured', 'back to undefined (onset 198.351, strength 1.00)'],
  endSyl1:        [205.75, 'measured', 'the last shout, four blocks (onset 205.746, strength 1.00)'], endSyl2: [205.96, 'initial', ''], endSyl3: [206.19, 'initial', 'Enter; the spark'], endSyl4: [206.45, 'measured', 'onset 206.449, strength 0.88'],
};

/** Time of a cue, in seconds of song time. An unknown name is an error (a typo must not become t = undefined). */
export function cue(name) {
  const c = CUES[name];
  if (!c) throw new Error(`cues.js: no cue named "${name}"`);
  return c[0];
}
