import { integer } from './model.ts';
export interface Rng {
  next(): number;
  clone(): Rng;
}
/** Mulberry32: reproducible, non-cryptographic 32-bit PRNG. */
export class SeededRng implements Rng {
  private state: number;
  constructor(seed: number) {
    integer(seed, 'seed');
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  clone(): SeededRng {
    return new SeededRng(this.state);
  }
}
export function random(rng: Rng): number {
  const n = rng.next();
  if (!Number.isFinite(n) || n < 0 || n >= 1) throw new Error('RNG must return a number in [0, 1)');
  return n;
}
