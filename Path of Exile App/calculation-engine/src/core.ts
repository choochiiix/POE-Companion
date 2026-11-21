import type { CalculationInput } from './model.ts';
import { validate } from './validate.ts';
import { prepareModifiers } from './modifiers.ts';
import { calculateDefence } from './defence.ts';
import { calculateOffence } from './offence.ts';
import { rules } from './rules.ts';
import { calculateIncomingHit, calculateSurvivability } from './advanced-defence.ts';

/** Pure synchronous entrypoint. No DOM, storage, source parsing, or network access. */
export function calculate(input: CalculationInput) {
  validate(input);
  const modifiers = prepareModifiers(input);
  const defence = calculateDefence(input, modifiers, input.defenceConfig);
  const incomingHit = input.incomingHit ? calculateIncomingHit(input.incomingHit, defence) : null;
  const survivability = input.incomingHit
    ? calculateSurvivability(input.incomingHit, defence, input.defenceConfig)
    : null;
  const diagnostics = input.sources.flatMap(source =>
    (source.unsupported ?? []).map(effect => ({ sourceId: source.id, effect })),
  );
  for (const effect of input.defenceConfig?.unsupportedPoolRouting ?? []) {
    diagnostics.push({ sourceId: 'configuration:defence', effect });
  }
  const result = {
    version: 1 as const, ruleset: rules.id,
    status: diagnostics.length ? 'partial' as const : 'supported-subset' as const,
    diagnostics,
    defence, offence: calculateOffence(input, modifiers),
    incomingHit, survivability,
    assumptions: ['Single repeating hit skill; unlimited resources and uninterrupted action time.',
      'Physical mitigation uses average hits, not integration over the damage range.',
      'Conversion above 100% requires adapter priority resolution. Enemy exposure and incoming hit block and suppression use explicit effective inputs.',
      'Ailments, damage over time, special keystones and advanced sustain are outside the modeled effects.'],
  };
  // Catch overflow even in intermediate defence or breakdown values.
  const check = (value: unknown): void => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError('Calculation overflow');
    if (value && typeof value === 'object') for (const child of Object.values(value)) check(child);
  };
  check(result);
  return result;
}

