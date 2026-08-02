import { estimate_hp_details_flat } from "../pkg/segindex_wasm";

export interface Params {
  sectors: number;
  n: number;
  strength: number; // 0..1
  K: number;
  m: number;
  seed: number;
}

export interface Details {
  hR: number;
  betas: number[];
  thresholds: number[];
  hp: number[];
}

export const SERIES = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5"];

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Log-normal samples per sector; `strength` pulls sector means apart. */
export function generate(p: Params): Float64Array[] {
  const rng = mulberry32(p.seed);
  const spread = p.strength * 1.1; // log-scale gap between adjacent sectors
  const sigma = 0.45;
  const out: Float64Array[] = [];
  for (let s = 0; s < p.sectors; s++) {
    const mu = 3.4 + (s - (p.sectors - 1) / 2) * spread;
    const vals = new Float64Array(p.n);
    for (let i = 0; i < p.n; i++) vals[i] = Math.exp(mu + sigma * gaussian(rng));
    out.push(vals);
  }
  return out;
}

/** Run the WASM estimator and unpack its flat result layout. */
export function compute(data: Float64Array[], K: number, m: number): Details {
  const lengths = new Uint32Array(data.map((d) => d.length));
  const flat = new Float64Array(data.reduce((a, d) => a + d.length, 0));
  let off = 0;
  for (const d of data) {
    flat.set(d, off);
    off += d.length;
  }
  const out = estimate_hp_details_flat(flat, lengths, K, m);
  const nb = m + 1;
  const nt = K - 1;
  return {
    hR: out[0],
    betas: Array.from(out.slice(1, 1 + nb)),
    thresholds: Array.from(out.slice(1 + nb, 1 + nb + nt)),
    hp: Array.from(out.slice(1 + nb + nt, 1 + nb + 2 * nt)),
  };
}

export const polyval = (betas: number[], p: number): number =>
  betas.reduce((acc, b, i) => acc + b * Math.pow(p, i), 0);

/** Gaussian KDE with Silverman's bandwidth. */
export function kde(values: Float64Array, grid: number[]): number[] {
  const n = values.length;
  let mean = 0;
  for (const v of values) mean += v;
  mean /= n;
  let variance = 0;
  for (const v of values) variance += (v - mean) ** 2;
  const sd = Math.sqrt(variance / n) || 1;
  const bw = 1.06 * sd * Math.pow(n, -0.2);
  const inv = 1 / (bw * Math.sqrt(2 * Math.PI));
  return grid.map((x) => {
    let s = 0;
    for (const v of values) {
      const z = (x - v) / bw;
      s += Math.exp(-0.5 * z * z);
    }
    return (s * inv) / n;
  });
}

export function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 5, 10].map((x) => x * mag).find((s) => span / s <= count) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(v);
  return ticks;
}

export const fmt = (v: number): string =>
  Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
