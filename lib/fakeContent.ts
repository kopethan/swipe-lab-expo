export type SeededRng = () => number;

// --- Deterministic RNG (string seed) ---

// xmur3: simple string hash -> 32-bit seed generator
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// mulberry32: tiny fast PRNG
function mulberry32(a: number): SeededRng {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seedKey: string): SeededRng {
  const seed = xmur3(seedKey)();
  return mulberry32(seed);
}

export function int(rng: SeededRng, min: number, max: number) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(rng() * (b - a + 1)) + a;
}

export function pick<T>(rng: SeededRng, arr: readonly T[]): T {
  return arr[int(rng, 0, Math.max(0, arr.length - 1))]!;
}

export function sampleUnique<T>(rng: SeededRng, arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const n = Math.min(Math.max(0, count), copy.length);
  for (let i = 0; i < n; i += 1) {
    const idx = int(rng, 0, copy.length - 1);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}

const ADJ = [
  'Calm',
  'Sharp',
  'Hidden',
  'Dense',
  'Clean',
  'Silent',
  'Fast',
  'Tight',
  'Loose',
  'Bright',
  'Dark',
  'Spare',
  'Heavy',
  'Light',
] as const;

const NOUN = [
  'Timeline',
  'Queue',
  'Signal',
  'Deck',
  'Thread',
  'Request',
  'Session',
  'Note',
  'Route',
  'Snapshot',
  'Checkpoint',
  'Pattern',
  'Stack',
  'Card',
] as const;

const VERB = ['stays', 'moves', 'waits', 'syncs', 'renders', 'holds', 'drifts', 'switches', 'remains'] as const;

const OBJ = [
  'in memory',
  'on swipe',
  'without reload',
  'with stable keys',
  'behind the stack',
  'under the shell',
  'across transitions',
  'with no flicker',
] as const;

const TAGS = [
  'deck',
  'render',
  'mount',
  'state',
  'cache',
  'handoff',
  'stack',
  'ghost',
  'keys',
  'peek',
  'wallet',
  'rails',
  'probe',
] as const;

export function makeTitle(seedKey: string) {
  const rng = createRng(seedKey);
  return `${pick(rng, ADJ)} ${pick(rng, NOUN)}`;
}

export function makeSubtitle(seedKey: string) {
  const rng = createRng(`${seedKey}:sub`);
  return `${pick(rng, NOUN)} ${pick(rng, VERB)} ${pick(rng, OBJ)}.`;
}

export function makeTags(seedKey: string, count = 3) {
  const rng = createRng(`${seedKey}:tags`);
  return sampleUnique(rng, TAGS, count).map((t) => `#${t}`);
}

export function makeParagraphs(seedKey: string, count = 2) {
  const rng = createRng(`${seedKey}:p`);
  const out: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const w = int(rng, 10, 18);
    const parts: string[] = [];

    for (let k = 0; k < w; k += 1) {
      // Mix adjective/noun/verb/object in a readable but varied way
      const pool = k % 5 === 0 ? ADJ : k % 5 === 1 ? NOUN : k % 5 === 2 ? VERB : OBJ;
      const word = pick(rng, pool);
      parts.push(String(word).toLowerCase());
    }

    const sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
    out.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
  }

  return out;
}

export type FakeMetric = { label: string; value: string };

export function makeMetrics(seedKey: string): FakeMetric[] {
  const rng = createRng(`${seedKey}:m`);
  const a = int(rng, 10, 99);
  const b = int(rng, 1, 20);
  const c = int(rng, 2, 90);
  const d = int(rng, 1, 12);

  return [
    { label: 'Score', value: String(a) },
    { label: 'Batch', value: String(b) },
    { label: 'Load', value: `${c}%` },
    { label: 'Lane', value: `R${d}` },
  ];
}

export type FakeRow = { label: string; value: string };

const ROW_LABELS = [
  'Mode',
  'Priority',
  'Retention',
  'Index',
  'Sync',
  'Policy',
  'Visibility',
  'Timeout',
  'Cache',
  'Version',
  'Region',
  'Channel',
] as const;

const ROW_VALUES = [
  'Auto',
  'Manual',
  'On',
  'Off',
  'Stable',
  'Experimental',
  'Local',
  'Remote',
  'Strict',
  'Relaxed',
] as const;

export function makeRows(seedKey: string, count = 7): FakeRow[] {
  const rng = createRng(`${seedKey}:rows`);
  const labels = sampleUnique(rng, ROW_LABELS, Math.min(count, ROW_LABELS.length));

  return labels.map((label) => {
    const v = pick(rng, ROW_VALUES);
    const suffix = rng() > 0.7 ? ` ${int(rng, 1, 99)}` : '';
    return { label: String(label), value: `${v}${suffix}` };
  });
}
