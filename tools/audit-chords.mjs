import fs from 'node:fs';

const dataPath = new URL('../dist/chords.json', import.meta.url);
const chords = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const shouldFix = process.argv.includes('--fix');

const pitchClass = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const tuning = [4, 9, 2, 7, 11, 4];
const formulas = {
  major: [0, 4, 7], minor: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10], add9: [0, 2, 4, 7], sus4: [0, 5, 7], '9': [0, 2, 4, 7, 10],
  '13': [0, 2, 4, 7, 9, 10], '7b9': [0, 1, 4, 7, 10], '6': [0, 4, 7, 9],
  madd9: [0, 2, 3, 7], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], aug: [0, 4, 8],
  '7#5': [0, 4, 8, 10], '7#9': [0, 3, 4, 7, 10],
};

function normalizedShape(chord) {
  const played = chord.frets.filter((fret) => fret !== 'x' && fret !== '0').map(Number);
  const base = Math.min(...played);
  return {
    key: JSON.stringify(chord.frets.map((fret) => fret === 'x' || fret === '0' ? fret : Number(fret) - base)),
    base,
  };
}

function normalizedMarking(chord, base) {
  return JSON.stringify({
    fingers: chord.fingers,
    barres: chord.barres.map((barre) => [barre.fret - base, barre.fromString, barre.toString, barre.finger]),
  });
}

const groups = new Map();
for (const chord of chords) {
  const { key } = normalizedShape(chord);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(chord);
}

let consensusRepairs = 0;
if (shouldFix) {
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const counts = new Map();
    for (const chord of group) {
      const { base } = normalizedShape(chord);
      const marking = normalizedMarking(chord, base);
      counts.set(marking, (counts.get(marking) || 0) + 1);
    }
    const consensus = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const parsed = JSON.parse(consensus);
    for (const chord of group) {
      const { base } = normalizedShape(chord);
      if (normalizedMarking(chord, base) === consensus) continue;
      chord.fingers = [...parsed.fingers];
      chord.barres = parsed.barres.map(([fret, fromString, toString, finger]) => ({
        fret: fret + base, fromString, toString, finger,
      }));
      consensusRepairs++;
    }
  }

  const verifiedUniqueShapes = {
    'a-maj7-2': { fingers: [null, null, 1, 1, 1, 3], barres: [{ fret: 2, fromString: 3, toString: 5, finger: 1 }] },
    'a-9-1': { fingers: [null, null, 4, 3, 1, null], barres: [] },
    'a-13-2': { fingers: [null, null, 4, 3, 1, 1], barres: [{ fret: 2, fromString: 5, toString: 6, finger: 1 }] },
    'a-aug-1': { fingers: [null, null, 4, 3, 2, 1], barres: [] },
    'bb-7b9-1': { fingers: [null, 1, null, 2, null, null], barres: [] },
    'd-7-1': { fingers: [null, null, null, 2, 1, 3], barres: [] },
    'e-7-1': { fingers: [null, 2, null, 1, null, null], barres: [] },
    'e-maj7-1': { fingers: [null, 3, 1, 2, null, null], barres: [] },
    'e-madd9-2': { fingers: [null, 2, 3, null, null, 4], barres: [] },
    'e-7sharp9-1': { fingers: [null, null, null, 1, 3, 4], barres: [] },
    'f-minor-1': { fingers: [null, null, 3, 1, 1, 1], barres: [{ fret: 1, fromString: 4, toString: 6, finger: 1 }] },
    'g-minor-1': { fingers: [null, 1, null, null, 4, null], barres: [] },
    'g-7-1': { fingers: [3, 2, null, null, null, 1], barres: [] },
  };
  for (const [id, replacement] of Object.entries(verifiedUniqueShapes)) {
    const chord = chords.find((item) => item.id === id);
    if (!chord) throw new Error(`Missing verified shape ${id}`);
    chord.fingers = replacement.fingers;
    chord.barres = replacement.barres;
  }

  fs.writeFileSync(dataPath, `${JSON.stringify(chords, null, 2)}\n`);
}

const errors = [];
for (const chord of chords) {
  if (!Array.isArray(chord.frets) || chord.frets.length !== 6) errors.push(`${chord.id}: frets must have six entries`);
  if (!Array.isArray(chord.fingers) || chord.fingers.length !== 6) errors.push(`${chord.id}: fingers must have six entries`);

  for (let string = 0; string < 6; string++) {
    const fret = chord.frets[string];
    const finger = chord.fingers[string];
    const isOpenOrMuted = fret === '0' || fret === 'x';
    if (!isOpenOrMuted && ![1, 2, 3, 4].includes(finger)) errors.push(`${chord.id}: fretted string ${string + 1} lacks a valid finger`);
    if (isOpenOrMuted && finger !== null) errors.push(`${chord.id}: open/muted string ${string + 1} has a finger`);
  }

  for (let finger = 1; finger <= 4; finger++) {
    const strings = chord.fingers.map((value, index) => value === finger ? index : -1).filter((index) => index >= 0);
    if (strings.length < 2) continue;
    const frets = new Set(strings.map((string) => chord.frets[string]));
    if (frets.size !== 1) errors.push(`${chord.id}: finger ${finger} is assigned to different frets`);
    const first = Math.min(...strings) + 1;
    const last = Math.max(...strings) + 1;
    const matchingBarre = chord.barres.some((barre) => barre.finger === finger && barre.fromString <= first && barre.toString >= last);
    if (!matchingBarre) errors.push(`${chord.id}: repeated finger ${finger} has no matching barre`);
  }

  for (const barre of chord.barres) {
    if (![1, 2, 3, 4].includes(barre.finger)) errors.push(`${chord.id}: barre has invalid finger`);
    for (let string = barre.fromString - 1; string < barre.toString; string++) {
      const fret = Number(chord.frets[string]);
      if (!Number.isFinite(fret) || fret < barre.fret || (fret === barre.fret && chord.fingers[string] !== barre.finger)) {
        errors.push(`${chord.id}: barre does not match its strings`);
      }
    }
  }

  const root = pitchClass[chord.root];
  const allowed = new Set(formulas[chord.type].map((interval) => (root + interval) % 12));
  for (let string = 0; string < 6; string++) {
    const fret = chord.frets[string];
    if (fret === 'x') continue;
    const note = (tuning[string] + Number(fret)) % 12;
    if (!allowed.has(note)) errors.push(`${chord.id}: string ${string + 1} is not a chord tone`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Audited ${chords.length} chord shapes; ${consensusRepairs} repeated-shape markings repaired.`);
