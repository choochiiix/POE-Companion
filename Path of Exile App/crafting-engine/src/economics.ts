import { integer } from './model.ts';
import type { Currency } from './engine.ts';
export type PriceSheet = Readonly<Partial<Record<Currency, number>>>;
export type Tally = Readonly<Partial<Record<Currency, number>>>;
export function priceOf(prices: PriceSheet, currency: Currency): number {
  const price = prices[currency];
  if (price === undefined || !Number.isFinite(price) || price < 0)
    throw new Error(`Enter a finite nonnegative price for ${currency}`);
  return price;
}
export function tallyCost(tally: Tally, prices: PriceSheet): number {
  let total = 0;
  for (const [currency, count] of Object.entries(tally)) {
    integer(count, 'currency count');
    if (count) total += count * priceOf(prices, currency as Currency);
  }
  return total;
}
export function attemptsForConfidence(p: number, confidence = 0.9): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error('Probability must be in [0, 1]');
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1)
    throw new Error('Confidence must be in (0, 1)');
  return p === 0 ? Infinity : p === 1 ? 1 : Math.ceil(Math.log1p(-confidence) / Math.log1p(-p));
}
/** Independent identical attempts, each starting from the SAME state. Reset cost is caller-supplied. */
export function expectedAttempts(p: number): number {
  attemptsForConfidence(p);
  return p === 0 ? Infinity : 1 / p;
}
export function attemptEconomics(
  p: number,
  perAttempt: Tally,
  prices: PriceSheet,
): {
  expectedAttempts: number;
  costPerAttempt: number;
  expectedCost: number;
  attempts90: number;
} {
  const costPerAttempt = tallyCost(perAttempt, prices),
    attempts = expectedAttempts(p);
  return {
    expectedAttempts: attempts,
    costPerAttempt,
    expectedCost: p === 0 ? Infinity : costPerAttempt * attempts,
    attempts90: attemptsForConfidence(p),
  };
}
