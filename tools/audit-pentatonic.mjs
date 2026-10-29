import { readFileSync } from 'node:fs';

const src = readFileSync('dist/app.js', 'utf8');
const tuning = [40, 45, 50, 55, 59, 64];
const NOTE = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];

function extract(name) {
  const m = src.match(new RegExp(`const ${name}=\\[([\\s\\S]*?)\\n  \\];`));
  if (!m) throw new Error(`cannot find ${name}`);
  return eval(`[${m[1]}]`);
}

const pent = extract('PENTATONIC_PATTERNS');
const PENTA_PITCHES = new Set([9, 0, 4, 7, 2]); // A C D E G
const STRING_NAMES = ['Low E','A','D','G','B','High E'];

let fail = 0;
const perString = Array.from({ length: 6 }, () => new Set());

for (const p of pent) {
  // pitches legal
  for (const [s, f] of p.notes) {
    const pc = (tuning[s] + f) % 12;
    if (!PENTA_PITCHES.has(pc)) { console.log(`FAIL ${p.id}: ${NOTE[pc]} at string ${s} fret ${f} not in A minor pentatonic`); fail++; }
    perString[s].add(`${f}:${NOTE[pc]}`);
  }
  // fingers valid
  for (const fret in p.fingerByFret) {
    const n = p.fingerByFret[fret];
    if (n < 1 || n > 4) { console.log(`FAIL ${p.id}: finger ${n} on fret ${fret}`); fail++; }
  }
  // roots are A and present in notes
  for (const [s, f] of p.roots) {
    const pc = (tuning[s] + f) % 12;
    if (pc !== 9) { console.log(`FAIL ${p.id}: root ${NOTE[pc]} at ${s},${f} is not A`); fail++; }
    if (!p.notes.some(([ns, nf]) => ns === s && nf === f)) { console.log(`FAIL ${p.id}: root ${s},${f} not in notes`); fail++; }
  }
  console.log(`${p.id}: frets ${Math.min(...p.notes.map(n => n[1]))}-${Math.max(...p.notes.map(n => n[1]))}, ${p.notes.length} notes, ${p.roots.length} roots (${p.roots.map(([s, f]) => `${STRING_NAMES[s]} ${f}`).join(', ')})`);
}

// tiling: each string's union must be exactly 6 notes A,C,D,E,G,A ascending
for (let s = 0; s < 6; s++) {
  const frets = [...perString[s]].map(x => parseInt(x)).sort((a, b) => a - b);
  const notes = frets.map(f => NOTE[(tuning[s] + f) % 12]).join(',');
  const expected = ['A,C,D,E,G,A','D,E,G,A,C,D','G,A,C,D,E,G','C,D,E,G,A,C','E,G,A,C,D,E','A,C,D,E,G,A'][s];
  const ok = frets.length === 6 && notes === expected;
  console.log(`${ok ? 'OK ' : 'FAIL'} string ${s} (${STRING_NAMES[s]}): frets ${frets.join(',')} = ${notes}`);
  if (!ok) fail++;
}

console.log(fail ? `\n${fail} FAILURES` : '\nAll pentatonic checks passed');
process.exit(fail ? 1 : 0);
