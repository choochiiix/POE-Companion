import { integer, positive } from './model.ts';
import { random } from './rng.ts';
import type { Rng } from './rng.ts';
/** Lazy probability tree: BOTH sampling and enumeration interpret this same tree. */
export type Plan<T> =
  | { readonly kind: 'done'; readonly value: T }
  | { readonly kind: 'choice'; readonly branches: readonly Branch<T>[] }
  | {
      readonly kind: 'integer';
      readonly min: number;
      readonly max: number;
      readonly next: (n: number) => Plan<T>;
    };
export interface Branch<T> {
  readonly weight: number;
  readonly next: () => Plan<T>;
}
export const done = <T>(value: T): Plan<T> => ({ kind: 'done', value });
export function choice<T>(branches: readonly Branch<T>[]): Plan<T> {
  if (!branches.length) throw new Error('Empty random choice');
  for (const b of branches) positive(b.weight, 'branch weight');
  positive(
    branches.reduce((s, b) => s + b.weight, 0),
    'total branch weight',
  );
  return { kind: 'choice', branches };
}
export function range<T>(min: number, max: number, next: (n: number) => Plan<T>): Plan<T> {
  integer(min, 'range min', Number.MIN_SAFE_INTEGER);
  integer(max, 'range max', min);
  integer(max - min + 1, 'range width', 1);
  return { kind: 'integer', min, max, next };
}
export function bind<A, B>(plan: Plan<A>, next: (value: A) => Plan<B>): Plan<B> {
  switch (plan.kind) {
    case 'done':
      return next(plan.value);
    case 'integer':
      return range(plan.min, plan.max, (n) => bind(plan.next(n), next));
    case 'choice':
      return choice(
        plan.branches.map((b) => ({
          weight: b.weight,
          next: () => bind(b.next(), next),
        })),
      );
  }
}
export function sample<T>(plan: Plan<T>, rng: Rng): T {
  let p = plan;
  while (p.kind !== 'done') {
    if (p.kind === 'integer') {
      p = p.next(p.min + Math.floor(random(rng) * (p.max - p.min + 1)));
      continue;
    }
    const total = p.branches.reduce((s, b) => s + b.weight, 0);
    let ticket = random(rng) * total;
    let selected = p.branches[p.branches.length - 1];
    for (const b of p.branches) {
      ticket -= b.weight;
      if (ticket < 0) {
        selected = b;
        break;
      }
    }
    if (!selected) throw new Error('Empty random choice');
    p = selected.next();
  }
  return p.value;
}
export class EnumerationLimit extends Error {}
/** Budget counts visited tree nodes, including value rolls and duplicate paths. */
export function enumerate<T>(
  plan: Plan<T>,
  maxNodes = 50_000,
): readonly { value: T; probability: number }[] {
  integer(maxNodes, 'maxNodes', 1);
  let visited = 0;
  const leaves: { value: T; probability: number }[] = [];
  const visit = (p: Plan<T>, probability: number): void => {
    if (++visited > maxNodes) throw new EnumerationLimit('Exact enumeration node budget exceeded');
    if (p.kind === 'done') {
      leaves.push({ value: p.value, probability });
      return;
    }
    if (p.kind === 'integer') {
      const width = p.max - p.min + 1;
      if (width > maxNodes - visited)
        throw new EnumerationLimit('Integer range exceeds remaining budget');
      for (let n = p.min; n <= p.max; n++) visit(p.next(n), probability / width);
    } else {
      const total = p.branches.reduce((s, b) => s + b.weight, 0);
      for (const b of p.branches) visit(b.next(), (probability * b.weight) / total);
    }
  };
  visit(plan, 1);
  return leaves;
}
