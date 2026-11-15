import type { CalculationInput } from './model.ts';
import { validate } from './validate.ts';
import { prepareModifiers } from './modifiers.ts';
import { calculateDefence } from './defence.ts';
import { calculateOffence } from './offence.ts';
import { rules } from './rules.ts';
import { calculateIncomingHit } from './advanced-defence.ts';

/** Pure synchronous entrypoint. No DOM, storage, source parsing, or network access. */
export function calculate(input: CalculationInput) {
  validate(input);
  const modifiers = prepareModifiers(input);
  const defence = calculateDefence(input, modifiers);
  const result = {
    version: 1 as const, ruleset: rules.id,
    status: input.sources.some(source => source.unsupported?.length) ? 'partial' as const : 'supported-subset' as const,
    diagnostics: input.sources.flatMap(source => (source.unsupported ?? []).map(effect => ({ sourceId: source.id, effect }))),
    defence, offence: calculateOffence(input, modifiers),
    incomingHit: input.incomingHit ? calculateIncomingHit(input.incomingHit, defence) : null,
    assumptions: ['Single repeating hit skill; unlimited resources and uninterrupted action time.',
      'Physical mitigation uses average hits, not integration over the damage range.',
      'Conversion above 100% requires adapter priority resolution. Incoming hit block/suppression probabilities are explicit effective inputs.',
      'No penetration, ailments, DoT, recovery, reservation or special keystones. Actor and trigger scenarios use the separate actor coordinator.'],
  };
  // Catch overflow even in intermediate defence or breakdown values.
  const check = (value: unknown): void => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError('Calculation overflow');
    if (value && typeof value === 'object') for (const child of Object.values(value)) check(child);
  };
  check(result);
  return result;
}

