/**
 * Word error rate + speaker-attribution helpers for the recording eval.
 * Both reference and hypothesis go through the same normaliser so Deepgram's
 * smart_format ("$380,000", "7:30", "12th") doesn't count as an error when the
 * script said "three hundred and eighty thousand dollars".
 */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORD: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth', twenty: 'twentieth', thirty: 'thirtieth' };

export function numWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numWords(n % 100) : '');
  if (n < 1_000_000) return numWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numWords(n % 1000) : '');
  return numWords(Math.floor(n / 1_000_000)) + ' million' + (n % 1_000_000 ? ' ' + numWords(n % 1_000_000) : '');
}
function ordinal(n: number): string {
  const w = numWords(n).split(' ');
  const last = w.pop()!;
  w.push(ORD[last] ?? (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th'));
  return w.join(' ');
}
function numberToken(tok: string): string {
  if (/^\d+$/.test(tok)) {
    const n = Number(tok);
    if (tok.length === 4 && n >= 2000 && n < 2100) return 'two thousand' + (n % 100 ? ' ' + numWords(n % 100) : '');
    if (tok.length >= 4 && n > 999_999) return tok.split('').map(d => ONES[Number(d)]).join(' ');
    return numWords(n);
  }
  const ord = tok.match(/^(\d+)(st|nd|rd|th)$/);
  if (ord) return ordinal(Number(ord[1]));
  return tok;
}

export function normalise(text: string): string[] {
  let t = text.toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\$\s?([\d,.]+)(k\b)?/g, (_, n, k) => `${n.replace(/,/g, '')}${k ? '000' : ''} dollars`)
    .replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/(\d)\s?%/g, '$1 percent')
    .replace(/(\d+):(\d{2})/g, (_, h, m) => (m === '00' ? `${h}` : `${h} ${m}`))
    .replace(/(\d)\s?(am|pm|a\.m\.|p\.m\.)/g, '$1 $2')
    .replace(/a\.m\./g, 'am').replace(/p\.m\./g, 'pm')
    .replace(/(\d+)\.(\d+)/g, (_, a, b) => `${a} point ${b.split('').join(' ')}`)
    .replace(/(\d+)\s?(km\/h|kmh)/g, '$1 kilometres an hour')
    .replace(/(\d+)\s?mm\b/g, '$1 millimetres')
    .replace(/(\d+)\s?°c?/g, '$1 degrees')
    .replace(/[-/]/g, ' ')
    .replace(/[^\p{L}\p{N}' ]/gu, ' ');
  const out: string[] = [];
  for (const raw of t.split(/\s+/).filter(Boolean)) {
    const tok = raw.replace(/^'+|'+$/g, '');
    if (!tok) continue;
    for (const w of numberToken(tok).split(' ')) {
      if (w === 'and') continue;
      out.push(w === 'ok' ? 'okay' : w === 'millimeters' ? 'millimetres' : w === 'kilometers' ? 'kilometres' : w);
    }
  }
  return out;
}

export interface Tok { w: string; spk: string }

/** Levenshtein alignment. Returns error counts and aligned (ref,hyp) index pairs. */
export function align(ref: Tok[], hyp: Tok[]) {
  const n = ref.length, m = hyp.length;
  const d: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1].w === hyp[j - 1].w ? 0 : 1));
  }
  let i = n, j = m, sub = 0, del = 0, ins = 0;
  const pairs: [number, number][] = [];
  const errors: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1].w === hyp[j - 1].w ? 0 : 1)) {
      if (ref[i - 1].w !== hyp[j - 1].w) { sub++; errors.push(`${ref[i - 1].w}→${hyp[j - 1].w}`); } else pairs.push([i - 1, j - 1]);
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { del++; errors.push(`-${ref[i - 1].w}`); i--; }
    else { ins++; errors.push(`+${hyp[j - 1].w}`); j--; }
  }
  return { wer: n ? (sub + del + ins) / n : 0, sub, del, ins, refWords: n, pairs: pairs.reverse(), errors: errors.reverse() };
}

/** Best one-to-one mapping of hypothesis speaker ids onto reference speakers; returns accuracy over matched words. */
export function speakerAccuracy(ref: Tok[], hyp: Tok[], pairs: [number, number][]) {
  const conf: Record<string, Record<string, number>> = {};
  for (const [ri, hj] of pairs) {
    const h = hyp[hj].spk, r = ref[ri].spk;
    (conf[h] ??= {})[r] = (conf[h][r] ?? 0) + 1;
  }
  const hIds = Object.keys(conf), rIds = Array.from(new Set(ref.map(t => t.spk)));
  let best = 0;
  const perm = (left: string[], used: Set<string>, acc: number) => {
    if (!left.length) { best = Math.max(best, acc); return; }
    const [h, ...rest] = left;
    perm(rest, used, acc); // unmapped → wrong
    for (const r of rIds) if (!used.has(r)) { used.add(r); perm(rest, used, acc + (conf[h]?.[r] ?? 0)); used.delete(r); }
  };
  perm(hIds, new Set(), 0);
  return { accuracy: pairs.length ? best / pairs.length : 0, hypSpeakers: hIds.length, confusion: conf };
}
