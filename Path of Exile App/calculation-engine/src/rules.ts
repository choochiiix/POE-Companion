/** Snapshot rules, not a claim of current live-patch compatibility. Percent units throughout. */
export const rules = Object.freeze({ id: 'pob-reference-v1', maximumResistance: 75, resistanceCap: 90, minimumResistance: -200, physicalReductionCap: 90, enemyPhysicalReductionCap: 75 });
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export function hitChance(evasion: number, accuracy: number): number {
  if (accuracy === 0) return 5;
  return clamp(Math.round(125 * accuracy / (accuracy + (evasion / 5) ** 0.9)), 5, 100);
}
export function armourReduction(armour: number, hit: number): number {
  return hit === 0 && armour === 0 ? 0 : clamp(100 * armour / (armour + 5 * hit), 0, rules.physicalReductionCap);
}
